/* ---------- AI V2: browser model loading + inference ----------
   Lazy by construction. Loading this file performs no network request and
   creates no runtime: the first fetch happens inside mlLoadModel(), which
   js/ai/ai-v2.js only calls after the user has turned the camera on.

   Two runtimes are supported because the export pipeline picks between them by
   measurement (ml/export/export_model.py): a TensorFlow.js graph model when
   the converted graph reproduces PyTorch's outputs within tolerance, ONNX
   Runtime Web otherwise. metadata.runtime says which one a model needs, and
   only that one is fetched.

   Everything here fails soft: any problem (no manifest, bad metadata, CDN
   blocked, WebGL/WASM missing, inference throwing) leaves AI V2 unavailable
   and the shipping rule engine untouched. */

const ML_MODEL_BASE = 'models/';                 // same-origin, relative to the app
const ML_MODEL_INDEX = ML_MODEL_BASE + 'index.json';
const ML_RUNTIME_CDN = {
  tfjs: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm',
  onnx: 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/+esm',
};
const ML_LOAD_TIMEOUT_MS = 20000;
const ML_INFER_TIMEOUT_MS = 4000;
const ML_MAX_INFER_ERRORS = 3;

let _mlIndexP = null;      // single-flight manifest fetch
let _mlRuntimeP = {};      // runtime module per kind
const _mlSessions = {};    // exId -> Promise<session|null>, including cached failures

function mlWithTimeout(promise, ms, label){
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>reject(new Error(label+' timed out')), ms);
    promise.then(v=>{ clearTimeout(timer); resolve(v); }, e=>{ clearTimeout(timer); reject(e); });
  });
}

/* models/index.json maps an exercise id to its published directory:
   {"squat": "squat-v1"}. No file → no models → AI V2 simply stays off. */
function mlModelIndex(){
  if(!_mlIndexP){
    _mlIndexP = mlWithTimeout(fetch(ML_MODEL_INDEX, {cache:'no-cache'}), ML_LOAD_TIMEOUT_MS, 'model index')
      .then(r => r.ok ? r.json() : null)
      .then(j => (j && typeof j==='object' && !Array.isArray(j)) ? j : null)
      .catch(()=> null);
  }
  return _mlIndexP;
}

/* a model whose features this build cannot produce must never be loaded */
function mlValidMetadata(meta){
  if(!meta || typeof meta!=='object') return false;
  if(meta.featureVersion !== ML_FEATURE_VERSION) return false;
  if(meta.featureSize !== ML_FEATURE_SIZE) return false;
  if(!(meta.sequenceLength >= 8 && meta.sequenceLength <= 240)) return false;
  if(meta.runtime !== 'tfjs' && meta.runtime !== 'onnx') return false;
  if(!Array.isArray(meta.outputs) || !meta.outputs.length) return false;
  if(!meta.classes || typeof meta.classes!=='object') return false;
  return meta.outputs.every(h => Array.isArray(meta.classes[h]) && meta.classes[h].length);
}

function mlRuntime(kind){
  if(!_mlRuntimeP[kind]){
    _mlRuntimeP[kind] = mlWithTimeout(import(ML_RUNTIME_CDN[kind]), ML_LOAD_TIMEOUT_MS, kind+' runtime')
      .then(m => m && (m.default || m))
      .catch(err => { _mlRuntimeP[kind] = null; throw err; }); // allow one retry in a later session
  }
  return _mlRuntimeP[kind];
}

function mlSoftmax(values){
  let max = -Infinity;
  for(const v of values) if(v > max) max = v;
  let sum = 0;
  const out = new Array(values.length);
  for(let i=0;i<values.length;i++){ out[i] = Math.exp(values[i]-max); sum += out[i]; }
  for(let i=0;i<out.length;i++) out[i] /= (sum || 1);
  return out;
}

/* raw head logits -> {head: {label, confidence, index}}; throws on a malformed
   or non-finite output rather than letting nonsense reach the rep engine */
