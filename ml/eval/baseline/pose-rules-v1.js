/* ---------- pose rules + rep/hold counter (pure logic, no DOM) ----------
   Input: MediaPipe PoseLandmarker landmarks (33 points, normalized x/y in
   [0,1], `visibility` 0–1). Output: counted reps / held seconds plus a
   form status. Loaded up-front (tiny); the heavy MediaPipe model itself is
   only fetched by js/pose.js after the user explicitly turns the camera on.

   Rep state machine (reps rules):
     IDLE ──start pose held readyFrames──▶ READY
     READY ──leaves start zone──▶ DESCENDING
     DESCENDING ──peak zone confirmed──▶ BOTTOM      (back to start w/o peak → READY, "partial" if it got close)
     BOTTOM ──leaves peak zone──▶ ASCENDING
     ASCENDING ──peak again──▶ BOTTOM                 (bobbing at the bottom never adds reps)
     ASCENDING ──start zone confirmed──▶ COMPLETE → READY
   COMPLETE counts a rep only if the cycle took ≥ minRepMs and at most
   maxBadRatio of its frames had a form warning or low confidence.
   "Descending/bottom" are generic names: for a press "bottom" is the top.

   Robustness: EMA-smoothed metric, N-frame confirmation for every zone
   change (debounce), lostFrames of low confidence disarm back to IDLE
   (person left / occluded — the half-finished cycle is discarded), and a
   sudden torso jump/scale change is treated as a glitch frame.

   Honesty: landmarks can't see spinal rounding, bar path or grip, so those
   cues stay coaching text only — never claimed as detected. */
const PL = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28};

const POSE_DEFAULTS = {
  minMeanVisibility: 0.55, // mean visibility of the rule's key points
  minPointVisibility: 0.3, // every key point must be at least this visible
  readyFrames: 3,          // start pose held this many frames before counting is armed
  confirmFrames: 2,        // consecutive frames needed to confirm a zone change
  lostFrames: 8,           // consecutive low-confidence frames that disarm to IDLE
  maxBadRatio: 0.35,       // max share of warning/low-confidence frames in a counted rep
  minRepMs: 350,           // faster "cycles" are jitter, not reps
  maxJump: 0.25,           // torso-centre jump per frame (image-height units) = glitch
  smoothing: 0.6,          // EMA weight of the newest numeric metric sample
  frameMargin: 0.05,       // key points this far outside the image count as not visible (person leaving the frame)
};

function poseAngle(a, b, c){ // angle ABC in degrees
  const v1x=a.x-b.x, v1y=a.y-b.y, v2x=c.x-b.x, v2y=c.y-b.y;
  const d = Math.hypot(v1x,v1y)*Math.hypot(v2x,v2y);
  if(!d) return 180;
  return Math.acos(Math.max(-1, Math.min(1, (v1x*v2x+v1y*v2y)/d))) * 180/Math.PI;
}
// lean of the hip→shoulder segment away from vertical, degrees (0 = upright)
function poseLean(sh, hip){ return Math.atan2(Math.abs(sh.x-hip.x), Math.abs(sh.y-hip.y)) * 180/Math.PI; }
// tilt of a segment away from horizontal, degrees (0 = horizontal)
function poseTilt(a, b){ return Math.atan2(Math.abs(a.y-b.y), Math.abs(a.x-b.x)) * 180/Math.PI; }
// signed vertical offset of `mid` from the a–b line (+ = below the line on screen)
function poseLineDev(a, mid, b){
  if(Math.abs(b.x-a.x) < 1e-6) return 0;
  const yAt = a.y + (b.y-a.y)*((mid.x-a.x)/(b.x-a.x));
  return mid.y - yAt;
}

/* {l:{sh,el,...}, r:{...}, side:{best-visible side}} in an aspect-corrected
   space (x scaled by width/height) so angles are real */
