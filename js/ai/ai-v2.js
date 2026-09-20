/* ---------- AI V2: optional form-coach layer ----------
   OFF by default (AI_V2_DEFAULT_ENABLED = false) and, even when switched on,
   inert until a trained model is published under models/. The shipping path
   — MediaPipe → js/pose-rules.js → rep state machine — is untouched and stays
   the fallback for every exercise, every failure and every unsupported device.

   What this layer may do:
     • coach: name a likely form mistake, debounced, only above a confidence
       floor, and only while the model's view of the movement is fresh
     • veto: reject a repetition the rule engine just counted
   What it may never do: increment anything. A model that is missing, stale,
   slow, wrong-shaped or throwing can therefore never inflate someone's reps —
   the worst case is that coaching goes quiet.

   Inference is asynchronous and throttled; the video loop never waits for it.
   Decisions use the most recent prediction and ignore it once it is stale. */

const AI_V2_DEFAULT_ENABLED = false;
const AI_V2_PILOTS = ['squat', 'pushup', 'lunge']; // the only exercises with a planned model
const AI_V2 = {
  inferEveryFrames: 4,        // ~3 Hz against the ~12.5 fps pose loop
  minCoachConfidence: 0.75,
  minVetoConfidence: 0.85,
  vetoStreak: 2,              // consecutive predictions agreeing before a veto
  coachStreak: 2,
  maxPredictionAgeMs: 800,    // older than this and the rep is already over
  coachCooldownMs: 5000,      // no per-frame nagging
};

/* mistake class → an i18n key. These reuse the coaching lines the rule engine
   already ships, so AI V2 speaks the same language in MN and EN. */
const AI_V2_COACH_KEYS = {
  squat:  {shallow:'pose_squat_lower', knee_inward:'pose_knees_out', forward_lean:'pose_chest_up', incomplete_rep:'ws_ai_incomplete'},
  pushup: {shallow:'pose_go_lower', hips_down:'pose_hips_sag', hips_up:'pose_hips_up', incomplete_rep:'ws_ai_incomplete'},
  lunge:  {knee_inward:'pose_knees_out', short_range:'pose_lunge_lower', unstable:'pose_torso_upright'},
};

/* opt-in: ?aiv2=1 (sticky on this device), ?aiv2=0 to clear */
function aiV2Enabled(){
  try{
    if(typeof location!=='undefined' && /[?&]aiv2=1(&|$)/.test(location.search)) localStorage.setItem('mf_aiv2','1');
    if(typeof location!=='undefined' && /[?&]aiv2=0(&|$)/.test(location.search)) localStorage.removeItem('mf_aiv2');
    if(localStorage.getItem('mf_aiv2')==='1') return true;
  }catch(e){}
  return AI_V2_DEFAULT_ENABLED;
}
function aiV2Supported(exId){
  return aiV2Enabled() && AI_V2_PILOTS.indexOf(exId) >= 0 && typeof fetch==='function';
}

/* status: 'off' (disabled / not a pilot) · 'loading' · 'ready' · 'unavailable'
   (no model published, load failed, or the session died → rule engine only) */
