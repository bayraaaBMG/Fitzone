/* ---------- AI V2: pose features (feature spec v1) ----------
   The browser twin of ml/preprocessing/{normalize,pose_features,sequence}.py.
   Training features and inference features MUST be produced the same way, so
   this file is a deliberate line-by-line mirror — ml/tests/test_js_parity.py
   compares both implementations on random skeletons and fails if they drift.

   Pure maths: no DOM, no network, no model. Loading this file costs nothing
   and starts nothing. See ml/README.md for the vector layout. */

const ML_FEATURE_VERSION = 1;
const ML_FEATURE_SIZE = 158;
const ML_SHAPE_CHANNELS = 12;
const ML_MOTION_CHANNELS = 14;
const ML_ANGLE_NA = -1;
const ML_MIN_VISIBILITY = 0.3;   // same thresholds as the shipping rule engine
const ML_FRAME_MARGIN = 0.05;
const ML_MIN_TORSO = 1e-3;
const ML_MAX_SHAPE_VEL = 10;
const ML_MAX_PELVIS_VEL = 5;
const ML_DT_MIN_S = 0.001;
const ML_DT_MAX_S = 0.250;

const MLP = {nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28};

function mlValidPoint(q){
  if(!q) return false;
  const x = q.x, y = q.y, v = q.visibility==null ? 1 : q.visibility;
  if(!isFinite(x) || !isFinite(y) || !isFinite(v)) return false;
  if(x < -ML_FRAME_MARGIN || x > 1+ML_FRAME_MARGIN || y < -ML_FRAME_MARGIN || y > 1+ML_FRAME_MARGIN) return false;
  return v >= ML_MIN_VISIBILITY;
}

/* pelvis-centred, torso-scaled skeleton. Returns null when there is no usable
   person in the frame (no hips, or a folded/degenerate skeleton). */
function mlNormalizeFrame(lm, aspect){
  if(!lm || !lm.length) return null;
  const mask = new Array(33);
  for(let i=0;i<33;i++) mask[i] = mlValidPoint(lm[i]);
  const usableShoulder = mask[MLP.lSh] || mask[MLP.rSh];
  if(!mask[MLP.lHip] || !mask[MLP.rHip] || !usableShoulder) return null;

  const a = aspect || 1;
  const gx = i => (lm[i].x || 0) * a;
  const gy = i => (lm[i].y || 0);
  const gz = i => ((lm[i].z || 0) * a);

  const hipX = (gx(MLP.lHip) + gx(MLP.rHip)) / 2, hipY = (gy(MLP.lHip) + gy(MLP.rHip)) / 2;
  let shX, shY;
  if(mask[MLP.lSh] && mask[MLP.rSh]){ shX = (gx(MLP.lSh) + gx(MLP.rSh)) / 2; shY = (gy(MLP.lSh) + gy(MLP.rSh)) / 2; }
  else { const s = mask[MLP.lSh] ? MLP.lSh : MLP.rSh; shX = gx(s); shY = gy(s); }

  const scale = Math.hypot(shX - hipX, shY - hipY);
  if(!isFinite(scale) || scale < ML_MIN_TORSO) return null;

  const hipZ = (gz(MLP.lHip) + gz(MLP.rHip)) / 2;
  const pts = new Float32Array(33 * 4);
  for(let i=0;i<33;i++){
    if(!mask[i]) continue; // unseen stays all-zero, visibility included
    pts[i*4]   = (gx(i) - hipX) / scale;
    pts[i*4+1] = (gy(i) - hipY) / scale;
    pts[i*4+2] = (gz(i) - hipZ) / scale;
    pts[i*4+3] = lm[i].visibility==null ? 1 : lm[i].visibility;
  }
  return {pts, mask, pelvis:[hipX, hipY], scale};
}

function mlAngle(pts, ia, ib, ic){ // degrees, x/y only
  const ax = pts[ia*4], ay = pts[ia*4+1], bx = pts[ib*4], by = pts[ib*4+1], cx = pts[ic*4], cy = pts[ic*4+1];
  const v1x = ax-bx, v1y = ay-by, v2x = cx-bx, v2y = cy-by;
  const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if(d <= 0) return 180;
  return Math.acos(Math.max(-1, Math.min(1, (v1x*v2x + v1y*v2y)/d))) * 180 / Math.PI;
}

