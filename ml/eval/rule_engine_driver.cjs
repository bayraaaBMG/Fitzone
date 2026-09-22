/* Runs the SHIPPING rule engine (js/pose-rules.js) — and, when predictions are
   supplied, the SHIPPING AI V2 controller (js/ai/ai-v2.js) — over recorded
   landmark sequences, so ml/eval/rep_compare.py can compare rep counts against
   what a human annotated.

   Nothing is reimplemented here: the same code the browser runs decides the
   counts, and the AI path goes through the real veto/coach rules with a stub
   session replaying predictions computed offline by the trained model.

   stdin: {"exercise":"squat","aspect":1.78,"frames":[{"lm":[{x,y,z,visibility}...]|null,"ts":0}],
           "predictions":[null|{phase:{label,confidence},...}], "engine":"current"|"baseline"}
   engine "baseline" loads ml/eval/baseline/pose-rules-v1.js (the engine before
   the counting fixes) so before/after can be measured on identical input.
   stdout: {"rules":{"reps":N,"frames":[...],"events":{...}},
            "ai":{"reps":N,"frames":[...],"vetoes":N}|null} */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../../js');
const F = require(path.join(ROOT, 'ai/ml-features.js'));
const payloadRaw = fs.readFileSync(0, 'utf8');
const POSE = require(JSON.parse(payloadRaw).engine === 'baseline'
  ? path.resolve(__dirname, 'baseline/pose-rules-v1.js')
  : path.join(ROOT, 'pose-rules.js'));

// browser globals the AI layer expects (it is a classic script, not a module)
global.ML_FEATURE_SIZE = F.ML_FEATURE_SIZE;
global.ML_FEATURE_VERSION = F.ML_FEATURE_VERSION;
global.createMlFeatureExtractor = F.createMlFeatureExtractor;
global.createMlSequenceBuffer = F.createMlSequenceBuffer;
const AI = require(path.join(ROOT, 'ai/ai-v2.js'));

const coachCtx = {};
vm.createContext(coachCtx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'coach-data.js'), 'utf8'), coachCtx);
const COACH = vm.runInContext('COACH', coachCtx);

const payload = JSON.parse(payloadRaw);
const coach = COACH[payload.exercise];
if(!coach || !coach.pose){ console.error(`no camera rule for ${payload.exercise}`); process.exit(2); }

/* visibility of the joints this rule needs (best side per pair), for the trace */
const RULE = POSE.POSE_RULES[coach.pose] || {};
const PAIRS = {sh:[11,12], el:[13,14], wr:[15,16], hip:[23,24], kn:[25,26], an:[27,28]};
const NEEDED = (RULE.required || RULE.keys || []).map(k => PAIRS[k]).filter(Boolean);
function neededVisibility(lm){
  if(!lm || !NEEDED.length) return null;
  const v = NEEDED.map(([a,b]) => Math.max((lm[a]||{}).visibility||0, (lm[b]||{}).visibility||0));
  return +(v.reduce((x,y)=>x+y,0)/v.length).toFixed(2);
}

function countWith(useAi, withTrace){
  const counter = POSE.createPoseCounter(coach.pose, {exId: payload.exercise, config:{debug:true}});
  const repFrames = [];
  const events = {};
  const reasons = {};   // why frames did not count (STEP 14)
  const trace = [];     // state transitions, for evidence-based tuning
  let vetoes = 0, index = 0, lastKey = '';

  let controller = null;
  if(useAi){
    // stub session: replays the offline predictions through the real controller
    const session = {
      meta:{sequenceLength: payload.sequenceLength || 45},
      sequenceLength: payload.sequenceLength || 45,
      dead:false,
      infer(){ return Promise.resolve(payload.predictions[Math.min(index, payload.predictions.length-1)] || null); },
    };
    controller = AI.createAiV2Controller(payload.exercise, {force:true, load:()=>Promise.resolve(session)});
  }

  const step = i => {
    const frame = payload.frames[i];
    index = i;
    let out = counter.update(frame.lm, frame.ts, payload.aspect || 1);
    if(controller){
      controller.observe(frame.lm, frame.ts, payload.aspect || 1);
      out = controller.review(out, frame.ts, counter);
    }
    if(out.event) events[out.event] = (events[out.event] || 0) + 1;
    const why = out.debug ? out.debug.reason : out.reason;
    if(why) reasons[why] = (reasons[why] || 0) + 1;
    if(out.aiVeto) vetoes++;
    if(out.event === 'rep') repFrames.push(i);
    if(withTrace && trace.length < 600){
      const d = out.debug || {};
      const key = `${d.phase}|${d.reason}|${out.event||''}`;
      if(key !== lastKey || out.event){
        trace.push({f:i, t:+(frame.ts/1000).toFixed(2), phase:d.phase, reason:d.reason, event:out.event||null,
          metric:d.metric, raw:d.raw, range:d.range, dir:d.dirSign, dirRun:d.dirRun,
          depthOk:d.depthOk, calibrated:d.calibrated, vis:neededVisibility(frame.lm), warn:out.warnKey||null});
        lastKey = key;
      }
    }
  };

  if(!controller){
    for(let i=0;i<payload.frames.length;i++) step(i);
    return {reps: counter.state.reps, frames: repFrames, events, reasons, vetoes,
            formScore: counter.formScore, trace: withTrace ? trace : undefined};
  }
  // the controller's inference is async; drain the microtask queue between frames
  // so a prediction lands before the next frame, exactly as it would in a browser
  return controller.start().then(async ()=>{
    for(let i=0;i<payload.frames.length;i++){
      step(i);
      await new Promise(resolve=>setImmediate(resolve));
    }
    return {reps: counter.state.reps, frames: repFrames, events, reasons, vetoes, formScore: counter.formScore};
  });
}

(async()=>{
  const rules = countWith(false, !!payload.trace);
  const ai = payload.predictions && payload.predictions.length ? await countWith(true, false) : null;
  console.log(JSON.stringify({rules, ai, rule:{id: coach.pose, view: RULE.view || null,
    required: RULE.required || RULE.keys || []}}));
})().catch(e=>{ console.error(e && e.message); process.exit(2); });
