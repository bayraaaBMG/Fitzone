/* ---------- pose rules + rep/hold counter (pure logic, no DOM) ----------
   Input: MediaPipe PoseLandmarker landmarks (33 points, normalized x/y in
   [0,1], `visibility` 0–1). Output: counted reps / held seconds plus a
   form status. Loaded up-front (tiny); the heavy MediaPipe model itself is
   only fetched by js/pose.js after the user explicitly turns the camera on.

   Honesty rules baked in here:
   - a rep only counts after a full range-of-motion cycle (start → peak →
     start) during which most confident frames had no form warning
   - partial reps and bad-form reps are reported, never counted
   - low landmark confidence freezes counting and reports 'lowconf'
   - landmarks can't see spinal rounding, bar path or grip, so those cues
     stay coaching text only — never claimed as detected */
const PL = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28};

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

/* builds {l:{sh,el,...}, r:{...}, side:{...best-visible side}} in an
   aspect-corrected space (x scaled by width/height) so angles are real */
function posePoints(lm, aspect){
  const p = i => lm[i] ? {x:lm[i].x*aspect, y:lm[i].y, v:(lm[i].visibility==null?1:lm[i].visibility)} : {x:0,y:0,v:0};
  const l = {sh:p(PL.lSh), el:p(PL.lEl), wr:p(PL.lWr), hip:p(PL.lHip), kn:p(PL.lKn), an:p(PL.lAn)};
  const r = {sh:p(PL.rSh), el:p(PL.rEl), wr:p(PL.rWr), hip:p(PL.rHip), kn:p(PL.rKn), an:p(PL.rAn)};
  const vis = s => Object.values(s).reduce((a,q)=>a+q.v,0);
  return {l, r, side: vis(l)>=vis(r) ? l : r, nose:p(PL.nose)};
}
function poseConf(P, keys, both){
  const pts = both ? keys.flatMap(k=>[P.l[k],P.r[k]]) : keys.map(k=>P.side[k]);
  const mean = pts.reduce((a,q)=>a+q.v,0)/pts.length;
  return mean >= 0.55 && Math.min(...pts.map(q=>q.v)) >= 0.3;
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
  const st = {phase:'start', reps:0, heldMs:0, cycleFrames:0, cycleBad:0, cycleLow:0, leftStart:false, reachedPeak:false,
    partialHit:false, lastTs:null, confFrames:0, goodFrames:0, rejected:0, partials:0, lastWarn:null};
  return {
    rule, state: st,
    get formScore(){ return st.confFrames ? Math.round(st.goodFrames/st.confFrames*100) : null; },
    update(lm, ts, aspect){
      const dt = st.lastTs==null ? 0 : Math.min(250, Math.max(0, ts-st.lastTs));
      st.lastTs = ts;
      if(!lm || !lm.length) return this._out('lowconf', null, null);
      const P = posePoints(lm, aspect || 1);
      if(!poseConf(P, rule.keys, rule.both)){
        if(st.phase!=='start') st.cycleLow++;
        return this._out('lowconf', null, null);
      }
      st.confFrames++;
      if(rule.kind==='time'){
        const h = rule.hold(P, opts);
        if(h.ok){ st.heldMs += dt; st.goodFrames++; }
        st.lastWarn = h.warn;
        return this._out(h.ok ? 'good' : 'warn', h.warn, null);
      }
      const v = rule.metric(P, opts);
      const w = rule.warn(P, v, opts);
      if(!w) st.goodFrames++;
      let event = null;
      if(st.phase==='start'){
        if(rule.peak(v)){ st.phase='peak'; st.reachedPeak=true; }
        else if(!rule.start(v)){
          st.leftStart = true;
          if(rule.partial(v)) st.partialHit = true;
        } else if(st.leftStart){
          // came back to start without ever reaching the peak
          if(st.partialHit){ event='partial'; st.partials++; }
          this._resetCycle();
        }
        if(st.leftStart || st.phase==='peak'){ st.cycleFrames++; if(w) st.cycleBad++; }
      } else { // peak reached, waiting to return to start
        st.cycleFrames++; if(w) st.cycleBad++;
        if(rule.start(v)){
          const bad = st.cycleFrames ? (st.cycleBad+st.cycleLow)/(st.cycleFrames+st.cycleLow) : 0;
          if(bad <= 0.35){ st.reps++; event='rep'; }
          else { st.rejected++; event='rejected'; }
          st.phase='start'; this._resetCycle();
        }
      }
      if(w) st.lastWarn = w;
      const warnKey = w || (event==='partial' ? rule.partialWarn : null);
      return this._out(warnKey ? 'warn' : 'good', warnKey, event);
    },
    _resetCycle(){ st.cycleFrames=0; st.cycleBad=0; st.cycleLow=0; st.leftStart=false; st.reachedPeak=false; st.partialHit=false; },
    _out(status, warnKey, event){
      return {status, warnKey, event, reps:st.reps, heldSec:Math.floor(st.heldMs/1000), formScore:this.formScore};
    },
  };
}

if(typeof module!=='undefined') module.exports = {POSE_RULES, createPoseCounter, poseAngle, PL};