function posePoints(lm, aspect, margin){
  const m = margin==null ? Infinity : margin;
  const p = i => {
    const q = lm[i];
    if(!q || !isFinite(q.x) || !isFinite(q.y)) return {x:0,y:0,v:0};
    // the detector extrapolates joints that left the image, sometimes still with high visibility
    const outside = q.x < -m || q.x > 1+m || q.y < -m || q.y > 1+m;
    return {x:q.x*aspect, y:q.y, v: outside ? 0 : (q.visibility==null?1:q.visibility)};
  };
  const l = {sh:p(PL.lSh), el:p(PL.lEl), wr:p(PL.lWr), hip:p(PL.lHip), kn:p(PL.lKn), an:p(PL.lAn)};
  const r = {sh:p(PL.rSh), el:p(PL.rEl), wr:p(PL.rWr), hip:p(PL.rHip), kn:p(PL.rKn), an:p(PL.rAn)};
  const vis = s => Object.values(s).reduce((a,q)=>a+q.v,0);
  return {l, r, side: vis(l)>=vis(r) ? l : r, nose:p(PL.nose)};
}
function poseConf(P, keys, both, cfg){
  const pts = both ? keys.flatMap(k=>[P.l[k],P.r[k]]) : keys.map(k=>P.side[k]);
  const mean = pts.reduce((a,q)=>a+q.v,0)/pts.length;
  return mean >= cfg.minMeanVisibility && Math.min(...pts.map(q=>q.v)) >= cfg.minPointVisibility;
}
function poseTorso(P){
  const s = P.side;
  return {cx:(s.sh.x+s.hip.x)/2, cy:(s.sh.y+s.hip.y)/2, len:Math.hypot(s.sh.x-s.hip.x, s.sh.y-s.hip.y)};
}

/* rule shape:
   kind 'reps': metric(P,opts) → value; start(v)/peak(v)/partial(v) tests;
                warn(P,v,opts) → i18n key | null
   kind 'time': hold(P,opts) → {ok, warn}                                 */
const POSE_RULES = {
  pushup:{kind:'reps', keys:['sh','el','wr','hip','an'],
    metric:P=>poseAngle(P.side.sh, P.side.el, P.side.wr),
    start:v=>v>150, peak:v=>v<95, partial:v=>v<135, partialWarn:'pose_go_lower',
    warn:P=>{
      const s=P.side;
      if(poseTilt(s.sh, s.an) > 45) return 'pose_get_in_position';
      if(poseAngle(s.sh, s.hip, s.an) < 155) return poseLineDev(s.sh, s.hip, s.an) > 0 ? 'pose_hips_sag' : 'pose_hips_up';
      return null;
    }},
  pike:{kind:'reps', keys:['sh','el','wr','hip','an'],
    metric:P=>poseAngle(P.side.sh, P.side.el, P.side.wr),
    start:v=>v>150, peak:v=>v<100, partial:v=>v<135, partialWarn:'pose_go_lower',
    warn:P=>poseAngle(P.side.sh, P.side.hip, P.side.an) > 125 ? 'pose_pike_hips' : null},
  squat:{kind:'reps', keys:['sh','hip','kn','an'],
    metric:P=>poseAngle(P.side.hip, P.side.kn, P.side.an),
    start:v=>v>160, peak:v=>v<100, partial:v=>v<140, partialWarn:'pose_squat_lower',
    warn:(P,v)=>{
      if(poseLean(P.side.sh, P.side.hip) > 50) return 'pose_chest_up';
      // knee valgus is only measurable facing the camera (both sides visible, wide shoulders)
      const {l,r}=P, front = Math.min(l.kn.v,r.kn.v,l.an.v,r.an.v)>0.5 &&
        Math.abs(l.sh.x-r.sh.x) > 0.5*Math.abs(l.sh.y-l.hip.y);
      if(front && v<150 && Math.abs(l.kn.x-r.kn.x) < 0.75*Math.abs(l.an.x-r.an.x)) return 'pose_knees_out';
      return null;
    }},
  lunge:{kind:'reps', keys:['sh','hip','kn','an'], both:true,
    metric:P=>Math.min(poseAngle(P.l.hip,P.l.kn,P.l.an), poseAngle(P.r.hip,P.r.kn,P.r.an)),
    start:v=>v>155, peak:v=>v<110, partial:v=>v<140, partialWarn:'pose_lunge_lower',
    warn:P=>poseLean(P.side.sh, P.side.hip) > 30 ? 'pose_torso_upright' : null},
  bridge:{kind:'reps', keys:['sh','hip','kn'],
    metric:P=>poseAngle(P.side.sh, P.side.hip, P.side.kn),
    start:v=>v<150, peak:v=>v>167, partial:v=>v>156, partialWarn:'pose_hips_higher',
    warn:()=>null},
  hinge:{kind:'reps', keys:['sh','hip','kn','an'],
    metric:P=>poseAngle(P.side.sh, P.side.hip, P.side.kn),
    start:v=>v>160, peak:v=>v<120, partial:v=>v<145, partialWarn:'pose_hinge_lower',
    warn:(P,v,o)=> (o.exId==='rdl' && v<150 && poseAngle(P.side.hip,P.side.kn,P.side.an) < 125) ? 'pose_soft_knees' : null},
  press:{kind:'reps', keys:['sh','el','wr','hip'],
    metric:P=>({elbow:poseAngle(P.side.sh,P.side.el,P.side.wr), above:P.side.wr.y < P.side.sh.y-0.08}),
    start:v=>v.elbow<110 && !v.above, peak:v=>v.elbow>155 && v.above, partial:v=>v.above, partialWarn:'pose_press_full',
    warn:P=>poseLean(P.side.sh, P.side.hip) > 15 ? 'pose_no_arch' : null},
  raise:{kind:'reps', keys:['sh','el','wr','hip'],
    metric:P=>poseAngle(P.side.hip, P.side.sh, P.side.wr),
    start:v=>v<30, peak:v=>v>75, partial:v=>v>50, partialWarn:'pose_raise_higher',
    warn:P=>poseLean(P.side.sh, P.side.hip) > 15 ? 'pose_no_swing' : null},
  curl:{kind:'reps', keys:['sh','el','wr','hip'],
    metric:P=>poseAngle(P.side.sh, P.side.el, P.side.wr),
    start:v=>v>145, peak:v=>v<65, partial:v=>v<100, partialWarn:'pose_curl_full',
    warn:P=>poseAngle(P.side.hip, P.side.sh, P.side.el) > 35 ? 'pose_elbows_fixed' : null},
  jack:{kind:'reps', keys:['sh','wr','an'], both:true,
    metric:P=>{
      const shW=Math.abs(P.l.sh.x-P.r.sh.x)||1e-3, anW=Math.abs(P.l.an.x-P.r.an.x);
      const up=P.l.wr.y<P.l.sh.y && P.r.wr.y<P.r.sh.y, down=P.l.wr.y>P.l.sh.y && P.r.wr.y>P.r.sh.y;
      return {up, down, wide:anW>shW*1.3, narrow:anW<shW*1.1};
    },
    start:v=>v.down && v.narrow, peak:v=>v.up && v.wide, partial:v=>v.up || v.wide, partialWarn:'pose_full_jack',
    warn:()=>null},
  plank:{kind:'time', keys:['sh','el','hip','an'],
    hold:P=>{
      const s=P.side;
      if(poseTilt(s.sh, s.an) > 40) return {ok:false, warn:'pose_get_in_position'};
      if(poseAngle(s.sh, s.hip, s.an) < 160) return {ok:false, warn: poseLineDev(s.sh, s.hip, s.an) > 0 ? 'pose_hips_sag' : 'pose_hips_up'};
      return {ok:true, warn:null};
    }},
  wallsit:{kind:'time', keys:['hip','kn','an'],
    hold:P=>{
      const k=poseAngle(P.side.hip, P.side.kn, P.side.an);
      if(k>115) return {ok:false, warn:'pose_sit_lower'};
      if(k<65) return {ok:false, warn:'pose_get_in_position'};
      return {ok:true, warn:null};
    }},
};

