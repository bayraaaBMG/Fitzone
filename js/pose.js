/* ---------- camera + MediaPipe pose (opt-in only) ----------
   Nothing here runs until the user taps "Camera ашиглан шалгах":
   no permission prompt, no model download, no WASM on page load.
   The model (~6 MB) and runtime come from CDNs and are cached by the
   browser's normal HTTP cache after the first use. */
const POSE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1';
const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const POSE_LINKS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
let _poseLandmarkerP = null;

function loadPoseLandmarker(){
  if(!_poseLandmarkerP){
    _poseLandmarkerP = (async()=>{
      const vision = await import(POSE_CDN + '/vision_bundle.mjs');
      const fileset = await vision.FilesetResolver.forVisionTasks(POSE_CDN + '/wasm');
      const make = delegate => vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions:{modelAssetPath:POSE_MODEL_URL, delegate},
        runningMode:'VIDEO', numPoses:1,
        minPoseDetectionConfidence:0.5, minPosePresenceConfidence:0.5, minTrackingConfidence:0.5,
      });
      try{ return await make('GPU'); }catch(e){ return await make('CPU'); }
    })().catch(err=>{ _poseLandmarkerP = null; throw err; }); // allow a retry after a failed load
  }
  return _poseLandmarkerP;
}

function poseCameraSupported(){
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/* getUserMedia failures only — these are always camera problems, never the model */
function poseErrorCode(err){
  const n = err && err.name;
  if(n==='NotAllowedError' || n==='PermissionDeniedError' || n==='SecurityError') return 'denied';
  return 'nocamera'; // NotFound/DevicesNotFound, NotReadable/TrackStart, Overconstrained, Abort, TypeError, unknown
}

/* starts camera + detection loop. onFrame({status, warnKey, event, reps, heldSec, formScore, tracked})
   is called ~12x/sec. Resolves to a controller; rejects with Error{code}. */
async function startPoseCamera({video, canvas, exId, facing, onFrame, onEnded}){
  if(!poseCameraSupported()){ const e=new Error('unsupported'); e.code='nocamera'; throw e; }
  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:facing||'user', width:{ideal:640}, height:{ideal:480}}});
  }catch(err){ const e=new Error(err && err.message); e.code=poseErrorCode(err); throw e; }

  video.muted = true; video.setAttribute('playsinline',''); video.setAttribute('muted','');
  video.srcObject = stream;
  try{ await video.play(); }catch(e){}

  let landmarker;
  try{ landmarker = await loadPoseLandmarker(); }
  catch(err){ stream.getTracks().forEach(tr=>tr.stop()); const e=new Error(err && err.message); e.code='model'; throw e; }

  const coach = COACH[exId];
  const makeCounter = () => coach && coach.pose ? createPoseCounter(coach.pose, {exId}) : null;
  let counter = makeCounter();
  const ctx = canvas.getContext('2d');
  let raf = 0, stopped = false, paused = false, lastRun = 0, lastVideoTime = -1;
  // track ended from outside (permission revoked, camera taken by another app, unplugged).
  // stop() does not fire 'ended', so this only reports external loss.
  const reportEnded = () => { if(!stopped && onEnded) onEnded(); };
  stream.getVideoTracks().forEach(tr => tr.addEventListener('ended', reportEnded));
  if(stream.getVideoTracks().some(tr => tr.readyState==='ended')) setTimeout(reportEnded, 0); // lost while the model loaded

  function draw(lm, status){
    if(canvas.width!==video.videoWidth || canvas.height!==video.videoHeight){
      canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
    }
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!lm) return;
    const col = status==='good' ? '#C9F73B' : status==='warn' ? '#FFB23D' : 'rgba(255,255,255,.55)';
    const W=canvas.width, H=canvas.height;
    ctx.lineWidth = Math.max(3, W/160); ctx.strokeStyle = col; ctx.lineCap='round';
    POSE_LINKS.forEach(([a,b])=>{
      if((lm[a].visibility||0)<0.3 || (lm[b].visibility||0)<0.3) return;
      ctx.beginPath(); ctx.moveTo(lm[a].x*W, lm[a].y*H); ctx.lineTo(lm[b].x*W, lm[b].y*H); ctx.stroke();
    });
    ctx.fillStyle = '#fff';
    [11,12,13,14,15,16,23,24,25,26,27,28].forEach(i=>{
      if((lm[i].visibility||0)<0.3) return;
      ctx.beginPath(); ctx.arc(lm[i].x*W, lm[i].y*H, Math.max(4, W/110), 0, Math.PI*2); ctx.fill();
    });
  }

  function loop(ts){
    if(stopped) return;
    raf = requestAnimationFrame(loop);
    if(ts - lastRun < 80 || video.readyState < 2 || video.currentTime===lastVideoTime) return;
    lastRun = ts; lastVideoTime = video.currentTime;
    let lm = null;
    try{ const res = landmarker.detectForVideo(video, performance.now()); lm = res && res.landmarks && res.landmarks[0]; }
    catch(e){ lm = null; }
    const aspect = (video.videoWidth||4)/(video.videoHeight||3);
    let out;
    if(counter && !paused) out = counter.update(lm, ts, aspect);
    else {
      const vis = lm ? [11,12,23,24].reduce((a,i)=>a+(lm[i].visibility||0),0)/4 : 0;
      out = {status: vis>=0.55 ? 'tracking' : 'lowconf', warnKey:null, event:null,
        reps: counter?counter.state.reps:0, heldSec: counter?Math.floor(counter.state.heldMs/1000):0, formScore: counter?counter.formScore:null};
      if(counter && paused) counter.state.lastTs = null; // don't bank paused time as hold time
    }
    out.tracked = !!counter;
    draw(lm, out.status);
    onFrame && onFrame(out);
  }
  raf = requestAnimationFrame(loop);

  return {
    get counter(){ return counter; },
    reset(){ counter = makeCounter(); },
    pause(){ paused = true; },
    resume(){ paused = false; if(counter) counter.state.lastTs = null; },
    stop(){
      if(stopped) return;
      stopped = true; cancelAnimationFrame(raf);
      stream.getTracks().forEach(tr=>tr.stop());
      video.srcObject = null;
      ctx.clearRect(0,0,canvas.width,canvas.height);
    },
  };
}
