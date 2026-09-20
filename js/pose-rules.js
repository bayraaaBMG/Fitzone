/* ---------- pose rules + rep/hold counter (pure logic, no DOM) ----------
   Input: MediaPipe PoseLandmarker landmarks (33 points, normalized x/y in
   [0,1], `visibility` 0–1). Output: counted reps / held seconds plus a form
   status and, for debugging, the reason a movement was not counted. Loaded
   up-front (tiny); the heavy MediaPipe model itself is only fetched by
   js/pose.js after the user explicitly turns the camera on.

   Rep state machine (reps rules) — a single frame can never produce a rep:

     IDLE ──start pose stable for readyFrames──▶ READY  (calibrates here)
     READY ──leaves the start zone (startExit) + dirFrames of movement──▶ DESCENDING
     DESCENDING ──peak zone (peakEnter) held dwellFrames + depth gate──▶ BOTTOM
     DESCENDING ──back inside the start zone──▶ READY        ("partial" if it got close)
     BOTTOM ──leaves the peak zone (peakExit) + dirFrames reversing──▶ ASCENDING
     ASCENDING ──peak zone again──▶ BOTTOM                   (bobbing adds nothing)
     ASCENDING ──start zone + range/time/form checks──▶ COMPLETE ──▶ COOLDOWN
     COOLDOWN ──start pose held cooldownFrames──▶ READY       (no instant second rep)

   Every zone has separate enter/exit thresholds (hysteresis), so a metric
   hovering on a boundary cannot flip states. A counted rep additionally needs:
   the full range of motion actually travelled (minRange), at least minRepMs,
   a mostly-clean form ratio, and for the pilot exercises a depth gate measured
   against the user's own calibrated start posture.

   Robustness: landmark coordinates are EMA-smoothed before any angle is taken,
   the measured side is locked for the duration of a rep, frames whose required
   joints are missing/out-of-frame are INVALID (the state machine simply does
   not advance), and a sudden torso jump/scale change is treated as a glitch.

   Honesty: landmarks cannot see spinal rounding, bar path or grip, so those
   cues stay coaching text only — never claimed as detected. Where the geometry
   cannot decide (wrong camera angle), the engine says so instead of guessing. */
const PL = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28};

const POSE_DEFAULTS = {
  minMeanVisibility: 0.55, // mean visibility of the rule's key points
  minPointVisibility: 0.3, // every key point must be at least this visible
  readyFrames: 3,          // start pose held this many frames before counting is armed
  confirmFrames: 2,        // consecutive frames needed to confirm a zone change
  dirFrames: 2,            // consecutive frames of movement in one direction (STEP 9)
  dwellFrames: 2,          // frames at the bottom needed to accept it (STEP 10)
  dwellWindow: 5,          // ...counted within this many recent frames, because people wobble at depth
  cooldownFrames: 2,       // frames back in the start pose before the next rep is armed
  lostFrames: 8,           // consecutive invalid frames that disarm to IDLE
  maxBadRatio: 0.35,       // max share of FORM-warning frames in a counted rep
  maxLostRatio: 0.5,       // a rep whose cycle was mostly unseen is not judged at all
  minRepMs: 300,           // a whole zone excursion faster than this is jitter, not a rep
                           // (range, depth, dwell and direction do the rest of the work now)
  maxRepMs: 15000,         // a "rep" slower than this is someone resting mid-movement
  maxJump: 0.25,           // torso-centre jump per frame (image-height units) = glitch
  smoothing: 0.6,          // EMA weight for the DIRECTION signal (heavier = steadier)
  zoneSmoothing: 0.85,     // ...and for zone membership (lighter, or real depth gets averaged away)
  pointSmoothing: 0.55,    // EMA weight of the newest landmark position (STEP 4)
  dirEps: 0.6,             // metric change (deg/frame) that counts as real movement
  frameMargin: 0.05,       // key points this far outside the image count as not visible
  edgeMargin: 0.02,        // required joints this close to the edge → "fit your body in frame"
  viewSideMax: 0.62,       // shoulder-width ÷ torso above this = facing the camera
  viewFrontMin: 0.42,      // ...and below this = side on (between the two is a 45° view)
  calibrate: true,         // learn the user's own start posture while READY (STEP 12)
};