function mlReadOutputs(meta, raw){
  const out = {};
  for(const head of meta.outputs){
    const values = raw[head];
    const classes = meta.classes[head];
    if(!values || values.length !== classes.length) throw new Error('bad output shape for '+head);
    for(const v of values) if(!isFinite(v)) throw new Error('non-finite output for '+head);
    const probs = mlSoftmax(values);
    let best = 0;
    for(let i=1;i<probs.length;i++) if(probs[i] > probs[best]) best = i;
    out[head] = {label: classes[best], confidence: probs[best], index: best};
  }
  return out;
}

async function mlCreateSession(exId){
  const index = await mlModelIndex();
  const dir = index && index[exId];
  if(!dir || typeof dir!=='string' || /[^A-Za-z0-9._-]/.test(dir)) return null;
  const base = ML_MODEL_BASE + dir + '/';

  const meta = await mlWithTimeout(fetch(base+'metadata.json', {cache:'no-cache'}), ML_LOAD_TIMEOUT_MS, 'metadata')
    .then(r => r.ok ? r.json() : null);
  if(!mlValidMetadata(meta)) return null;

  const lib = await mlRuntime(meta.runtime);
  let run;
  if(meta.runtime === 'tfjs'){
    const model = await mlWithTimeout(lib.loadGraphModel(base+'model.json'), ML_LOAD_TIMEOUT_MS, 'tfjs model');
    run = async (flat, shape)=>{
      const input = lib.tensor(flat, shape, 'float32');
      try{
        const res = model.execute(input);
        const list = Array.isArray(res) ? res : [res];
        const raw = {};
        for(let i=0;i<meta.outputs.length;i++) raw[meta.outputs[i]] = Array.from(await list[i].data());
        list.forEach(tensor => tensor.dispose());
        return raw;
      } finally { input.dispose(); }
    };
  } else {
    const session = await mlWithTimeout(lib.InferenceSession.create(base+'model.onnx', {executionProviders:['wasm']}),
      ML_LOAD_TIMEOUT_MS, 'onnx model');
    run = async (flat, shape)=>{
      const feeds = {}; feeds[session.inputNames[0]] = new lib.Tensor('float32', flat, shape);
      const res = await session.run(feeds);
      const raw = {};
      for(const head of meta.outputs){
        const tensor = res[head] || res[session.outputNames[meta.outputs.indexOf(head)]];
        raw[head] = tensor ? Array.from(tensor.data) : null;
      }
      return raw;
    };
  }

  let errors = 0, dead = false;
  return {
    meta,
    get sequenceLength(){ return meta.sequenceLength; },
    get dead(){ return dead; },
    async infer(flat, shape){
      if(dead) return null;
      try{
        const raw = await mlWithTimeout(run(flat, shape), ML_INFER_TIMEOUT_MS, 'inference');
        const parsed = mlReadOutputs(meta, raw);
        errors = 0;
        return parsed;
      }catch(e){
        if(++errors >= ML_MAX_INFER_ERRORS) dead = true; // stop trying; caller falls back
        return null;
      }
    },
  };
}

/* one attempt per exercise per page load; a failure is cached as null so a
   blocked CDN can't cause a request storm mid-workout */
function mlLoadModel(exId){
  if(!(exId in _mlSessions)){
    _mlSessions[exId] = mlCreateSession(exId).catch(()=> null);
  }
  return _mlSessions[exId];
}

function mlResetRuntimeCache(){ _mlIndexP = null; _mlRuntimeP = {}; for(const k in _mlSessions) delete _mlSessions[k]; }

if(typeof module!=='undefined') module.exports = {
  ML_MODEL_BASE, ML_MODEL_INDEX, ML_RUNTIME_CDN, mlValidMetadata, mlSoftmax, mlReadOutputs,
  mlLoadModel, mlResetRuntimeCache, mlWithTimeout,
};