function createAiV2Controller(exId, opts){
  opts = opts || {};
  const load = opts.load || (typeof mlLoadModel==='function' ? mlLoadModel : null);
  const cfg = Object.assign({}, AI_V2, opts.config || {});
  const coachKeys = AI_V2_COACH_KEYS[exId] || {};
  let status = 'off';
  let session = null, buffer = null, extractor = null;
  let frames = 0, inflight = false, last = null;          // last = {at, pred}
  let coachLabel = null, coachRun = 0, lastCoachAt = -Infinity;
  let vetoLabel = null, vetoRun = 0;
  const stats = {predictions:0, vetoes:0, coached:0, errors:0};

  function release(){ buffer = null; extractor = null; last = null; }

  return {
    exId,
    get status(){ return status; },
    get stats(){ return Object.assign({status}, stats); },
    get prediction(){ return last && last.pred; },
    get model(){ return session && session.meta; },

    /* Never awaited by the camera loop: counting starts immediately and AI V2
       joins in if and when a model turns up. */
    async start(){
      if(!(opts.force || aiV2Supported(exId)) || !load){ status = 'off'; return false; }
      status = 'loading';
      try{ session = await load(exId); }
      catch(e){ session = null; }
      if(!session){ status = 'unavailable'; release(); return false; }
      extractor = createMlFeatureExtractor();
      buffer = createMlSequenceBuffer(session.sequenceLength);
      status = 'ready';
      return true;
    },

    /* one video frame in; returns immediately */
    observe(lm, ts, aspect){
      if(status!=='ready' || !buffer) return;
      if(session.dead){ status = 'unavailable'; release(); return; }
      const {vec, valid} = extractor.push(lm, aspect, ts);
      buffer.push(vec, valid);
      if(!valid){ last = null; coachRun = 0; vetoRun = 0; return; } // lost the person: forget the context
      frames++;
      if(inflight || !buffer.ready || (frames % cfg.inferEveryFrames)!==0) return;
      const window = buffer.window();
      if(!window) return;
      inflight = true;
      session.infer(window, [1, buffer.length, ML_FEATURE_SIZE]).then(pred=>{
        inflight = false;
        if(status!=='ready') return;
        if(!pred){ stats.errors++; if(session.dead){ status = 'unavailable'; release(); } return; }
        stats.predictions++;
        last = {at: ts, pred};
        const mistake = pred.mistake;
        if(mistake && mistake.label!=='none' && mistake.confidence>=cfg.minCoachConfidence){
          coachRun = (coachLabel===mistake.label) ? coachRun+1 : 1; coachLabel = mistake.label;
        } else { coachRun = 0; coachLabel = null; }
        const rep = pred.rep_valid, form = pred.form;
        const bad = rep && rep.label==='no' && rep.confidence>=cfg.minVetoConfidence && (!form || form.label==='incorrect');
        vetoRun = bad ? vetoRun+1 : 0;
        if(bad) vetoLabel = mistake ? mistake.label : null;
      }, ()=>{ inflight = false; stats.errors++; });
    },

    /* post-processes one rule-engine frame result. `counter` is the pose-rules
       counter, passed so a vetoed rep can be taken back off it — this is the
       only state AI V2 ever writes, and it can only ever subtract. */
    review(out, ts, counter){
      if(status!=='ready' || !out) return out;
      const fresh = last && (ts - last.at) <= cfg.maxPredictionAgeMs;
      if(!fresh) return out;

      if(out.event==='rep' && vetoRun >= cfg.vetoStreak && counter && counter.state && counter.state.reps > 0){
        counter.state.reps--; counter.state.rejected = (counter.state.rejected||0) + 1;
        out.reps = counter.state.reps;
        out.event = 'rejected';
        out.status = 'warn';
        out.warnKey = coachKeys[vetoLabel] || out.warnKey || 'ws_ai_incomplete';
        out.aiVeto = true;
        stats.vetoes++;
        vetoRun = 0; coachRun = 0; lastCoachAt = ts;
        return out;
      }
      if(out.event==='rep'){ vetoRun = 0; return out; } // a counted rep clears the doubt

      if(coachRun >= cfg.coachStreak && (ts - lastCoachAt) >= cfg.coachCooldownMs){
        const key = coachKeys[coachLabel];
        if(key){
          out.warnKey = key; out.status = 'warn'; out.aiCoach = true;
          lastCoachAt = ts; coachRun = 0; stats.coached++;
        }
      }
      return out;
    },

    reset(){ // new set on the same session
      if(extractor) extractor.reset();
      if(buffer) buffer.reset();
      last = null; frames = 0; coachRun = 0; vetoRun = 0; lastCoachAt = -Infinity;
    },
    stop(){ if(status==='ready' || status==='loading') status = 'off'; release(); },
  };
}

if(typeof module!=='undefined') module.exports = {
  AI_V2, AI_V2_PILOTS, AI_V2_COACH_KEYS, AI_V2_DEFAULT_ENABLED, aiV2Enabled, aiV2Supported, createAiV2Controller,
};