/* stateful counter for one session. update() once per video frame. */
function createPoseCounter(ruleId, opts){
  opts = opts || {};
  const rule = POSE_RULES[ruleId];
  if(!rule) return null;
  const cfg = Object.assign({}, POSE_DEFAULTS, opts.config || {});
  const st = {
    phase:'idle', reps:0, heldMs:0, lastTs:null,
    startStreak:0, peakStreak:0, okStreak:0, lowStreak:0,
    cycleStartTs:0, cycleFrames:0, cycleBad:0, cycleLow:0, partialHit:false,
    ema:null, prevTorso:null,
    confFrames:0, goodFrames:0, rejected:0, partials:0, jitter:0, lost:0,
    lastWarn:null, shownWarn:null, warnStreak:0,
  };
  const inCycle = () => st.phase==='descending' || st.phase==='bottom' || st.phase==='ascending';
  const resetCycle = () => { st.cycleFrames=0; st.cycleBad=0; st.cycleLow=0; st.partialHit=false; st.peakStreak=0; };

  function lowFrame(){
    st.lowStreak++;
    st.startStreak = 0; st.peakStreak = 0; st.okStreak = 0;
    if(inCycle()) st.cycleLow++;
    let event = null;
    if(st.lowStreak >= cfg.lostFrames && st.phase!=='idle'){
      if(inCycle() || rule.kind==='time') { event = 'lost'; st.lost++; }
      st.phase = 'idle'; st.ema = null; resetCycle();
    }
    return event;
  }

  return {
    rule, state: st, config: cfg,
    get formScore(){ return st.confFrames ? Math.round(st.goodFrames/st.confFrames*100) : null; },
    update(lm, ts, aspect){
      const dt = st.lastTs==null ? 0 : Math.min(250, Math.max(0, ts-st.lastTs));
      st.lastTs = ts;
      if(!lm || !lm.length) return this._out('lowconf', null, lowFrame());
      const P = posePoints(lm, aspect || 1, cfg.frameMargin);
      if(!poseConf(P, rule.keys, rule.both, cfg)) return this._out('lowconf', null, lowFrame());
      // glitch guard: sudden torso jump or scale change (camera knocked, detector swap)
      const tor = poseTorso(P), prev = st.prevTorso;
      st.prevTorso = tor;
      if(prev && (Math.hypot(tor.cx-prev.cx, tor.cy-prev.cy) > cfg.maxJump || (prev.len && (tor.len/prev.len > 1.55 || tor.len/prev.len < 0.65)))){
        return this._out('lowconf', null, lowFrame());
      }
      st.lowStreak = 0;
      st.confFrames++;

      if(rule.kind==='time'){
        const h = rule.hold(P, opts);
        if(h.ok){
          st.okStreak++;
          if(st.okStreak >= cfg.confirmFrames){ st.phase='holding'; st.heldMs += dt; }
          st.goodFrames++;
        } else {
          st.okStreak = 0;
          if(st.phase==='holding') st.phase='broken';
        }
        return this._out(h.ok ? 'good' : 'warn', this._warn(h.warn), null);
      }

      let v = rule.metric(P, opts);
      if(typeof v==='number'){ st.ema = st.ema==null ? v : cfg.smoothing*v + (1-cfg.smoothing)*st.ema; v = st.ema; }
      const w = rule.warn(P, v, opts);
      if(!w) st.goodFrames++;
      const isStart = rule.start(v), isPeak = rule.peak(v);
      st.startStreak = isStart ? st.startStreak+1 : 0;
      st.peakStreak = isPeak ? st.peakStreak+1 : 0;
      let event = null;

      switch(st.phase){
        case 'idle':
          if(st.startStreak >= cfg.readyFrames) st.phase = 'ready';
          break;
        case 'ready':
          if(!isStart){ st.phase='descending'; resetCycle(); st.cycleStartTs = ts; st.peakStreak = isPeak?1:0; }
          break;
        case 'descending':
          if(rule.partial(v)) st.partialHit = true;
          if(st.peakStreak >= cfg.confirmFrames) st.phase = 'bottom';
          else if(st.startStreak >= cfg.confirmFrames){
            if(st.partialHit){ event='partial'; st.partials++; }
            st.phase = 'ready'; resetCycle();
          }
          break;
        case 'bottom':
          if(!isPeak) st.phase = 'ascending';
          break;
        case 'ascending':
          if(st.peakStreak >= cfg.confirmFrames) st.phase = 'bottom';
          else if(st.startStreak >= cfg.confirmFrames){
            const bad = (st.cycleBad + st.cycleLow) / Math.max(1, st.cycleFrames + st.cycleLow);
            if(ts - st.cycleStartTs < cfg.minRepMs){ event='jitter'; st.jitter++; }
            else if(bad <= cfg.maxBadRatio){ st.reps++; event='rep'; }
            else { st.rejected++; event='rejected'; }
            st.phase = 'ready'; resetCycle();
          }
          break;
      }
      if(inCycle()){ st.cycleFrames++; if(w) st.cycleBad++; }

      let warnKey = w || (event==='partial' ? rule.partialWarn : null);
      if(!warnKey && st.phase==='idle' && !isStart) warnKey = 'pose_get_in_position';
      return this._out(warnKey ? 'warn' : 'good', this._warn(warnKey, event==='partial'), event);
    },
    // a warning must persist confirmFrames before it's shown (no flicker); partial events show at once
    _warn(key, immediate){
      if(key) st.lastWarn = key;
      if(key && (immediate || key===st.shownWarn)){ st.warnStreak = cfg.confirmFrames; st.shownWarn = key; return key; }
      if(key){ st.warnStreak = (st.pendingWarn===key ? st.warnStreak+1 : 1); st.pendingWarn = key;
        if(st.warnStreak >= cfg.confirmFrames){ st.shownWarn = key; return key; } return st.shownWarn; }
      st.shownWarn = null; st.pendingWarn = null; st.warnStreak = 0; return null;
    },
    _out(status, warnKey, event){
      return {status: (status==='warn' && !warnKey) ? 'good' : status, warnKey, event, phase: st.phase,
        reps: st.reps, heldSec: Math.floor(st.heldMs/1000), formScore: this.formScore};
    },
  };
}

if(typeof module!=='undefined') module.exports = {POSE_RULES, POSE_DEFAULTS, createPoseCounter, poseAngle, PL};