/* 12 scale-free shape channels in [0,1]; ML_ANGLE_NA where joints are unseen */
function mlShapeChannels(frame){
  const {pts, mask} = frame;
  const out = new Float32Array(ML_SHAPE_CHANNELS).fill(ML_ANGLE_NA);
  const ang = (i,j,k,slot)=>{ if(mask[i] && mask[j] && mask[k]) out[slot] = mlAngle(pts,i,j,k)/180; };
  ang(MLP.lSh, MLP.lEl, MLP.lWr, 0);
  ang(MLP.rSh, MLP.rEl, MLP.rWr, 1);
  ang(MLP.lHip, MLP.lSh, MLP.lEl, 2);
  ang(MLP.rHip, MLP.rSh, MLP.rEl, 3);
  ang(MLP.lSh, MLP.lHip, MLP.lKn, 4);
  ang(MLP.rSh, MLP.rHip, MLP.rKn, 5);
  ang(MLP.lHip, MLP.lKn, MLP.lAn, 6);
  ang(MLP.rHip, MLP.rKn, MLP.rAn, 7);
  if(mask[MLP.lSh] && mask[MLP.rSh]){
    const shx = (pts[MLP.lSh*4] + pts[MLP.rSh*4])/2, shy = (pts[MLP.lSh*4+1] + pts[MLP.rSh*4+1])/2;
    out[8] = Math.atan2(Math.abs(shx), Math.abs(shy)) * 180/Math.PI / 180; // lean from vertical
    if(mask[MLP.lAn] && mask[MLP.rAn]){
      const anx = (pts[MLP.lAn*4] + pts[MLP.rAn*4])/2, any = (pts[MLP.lAn*4+1] + pts[MLP.rAn*4+1])/2;
      out[9] = Math.atan2(Math.abs(shy-any), Math.abs(shx-anx)) * 180/Math.PI / 180; // 0 = lying flat
    }
    out[10] = Math.min(2, Math.abs(pts[MLP.lSh*4] - pts[MLP.rSh*4]))/2;
  }
  if(mask[MLP.lHip] && mask[MLP.rHip]) out[11] = Math.min(2, Math.abs(pts[MLP.lHip*4] - pts[MLP.rHip*4]))/2;
  return out;
}

/* streaming extractor — one per camera session */
function createMlFeatureExtractor(){
  let prevShape = null, prevPelvis = null, prevTs = null;
  return {
    reset(){ prevShape = null; prevPelvis = null; prevTs = null; },
    push(lm, aspect, tsMs){
      const frame = mlNormalizeFrame(lm, aspect);
      if(!frame){ this.reset(); return {vec:null, valid:false}; }
      const shape = mlShapeChannels(frame);
      const vec = new Float32Array(ML_FEATURE_SIZE);
      vec.set(frame.pts, 0);
      vec.set(shape, 132);
      const dtRaw = prevTs==null ? 0 : (tsMs - prevTs)/1000;
      if(prevShape && dtRaw > 0){
        const dt = Math.min(ML_DT_MAX_S, Math.max(ML_DT_MIN_S, dtRaw));
        for(let i=0;i<ML_SHAPE_CHANNELS;i++){
          if(shape[i]===ML_ANGLE_NA || prevShape[i]===ML_ANGLE_NA) continue;
          vec[144+i] = Math.max(-ML_MAX_SHAPE_VEL, Math.min(ML_MAX_SHAPE_VEL, (shape[i]-prevShape[i])/dt));
        }
        if(prevPelvis && frame.scale >= ML_MIN_TORSO){
          const k = frame.scale * dt;
          vec[156] = Math.max(-ML_MAX_PELVIS_VEL, Math.min(ML_MAX_PELVIS_VEL, (frame.pelvis[0]-prevPelvis[0])/k));
          vec[157] = Math.max(-ML_MAX_PELVIS_VEL, Math.min(ML_MAX_PELVIS_VEL, (frame.pelvis[1]-prevPelvis[1])/k));
        }
      }
      prevShape = shape; prevPelvis = frame.pelvis; prevTs = tsMs;
      return {vec, valid:true};
    },
  };
}

/* ring buffer of the last `length` valid frames; a gap clears it, because a
   window stitched across an occlusion is not a real movement */
function createMlSequenceBuffer(length){
  const len = Math.max(1, length|0);
  let buf = [];
  return {
    get length(){ return len; },
    get filled(){ return buf.length; },
    get ready(){ return buf.length >= len; },
    reset(){ buf = []; },
    push(vec, valid){
      if(!valid || !vec){ buf = []; return false; }
      buf.push(vec);
      if(buf.length > len) buf.shift();
      return true;
    },
    /* flat [len * ML_FEATURE_SIZE] tensor input, left-padded with the oldest
       frame while warming up (same as ml/preprocessing/sequence.pad_window) */
    window(){
      if(!buf.length) return null;
      const out = new Float32Array(len * ML_FEATURE_SIZE);
      const pad = len - buf.length;
      for(let i=0;i<len;i++){
        const src = i < pad ? buf[0] : buf[i - pad];
        out.set(src, i * ML_FEATURE_SIZE);
      }
      return out;
    },
  };
}

if(typeof module!=='undefined') module.exports = {
  ML_FEATURE_VERSION, ML_FEATURE_SIZE, ML_SHAPE_CHANNELS, ML_MOTION_CHANNELS, ML_ANGLE_NA, MLP,
  mlValidPoint, mlNormalizeFrame, mlShapeChannels, createMlFeatureExtractor, createMlSequenceBuffer,
};