/* reasons a frame did not advance the rep state — debug only, never shown raw */
const POSE_REASONS = {
  ok:'ok', noPose:'no_pose', lowVis:'low_visibility', outOfFrame:'body_out_of_frame',
  glitch:'glitch', view:'camera_view_unsuitable', notStart:'not_in_start_position',
  noDir:'no_clear_direction', shallow:'range_too_small', tooFast:'too_fast',
  tooSlow:'too_slow', badForm:'form_warnings', cooldown:'cooldown', counting:'counting',
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

/* {l:{sh,el,...}, r:{...}, side:{locked or best-visible side}} in an
   aspect-corrected space (x scaled by width/height) so angles are real */
function posePoints(lm, aspect, margin){
  const m = margin==null ? Infinity : margin;
  const p = i => {
    const q = lm[i];
    if(!q || !isFinite(q.x) || !isFinite(q.y)) return {x:0,y:0,v:0,raw:0};
    // the detector extrapolates joints that left the image, sometimes still with high visibility
    const outside = q.x < -m || q.x > 1+m || q.y < -m || q.y > 1+m;
    return {x:q.x*aspect, y:q.y, v: outside ? 0 : (q.visibility==null?1:q.visibility),
            nx:q.x, ny:q.y, outside};
  };
  const l = {sh:p(PL.lSh), el:p(PL.lEl), wr:p(PL.lWr), hip:p(PL.lHip), kn:p(PL.lKn), an:p(PL.lAn)};
  const r = {sh:p(PL.rSh), el:p(PL.rEl), wr:p(PL.rWr), hip:p(PL.rHip), kn:p(PL.rKn), an:p(PL.rAn)};
  const vis = s => Object.values(s).reduce((a,q)=>a+q.v,0);
  return {l, r, side: vis(l)>=vis(r) ? l : r, sideName: vis(l)>=vis(r) ? 'l' : 'r', nose:p(PL.nose)};
}
function poseConf(P, keys, both, cfg){
  const pts = both ? keys.flatMap(k=>[P.l[k],P.r[k]]) : keys.map(k=>P.side[k]);
  const mean = pts.reduce((a,q)=>a+q.v,0)/pts.length;
  return mean >= cfg.minMeanVisibility && Math.min(...pts.map(q=>q.v)) >= cfg.minPointVisibility;
}
/* STEP 5/6: the joints this exercise needs must be inside the frame, not merely
   "visible" — MediaPipe happily estimates a knee that left the picture */
function poseInFrame(P, keys, both, cfg){
  const pts = both ? keys.flatMap(k=>[P.l[k],P.r[k]]) : keys.map(k=>P.side[k]);
  return pts.every(q => !q.outside && q.nx > cfg.edgeMargin && q.nx < 1-cfg.edgeMargin
                        && q.ny > cfg.edgeMargin && q.ny < 1-cfg.edgeMargin);
}
function poseTorso(P){
  const s = P.side;
  return {cx:(s.sh.x+s.hip.x)/2, cy:(s.sh.y+s.hip.y)/2, len:Math.hypot(s.sh.x-s.hip.x, s.sh.y-s.hip.y)};
}
/* shoulder width ÷ torso length: small = filmed from the side, large = head on */
function poseViewRatio(P){
  const torso = poseTorso(P).len;
  if(!torso) return 0;
  return Math.abs(P.l.sh.x - P.r.sh.x) / torso;
}
function poseViewOk(P, want, cfg){
  if(!want || want==='any') return true;
  const both = Math.min(P.l.sh.v, P.r.sh.v) > 0.5;
  if(!both) return want==='side';        // only one shoulder visible = side on
  const ratio = poseViewRatio(P);
  return want==='side' ? ratio <= cfg.viewSideMax : ratio >= cfg.viewFrontMin;
}

/* rule shape:
   kind 'reps'
     metric(P, opts)  → number (numeric rules) or object (custom rules)
     th {start, startExit, peak, peakExit, partial, minRange}  numeric rules
     dir 'down' | 'up'        which way the metric moves during the descent
     zones {start(v), peak(v), partial(v)}                     custom rules
     depth(P, calib, opts) → true when the movement really reached depth
     gate(P, opts) → reason | null   hard stop (wrong body orientation)
     warn(P, v, opts) → i18n key | null
     required [...], view 'side'|'front'|'any'
   kind 'time'
     hold(P, opts) → {ok, warn}                                              */
const POSE_RULES = {
  // ---------- pilot exercises (STEP 8) ----------
  squat:{kind:'reps', dir:'down', keys:['sh','hip','kn','an'], required:['hip','kn','an'], view:'side',
    metric:P=>poseAngle(P.side.hip, P.side.kn, P.side.an),
    th:{start:160, startExit:150, peak:100, peakExit:112, partial:140, minRange:55},
    partialWarn:'pose_squat_lower',
    // knee angle alone also fits a "sit back" that never really drops. The hip
    // must close on the ankle by a real fraction of the stance the user was
    // calibrated in — a ratio of two body distances, so camera distance,
    // framing and body size cancel out.
    depth:(P, calib)=>{
      if(!calib || !calib.hipAnkle) return true;
      return Math.abs(P.side.an.y - P.side.hip.y) <= 0.85 * calib.hipAnkle;
    },
    warn:(P,v)=>{
      if(poseLean(P.side.sh, P.side.hip) > 50) return 'pose_chest_up';
      const {l,r}=P, front = Math.min(l.kn.v,r.kn.v,l.an.v,r.an.v)>0.5 &&
        Math.abs(l.sh.x-r.sh.x) > 0.5*Math.abs(l.sh.y-l.hip.y);
      if(front && v<150 && Math.abs(l.kn.x-r.kn.x) < 0.75*Math.abs(l.an.x-r.an.x)) return 'pose_knees_out';
      return null;
    }},
  pushup:{kind:'reps', dir:'down', keys:['sh','el','wr','hip','an'], required:['sh','el','wr','hip'], view:'side',
    metric:P=>poseAngle(P.side.sh, P.side.el, P.side.wr),
    th:{start:150, startExit:140, peak:95, peakExit:107, partial:135, minRange:45},
    partialWarn:'pose_go_lower',
    // the body must be horizontal: an upright person bending their arms is not
    // doing push-ups, and no threshold on the elbow can tell the difference
    gate:P=> poseTilt(P.side.sh, P.side.an) > 45 ? 'pose_get_in_position' : null,
    // the chest must actually close on the hands, not just the elbows fold
    depth:(P, calib)=>{
      if(!calib || !calib.shWrist) return true;
      return Math.abs(P.side.wr.y - P.side.sh.y) <= 0.80 * calib.shWrist;
    },
    warn:P=>{
      const s=P.side;
      if(poseAngle(s.sh, s.hip, s.an) < 155) return poseLineDev(s.sh, s.hip, s.an) > 0 ? 'pose_hips_sag' : 'pose_hips_up';
      return null;
    }},
  lunge:{kind:'reps', dir:'down', keys:['sh','hip','kn','an'], required:['hip','kn','an'], both:true, view:'any',
    metric:P=>Math.min(poseAngle(P.l.hip,P.l.kn,P.l.an), poseAngle(P.r.hip,P.r.kn,P.r.an)),
    th:{start:155, startExit:145, peak:110, peakExit:122, partial:140, minRange:40},
    partialWarn:'pose_lunge_lower',
    // a walking step bends a knee without lowering the body: require the front
    // leg (the more bent one) to actually close the hip-to-ankle gap
    depth:(P, calib)=>{
      if(!calib || !calib.hipAnkle) return true;
      const front = poseAngle(P.l.hip,P.l.kn,P.l.an) <= poseAngle(P.r.hip,P.r.kn,P.r.an) ? P.l : P.r;
      return Math.abs(front.an.y - front.hip.y) <= 0.88 * calib.hipAnkle;
    },
    warn:P=>poseLean(P.side.sh, P.side.hip) > 30 ? 'pose_torso_upright' : null},

  // ---------- remaining automatic exercises ----------
  pike:{kind:'reps', dir:'down', keys:['sh','el','wr','hip','an'], required:['sh','el','wr','hip'], view:'side',
    metric:P=>poseAngle(P.side.sh, P.side.el, P.side.wr),
    th:{start:150, startExit:140, peak:100, peakExit:112, partial:135, minRange:40},
    partialWarn:'pose_go_lower',
    warn:P=>poseAngle(P.side.sh, P.side.hip, P.side.an) > 125 ? 'pose_pike_hips' : null},
  bridge:{kind:'reps', dir:'up', keys:['sh','hip','kn'], required:['sh','hip','kn'], view:'side',
    metric:P=>poseAngle(P.side.sh, P.side.hip, P.side.kn),
    th:{start:150, startExit:156, peak:167, peakExit:161, partial:156, minRange:12},
    partialWarn:'pose_hips_higher',
    warn:()=>null},
  hinge:{kind:'reps', dir:'down', keys:['sh','hip','kn','an'], required:['sh','hip','kn'], view:'side',
    metric:P=>poseAngle(P.side.sh, P.side.hip, P.side.kn),
    th:{start:160, startExit:150, peak:120, peakExit:132, partial:145, minRange:35},
    partialWarn:'pose_hinge_lower',
    warn:(P,v,o)=> (o.exId==='rdl' && v<150 && poseAngle(P.side.hip,P.side.kn,P.side.an) < 125) ? 'pose_soft_knees' : null},
  curl:{kind:'reps', dir:'down', keys:['sh','el','wr','hip'], required:['sh','el','wr'], view:'any',
    metric:P=>poseAngle(P.side.sh, P.side.el, P.side.wr),
    th:{start:145, startExit:135, peak:65, peakExit:78, partial:100, minRange:60},
    partialWarn:'pose_curl_full',
    warn:P=>poseAngle(P.side.hip, P.side.sh, P.side.el) > 35 ? 'pose_elbows_fixed' : null},
  raise:{kind:'reps', dir:'up', keys:['sh','el','wr','hip'], required:['sh','el','wr'], view:'any',
    metric:P=>poseAngle(P.side.hip, P.side.sh, P.side.wr),
    th:{start:30, startExit:40, peak:75, peakExit:64, partial:50, minRange:40},
    partialWarn:'pose_raise_higher',
    warn:P=>poseLean(P.side.sh, P.side.hip) > 15 ? 'pose_no_swing' : null},
  // custom-zone rules: the metric is a small state object rather than one angle,
  // so hysteresis lives in the booleans themselves
  press:{kind:'reps', keys:['sh','el','wr','hip'], required:['sh','el','wr'], view:'any',
    metric:P=>({elbow:poseAngle(P.side.sh,P.side.el,P.side.wr), above:P.side.wr.y < P.side.sh.y-0.08}),
    zones:{start:v=>v.elbow<110 && !v.above, peak:v=>v.elbow>155 && v.above, partial:v=>v.above},
    partialWarn:'pose_press_full',
    warn:P=>poseLean(P.side.sh, P.side.hip) > 15 ? 'pose_no_arch' : null},
  jack:{kind:'reps', keys:['sh','wr','an'], required:['sh','an'], both:true, view:'front',
    metric:P=>{
      const shW=Math.abs(P.l.sh.x-P.r.sh.x)||1e-3, anW=Math.abs(P.l.an.x-P.r.an.x);
      const up=P.l.wr.y<P.l.sh.y && P.r.wr.y<P.r.sh.y, down=P.l.wr.y>P.l.sh.y && P.r.wr.y>P.r.sh.y;
      return {up, down, wide:anW>shW*1.3, narrow:anW<shW*1.1};
    },
    zones:{start:v=>v.down && v.narrow, peak:v=>v.up && v.wide, partial:v=>v.up || v.wide},
    partialWarn:'pose_full_jack',
    warn:()=>null},

  // ---------- holds ----------
  plank:{kind:'time', keys:['sh','el','hip','an'], required:['sh','hip','an'], view:'side',
    hold:P=>{
      const s=P.side;
      if(poseTilt(s.sh, s.an) > 40) return {ok:false, warn:'pose_get_in_position'};
      if(poseAngle(s.sh, s.hip, s.an) < 160) return {ok:false, warn: poseLineDev(s.sh, s.hip, s.an) > 0 ? 'pose_hips_sag' : 'pose_hips_up'};
      return {ok:true, warn:null};
    }},
  wallsit:{kind:'time', keys:['hip','kn','an'], required:['hip','kn','an'], view:'side',
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
  const numeric = !!rule.th;
  const down = rule.dir !== 'up';
  const st = {
    phase:'idle', reps:0, heldMs:0, lastTs:null,
    startStreak:0, peakStreak:0, okStreak:0, lowStreak:0, dirRun:0, dirSign:0, coolStreak:0, peakWindow:[],
    cycleStartTs:0, leftStartTs:null, cycleFrames:0, cycleBad:0, cycleLow:0, partialHit:false,
    cycleStartV:null, cyclePeakV:null, depthOk:false, readyV:null,
    ema:null, emaFast:null, raw:null, prevV:null, prevTorso:null, points:null, lockedSide:null,
    confFrames:0, goodFrames:0, rejected:0, partials:0, jitter:0, lost:0,
    lastWarn:null, shownWarn:null, warnStreak:0, reason:POSE_REASONS.noPose,
    calib:null, calibSamples:[],
  };
  const inCycle = () => st.phase==='descending' || st.phase==='bottom' || st.phase==='ascending';
  const resetCycle = () => {
    st.cycleFrames=0; st.cycleBad=0; st.cycleLow=0; st.partialHit=false; st.peakStreak=0; st.peakWindow=[];
    st.cycleStartV=null; st.cyclePeakV=null; st.depthOk=false; st.readyV=null;
  };

  /* hysteresis: entering a zone is stricter than staying in it (STEP 3) */
  const inStart = (v, already) => {
    if(!numeric) return rule.zones.start(v);
    const t = already ? rule.th.startExit : rule.th.start;
    let ok = down ? v >= t : v <= t;
    // calibration only ever makes "left the start pose" stricter for this user
    if(!already && st.calib && st.calib.startV!=null){
      const margin = 0.25 * Math.abs(rule.th.start - rule.th.startExit);
      ok = ok || (down ? v >= st.calib.startV - margin : v <= st.calib.startV + margin);
    }
    return ok;
  };
  const inPeak = (v, already) => {
    if(!numeric) return rule.zones.peak(v);
    const t = already ? rule.th.peakExit : rule.th.peak;
    return down ? v <= t : v >= t;
  };
  const isPartial = v => numeric ? (down ? v <= rule.th.partial : v >= rule.th.partial) : rule.zones.partial(v);
  /* Well inside the start zone, not merely across the line. Someone doing fast
     continuous reps passes through the top in a single frame, and after a full
     descent + depth + ascent there is nothing left to protect against by
     demanding a second frame up there. */
  const firmStart = v => {
    if(!numeric || typeof v!=='number') return false;
    const margin = 0.4 * Math.abs(rule.th.start - rule.th.startExit);
    return down ? v >= rule.th.start + margin : v <= rule.th.start - margin;
  };
  const movedFar = () => {
    if(!numeric || st.cycleStartV==null || st.cyclePeakV==null) return true;
    return Math.abs(st.cycleStartV - st.cyclePeakV) >= rule.th.minRange;
  };

  function lowFrame(reason){
    st.lowStreak++;
    st.startStreak = 0; st.peakStreak = 0; st.okStreak = 0; st.dirRun = 0;
    st.reason = reason;
    if(inCycle()) st.cycleLow++;
    let event = null;
    if(st.lowStreak >= cfg.lostFrames && st.phase!=='idle'){
      if(inCycle() || rule.kind==='time'){ event = 'lost'; st.lost++; }
      st.phase = 'idle'; st.ema = null; st.emaFast = null; st.points = null; st.leftStartTs = null; st.lockedSide = null; st.readyV = null; st.calibSamples = []; resetCycle();
    }
    return event;
  }

  /* EMA on the landmark coordinates themselves, so every angle taken from them
     is already smooth (STEP 4). Raw points stay available for debugging. */
  function smoothPoints(P){
    const a = cfg.pointSmoothing;
    if(!st.points){ st.points = {l:{}, r:{}}; }
    for(const sideName of ['l','r']){
      for(const k of Object.keys(P[sideName])){
        const cur = P[sideName][k], prev = st.points[sideName][k];
        st.points[sideName][k] = (!prev || !cur.v) ? {...cur}
          : {...cur, x: a*cur.x + (1-a)*prev.x, y: a*cur.y + (1-a)*prev.y};
      }
    }
    const vis = s => Object.values(s).reduce((acc,q)=>acc+q.v,0);
    const pick = st.lockedSide || (vis(st.points.l) >= vis(st.points.r) ? 'l' : 'r');
    return {l:st.points.l, r:st.points.r, side:st.points[pick], sideName:pick, nose:P.nose};
  }

  /* STEP 12: learn this user's own start posture while they hold it in READY.
     Only ever from a stable pose, never from movement. */
  function calibrate(P, v, rawV){
    if(!cfg.calibrate) return;
    const torso = poseTorso(P);
    st.calibSamples.push({v: typeof v==='number' ? v : null, rawV: typeof rawV==='number' ? rawV : null,
      hipY:P.side.hip.y, shY:P.side.sh.y,
      // vertical body gaps: the depth gates compare these, so they must be
      // captured in the same units the movement is later measured in
      hipAnkle: Math.abs(P.side.an.y - P.side.hip.y),
      shWrist: Math.abs(P.side.wr.y - P.side.sh.y),
      thigh: Math.hypot(P.side.hip.x-P.side.kn.x, P.side.hip.y-P.side.kn.y),
      upperArm: Math.hypot(P.side.sh.x-P.side.el.x, P.side.sh.y-P.side.el.y), torso: torso.len});
    if(st.calibSamples.length > cfg.readyFrames) st.calibSamples.shift();
    if(st.calibSamples.length < cfg.readyFrames) return;
    const mean = key => st.calibSamples.reduce((a,s)=>a+(s[key]||0),0)/st.calibSamples.length;
    const values = st.calibSamples.map(s=>s.v).filter(x=>x!=null);
    // Stillness is judged on the RAW metric: the smoothed one lags, which makes
    // a body still moving through the start zone look stationary.
    const raws = st.calibSamples.map(s=>s.rawV).filter(x=>x!=null);
    if(raws.length===st.calibSamples.length && Math.max(...raws)-Math.min(...raws) > 4) return;
    st.calib = {startV: values.length ? mean('v') : null, hipY: mean('hipY'), shY: mean('shY'),
      hipAnkle: mean('hipAnkle'), shWrist: mean('shWrist'),
      thigh: mean('thigh'), upperArm: mean('upperArm'), torso: mean('torso'), at: st.lastTs};
  }

  return {
    rule, state: st, config: cfg,
    get formScore(){ return st.confFrames ? Math.round(st.goodFrames/st.confFrames*100) : null; },
    get calibration(){ return st.calib; },
    update(lm, ts, aspect){
      const dt = st.lastTs==null ? 0 : Math.min(250, Math.max(0, ts-st.lastTs));
      st.lastTs = ts;
      if(!lm || !lm.length) return this._out('lowconf', null, lowFrame(POSE_REASONS.noPose));
      const rawP = posePoints(lm, aspect || 1, cfg.frameMargin);
      if(!poseConf(rawP, rule.keys, rule.both, cfg)) return this._out('lowconf', null, lowFrame(POSE_REASONS.lowVis));
      // STEP 6: the joints this exercise needs must be inside the picture
      if(!poseInFrame(rawP, rule.required || rule.keys, rule.both, cfg)){
        const event = lowFrame(POSE_REASONS.outOfFrame);
        return this._out('lowconf', this._warn('pose_body_in_frame'), event);
      }
      // glitch guard: sudden torso jump or scale change (camera knocked, detector swap)
      const tor = poseTorso(rawP), prev = st.prevTorso;
      st.prevTorso = tor;
      if(prev && (Math.hypot(tor.cx-prev.cx, tor.cy-prev.cy) > cfg.maxJump || (prev.len && (tor.len/prev.len > 1.55 || tor.len/prev.len < 0.65)))){
        return this._out('lowconf', null, lowFrame(POSE_REASONS.glitch));
      }
      const P = smoothPoints(rawP);
      // STEP 7: some geometry simply cannot be judged from the wrong angle
      if(!poseViewOk(P, rule.view, cfg)){
        st.startStreak = 0; st.peakStreak = 0; st.dirRun = 0;
        st.reason = POSE_REASONS.view;
        st.lowStreak = 0;
        return this._out('warn', this._warn(rule.view==='front' ? 'pose_face_camera' : 'pose_side_view'), null);
      }
      st.lowStreak = 0;
      st.confFrames++;

      if(rule.kind==='time'){
        const h = rule.hold(P, opts);
        if(h.ok){
          st.okStreak++;
          if(st.okStreak >= cfg.confirmFrames){ st.phase='holding'; st.heldMs += dt; }
          st.goodFrames++;
          st.reason = POSE_REASONS.counting;
        } else {
          st.okStreak = 0;
          if(st.phase==='holding') st.phase='broken';
          st.reason = POSE_REASONS.badForm;
        }
        return this._out(h.ok ? 'good' : 'warn', this._warn(h.warn), null);
      }

      const gate = rule.gate ? rule.gate(P, opts) : null;
      let v = rule.metric(P, opts);
      st.raw = v;
      if(typeof v==='number'){
        // two smoothings of the same angle: a steady one for "which way is the
        // body moving", a responsive one for "has it actually reached depth"
        st.ema = st.ema==null ? v : cfg.smoothing*v + (1-cfg.smoothing)*st.ema;
        st.emaFast = st.emaFast==null ? v : cfg.zoneSmoothing*v + (1-cfg.zoneSmoothing)*st.emaFast;
        v = st.ema;
      }
      if(gate){
        st.startStreak = 0; st.peakStreak = 0; st.dirRun = 0;
        st.reason = POSE_REASONS.notStart;
        if(inCycle()){ st.phase = 'idle'; resetCycle(); }
        return this._out('warn', this._warn(gate), null);
      }

      // STEP 9: direction from several consecutive frames, never one
      if(typeof v==='number' && st.prevV!=null){
        const delta = v - st.prevV;
        const sign = Math.abs(delta) < cfg.dirEps ? 0 : (delta > 0 ? 1 : -1);
        st.dirRun = (sign !== 0 && sign === st.dirSign) ? st.dirRun+1 : (sign===0 ? st.dirRun : 1);
        if(sign !== 0) st.dirSign = sign;
      }
      if(typeof v==='number') st.prevV = v;
      const descendingSign = down ? -1 : 1;
      const movingDown = !numeric || (st.dirSign === descendingSign && st.dirRun >= cfg.dirFrames);
      const movingUp = !numeric || (st.dirSign === -descendingSign && st.dirRun >= cfg.dirFrames);

      const w = rule.warn(P, v, opts);
      if(!w) st.goodFrames++;
      const zoneV = typeof v==='number' ? st.emaFast : v;   // zones read the responsive signal
      const atStart = inStart(zoneV, st.phase==='ready' || st.phase==='idle' || st.phase==='cooldown');
      const atPeak = inPeak(zoneV, st.phase==='bottom');
      st.startStreak = atStart ? st.startStreak+1 : 0;
      st.peakStreak = atPeak ? st.peakStreak+1 : 0;
      // Depth is accepted from frames inside a short window rather than strictly
      // consecutive ones: a real person wobbles at the bottom, and demanding an
      // unbroken run there throws away genuine reps.
      st.peakWindow.push(atPeak);
      if(st.peakWindow.length > cfg.dwellWindow) st.peakWindow.shift();
      const peakHits = st.peakWindow.reduce((n,hit)=>n+(hit?1:0), 0);
      const bottomReached = atPeak && peakHits >= Math.max(cfg.confirmFrames, cfg.dwellFrames);
      let event = null;
      st.reason = POSE_REASONS.ok;

      switch(st.phase){
        case 'idle':
          st.reason = POSE_REASONS.notStart;
          if(atStart) calibrate(P, v, typeof st.raw==='number' ? st.raw : null);
          if(st.startStreak >= cfg.readyFrames){
            st.phase = 'ready';
            st.lockedSide = P.sideName; // no mid-rep side switching (metric jumps)
          }
          break;
        case 'ready':
          calibrate(P, v, typeof st.raw==='number' ? st.raw : null);
          // remember the top of the movement: detection lag means the metric has
          // already left the start pose by the time DESCENDING is confirmed, and
          // measuring the range from there would shrink every rep
          if(typeof v==='number') st.readyV = st.readyV==null ? v : (down ? Math.max(st.readyV, v) : Math.min(st.readyV, v));
          // remember when the body actually left the start pose: confirming the
          // direction costs a few frames, and timing the rep from the confirmation
          // makes every rep look faster than it was (fast reps got binned as jitter)
          if(atStart) st.leftStartTs = null;
          else if(st.leftStartTs == null) st.leftStartTs = ts;
          if(!atStart && movingDown){
            const top = st.readyV;            // read it before resetCycle() clears it
            st.phase='descending'; resetCycle();
            st.cycleStartTs = st.leftStartTs != null ? st.leftStartTs : ts;
            st.cycleStartV = typeof v!=='number' ? null
              : (st.calib && st.calib.startV!=null ? st.calib.startV : (top!=null ? top : v));
            st.cyclePeakV = typeof v==='number' ? v : null;
            st.peakStreak = atPeak?1:0;
          } else if(!atStart){
            st.reason = POSE_REASONS.noDir;
          }
          break;
        case 'descending':
          if(typeof zoneV==='number' && (st.cyclePeakV==null || (down ? zoneV < st.cyclePeakV : zoneV > st.cyclePeakV))) st.cyclePeakV = zoneV;
          if(isPartial(zoneV)) st.partialHit = true;
          if(rule.depth && rule.depth(P, st.calib, opts)) st.depthOk = true;
          st.reason = atPeak ? POSE_REASONS.counting : POSE_REASONS.shallow;
          // STEP 10: the bottom must persist, not flash for one frame
          if(bottomReached) st.phase = 'bottom';
          else if(st.startStreak >= cfg.confirmFrames){
            if(st.partialHit){ event='partial'; st.partials++; }
            st.phase = 'ready'; resetCycle();
          }
          break;
        case 'bottom':
          if(typeof zoneV==='number' && (st.cyclePeakV==null || (down ? zoneV < st.cyclePeakV : zoneV > st.cyclePeakV))) st.cyclePeakV = zoneV;
          if(rule.depth && rule.depth(P, st.calib, opts)) st.depthOk = true;
          st.reason = POSE_REASONS.counting;
          if(!atPeak && movingUp) st.phase = 'ascending';
          break;
        case 'ascending':
          st.reason = POSE_REASONS.counting;
          if(bottomReached) st.phase = 'bottom';
          else if(st.startStreak >= cfg.confirmFrames || (firmStart(zoneV) && movingUp)){
            // form is judged only on frames where form was actually visible; a
            // short occlusion is a visibility problem, not bad technique
            const bad = st.cycleBad / Math.max(1, st.cycleFrames);
            const lostRatio = st.cycleLow / Math.max(1, st.cycleFrames + st.cycleLow);
            const elapsed = ts - st.cycleStartTs;
            const deepEnough = !rule.depth || st.depthOk;
            if(elapsed < cfg.minRepMs){ event='jitter'; st.jitter++; st.reason = POSE_REASONS.tooFast; }
            else if(elapsed > cfg.maxRepMs){ event='rejected'; st.rejected++; st.reason = POSE_REASONS.tooSlow; }
            else if(!movedFar() || !deepEnough){ event='partial'; st.partials++; st.reason = POSE_REASONS.shallow; }
            else if(lostRatio > cfg.maxLostRatio){ st.rejected++; event='rejected'; st.reason = POSE_REASONS.lowVis; }
            else if(bad <= cfg.maxBadRatio){ st.reps++; event='rep'; st.reason = POSE_REASONS.counting; }
            else { st.rejected++; event='rejected'; st.reason = POSE_REASONS.badForm; }
            // STEP 11: always cool down, so a bounce cannot become a second rep
            st.phase = 'cooldown'; st.coolStreak = 0; resetCycle();
          }
          break;
        case 'cooldown':
          st.reason = POSE_REASONS.cooldown;
          // a frame deep inside the start pose re-arms at once: fast reps must not
          // be swallowed by the cooldown that exists to stop bounces
          st.coolStreak = atStart ? st.coolStreak + (firmStart(zoneV) ? cfg.cooldownFrames : 1) : 0;
          if(typeof v==='number' && atStart) st.readyV = st.readyV==null ? v : (down ? Math.max(st.readyV, v) : Math.min(st.readyV, v));
          if(st.coolStreak >= cfg.cooldownFrames) st.phase = 'ready';
          break;
      }
      if(inCycle()){ st.cycleFrames++; if(w) st.cycleBad++; }

      let warnKey = w || (event==='partial' ? rule.partialWarn : null);
      if(!warnKey && st.phase==='idle' && !atStart) warnKey = 'pose_get_in_position';
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
      const out = {status: (status==='warn' && !warnKey) ? 'good' : status, warnKey, event, phase: st.phase,
        reps: st.reps, heldSec: Math.floor(st.heldMs/1000), formScore: this.formScore, reason: st.reason};
      // STEP 13/14: why a movement was not counted — only assembled when asked for
      if(cfg.debug){
        out.debug = {
          phase: st.phase, reason: st.reason, metric: typeof st.ema==='number' ? +st.ema.toFixed(1) : st.raw,
          raw: typeof st.raw==='number' ? +st.raw.toFixed(1) : st.raw,
          dirSign: st.dirSign, dirRun: st.dirRun, startStreak: st.startStreak, peakStreak: st.peakStreak,
          coolStreak: st.coolStreak, depthOk: st.depthOk, range: (st.cycleStartV!=null && st.cyclePeakV!=null)
            ? +Math.abs(st.cycleStartV - st.cyclePeakV).toFixed(1) : null,
          calibrated: !!st.calib, side: st.lockedSide, reps: st.reps, warn: st.lastWarn,
        };
      }
      return out;
    },
  };
}

if(typeof module!=='undefined') module.exports = {POSE_RULES, POSE_DEFAULTS, POSE_REASONS, createPoseCounter, poseAngle, PL};
