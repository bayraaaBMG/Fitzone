/* ---------- WORKOUT / BATTLE SESSION ----------
   intro → 3-2-1 countdown → active → result, as one full-screen overlay.
   Works for every exercise in EX (via COACH). Camera + pose detection is
   strictly opt-in per session; without it reps are counted by tapping. */
let WS = null;
let wsIgnorePop = false; // set while we pop our own history entry on close

function openWorkout(exId, battle){
  if(!COACH[exId] || !ex(exId)) return;
  closeSheet();
  if(WS) wsTeardown();
  const c = COACH[exId];
  WS = {
    exId, battle:!!battle, step:'intro', mode:c.mode,
    duration: c.dur, oppType: battle ? 'ai' : 'target', oppLevel: S.profile ? S.profile.level : 2,
    amount:0, elapsed:0, paused:false, ticker:null, tickAt:0, countT:null, cueT:null, cueIdx:0,
    cam:null, camState:'off', camErr:null, camFacing:'user', pose:null, note:null, noteT:null, wake:null,
    media:null, opener: document.activeElement,
  };
  const root = document.createElement('div');
  root.className = 'ws'; root.id = 'ws';
  root.setAttribute('role','dialog'); root.setAttribute('aria-modal','true');
  document.body.appendChild(root);
  document.documentElement.classList.add('ws-open');
  // an extra history entry lets the Android/browser Back button close the
  // overlay instead of leaving the app mid-workout (see popstate below)
  if(wsIgnorePop) WS.pendingPush = true; // our previous entry is still being popped — push after it's gone
  else { try{ history.pushState({fzWorkout:true}, ''); WS.hist = true; }catch(e){} }
  wsRender();
  wsFocus('#wsGo');
}
function wsFocus(sel){ const el = wsRoot() && wsRoot().querySelector(sel); if(el) try{ el.focus({preventScroll:true}); }catch(e){} }

/* ---------- helpers ---------- */
function wsRoot(){ return document.getElementById('ws'); }
function wsClock(sec){ sec = Math.max(0, Math.floor(sec)); return sec<60 ? String(sec) : `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`; }
function wsUnit(){ return WS.mode==='time' ? t('ws_sec_short') : t('ws_reps_short'); }
function wsTarget(){
  if(WS.oppType==='record') return recordTargetFor(WS.exId, WS.duration) || 0;
  if(WS.oppType==='ai') return aiTargetFor(WS.exId, WS.oppLevel, WS.duration);
  return WS.mode==='time' ? WS.duration : soloTargetFor(WS.exId, WS.duration);
}
function wsOppLive(){
  const tg = wsTarget();
  if(WS.oppType==='target') return tg;
  if(WS.mode==='time') return Math.min(tg, Math.floor(WS.elapsed));
  return Math.min(tg, Math.floor(tg * WS.elapsed / WS.duration));
}
function wsOppName(){
  if(WS.oppType==='ai') return t('ws_ai_level', LVL_NAMES[WS.oppLevel]);
  if(WS.oppType==='record') return t('ws_my_record');
  return t('ws_target');
}
function wsAutoCount(){ return !!(WS.cam && WS.cam.counter && WS.camState==='on'); }
function wsEqName(eq){ return t('ws_eq_'+(eq||'none')); }

/* persistent <video>+<canvas> layer, moved between intro preview and active stage */
function wsMedia(){
  if(!WS.media){
    const m = document.createElement('div');
    m.className = 'ws-media';
    m.innerHTML = `<video playsinline muted autoplay></video><canvas></canvas>`;
    WS.media = m;
  }
  const mirror = WS.camFacing==='user';
  WS.media.querySelector('video').classList.toggle('mirror', mirror);
  WS.media.querySelector('canvas').classList.toggle('mirror', mirror);
  return WS.media;
}
function wsAttachMedia(host){
  if(!host || WS.camState==='off' || WS.camState==='error') return;
  host.prepend(wsMedia());
  const v = WS.media.querySelector('video');
  if(v.srcObject && v.paused) v.play().catch(()=>{});
}

/* ---------- camera ---------- */
async function wsStartCamera(){
  if(!WS || WS.camState==='loading' || WS.camState==='on') return;
  const sess = WS; // the overlay may be closed/reopened while permission + model load are pending
  WS.camState = 'loading'; WS.camErr = null; wsRender();
  const m = wsMedia();
  const signal = {aborted:false};
  WS.camSignal = signal;
  try{
    const cam = await startPoseCamera({
      video: m.querySelector('video'), canvas: m.querySelector('canvas'),
      exId: sess.exId, facing: sess.camFacing, onFrame: wsOnPose, onEnded: ()=>wsCameraEnded(sess), signal,
    });
    if(WS!==sess || signal.aborted){ cam.stop(); return; }
    WS.cam = cam; WS.camState = 'on';
    if(WS.step!=='active' || WS.paused) cam.pause();
  }catch(err){
    if(WS!==sess || err.code==='aborted') return; // whoever aborted already set the state
    WS.cam = null; WS.camState = 'error'; WS.camErr = err.code || 'model';
  }
  wsRender();
}
/* camera track ended from outside (permission revoked, another app took the camera, device unplugged) */
function wsCameraEnded(sess){
  if(!WS || WS!==sess) return;
  wsStopCamera();
  WS.camState = 'error'; WS.camErr = 'ended';
  wsRender();
}
/* cancels a still-loading start too, so no stream survives a close/background mid-load */
function wsAbortCameraLoad(){
  const sg = WS && WS.camSignal;
  if(sg && !sg.aborted){ sg.aborted = true; if(sg.onabort) sg.onabort(); }
}
function wsStopCamera(){
  wsAbortCameraLoad();
  if(WS.cam){ WS.cam.stop(); WS.cam = null; }
  WS.camState = 'off'; WS.pose = null;
}
async function wsFlipCamera(){
  WS.camFacing = WS.camFacing==='user' ? 'environment' : 'user';
  wsStopCamera();
  await wsStartCamera();
}
function wsOnPose(out){
  if(!WS) return;
  WS.pose = out;
  if(WS.step==='active' && !WS.paused && out.tracked){
    if(WS.mode==='reps'){
      if(out.reps > WS.amount){ WS.amount = out.reps; wsRepFeedback(); }
      if(out.event==='rejected') wsNote(t('ws_rep_rejected', t(WS.cam.counter.state.lastWarn || 'pose_get_in_position')));
    } else {
      WS.amount = out.heldSec;
    }
  }
  wsUpdatePill();
  if(WS.step==='active') wsUpdateHud();
}
function wsPillInfo(){
  if(WS.camState!=='on' || !WS.pose) return null;
  const p = WS.pose;
  if(p.status==='lowconf') return {cls:'low', text:t('pose_low_conf')};
  if(!p.tracked) return {cls:'good', text:t('pose_tracking_manual')};
  if(WS.step!=='active' || WS.paused) return {cls: p.status==='lowconf'?'low':'good', text:t('pose_ready')};
  if(p.status==='warn' && p.warnKey) return {cls:'warn', text:t(p.warnKey)};
  return {cls:'good', text:t('pose_good')};
}
function wsUpdatePill(){
  const el = wsRoot() && wsRoot().querySelector('#wsPill');
  if(!el) return;
  const info = wsPillInfo();
  el.innerHTML = info ? `<span class="${info.cls}">${esc(info.text)}</span>` : '';
}

/* ---------- feedback ---------- */
function wsRepFeedback(){
  const f = wsRoot() && wsRoot().querySelector('.ws-flash');
  if(f){ f.classList.remove('rep'); void f.offsetWidth; f.classList.add('rep'); }
  if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){}
}
function wsNote(msg){
  WS.note = msg;
  clearTimeout(WS.noteT);
  WS.noteT = setTimeout(()=>{ if(WS){ WS.note = null; wsUpdateHud(); } }, 2600);
  wsUpdateHud();
}

/* ---------- rendering ---------- */
function wsRender(){
  const root = wsRoot(); if(!root || !WS) return;
  if(WS.step==='intro') wsRenderIntro(root);
  else if(WS.step==='count') wsRenderCount(root);
  else if(WS.step==='active') wsRenderActive(root);
  else wsRenderResult(root);
}

function wsTopBar(label){
  return `<div class="ws-top">
    <button class="ws-x" id="wsX" aria-label="${t('ws_close')}">✕</button>
    <div class="ws-title">${esc(label)}</div>
  </div>`;
}

function wsRenderIntro(root){
  const x = ex(WS.exId), c = coachFor(WS.exId), stats = exStatsFor(WS.exId);
  const sch = repScheme(S.profile ? S.profile.goal : 'tone', x.lvl);
  const recTarget = recordTargetFor(WS.exId, WS.duration);
  const durChoices = WS.mode==='reps' ? [30,45,60] : [30,45,60,90];
  const showDur = WS.mode==='reps' || WS.oppType==='target';
  const camNote = WS.camState==='loading' ? `<p class="ws-note">${t('ws_cam_loading')}</p>`
    : WS.camState==='error' ? `<p class="ws-note err">${t('cam_err_'+WS.camErr)}</p>`
    : WS.camState==='on' ? `<p class="ws-note ok">${c.pose ? t('ws_cam_on_auto') : t('ws_cam_on_manual')}</p>`
    : `<p class="ws-note">${c.pose ? t('ws_cam_note_auto') : t('ws_cam_note_manual')}</p>`;
  const best = WS.mode==='time' ? stats.bestTime : stats.bestReps;

  root.innerHTML = `<div class="ws-inner">
    ${wsTopBar(WS.battle ? t('ws_mode_battle') : t('ws_mode_workout'))}
    <div class="ws-body">
      <h1 class="ws-h1">${esc(x.n)}</h1>
      <p class="ws-lead">${esc(c.muscles.map(m=>M_NAMES[m]).join(', '))}</p>
      <div class="ws-tags">
        <span>${t('ws_lvl')}: ${LVL_NAMES[x.lvl]}</span>
        <span>${esc(wsEqName(x.eq))}</span>
        <span>${WS.mode==='time' ? t('ws_mode_time') : t('ws_mode_reps')}</span>
        <span>${c.pose ? t('ws_pose_auto_tag') : t('ws_pose_manual_tag')}</span>
      </div>
      <div class="ws-kv">
        <div><b>${WS.mode==='time' ? wsClock(c.dur)+t('ws_sec_short') : `${sch.sets}×${sch.reps}`}</b><span>${t('ws_recommended')}</span></div>
        <div><b>${sch.rest}${t('unit_sec')}</b><span>${t('ws_rest')}</span></div>
        <div><b>${best ? best : '—'}</b><span>${t('ws_best')}</span></div>
      </div>

      ${WS.battle ? `<div class="ws-card"><div class="lab">${t('ws_opponent')}</div>
        <div class="ws-chips" id="wsOpp">
          ${[1,2,3].map(l=>`<button class="ws-chip ${WS.oppType==='ai'&&WS.oppLevel===l?'on':''}" data-opp="ai" data-lvl="${l}">🤖 ${esc(t('ws_ai_level', LVL_NAMES[l]))}</button>`).join('')}
          <button class="ws-chip ${WS.oppType==='record'?'on':''}" data-opp="record" ${recTarget?'':'disabled'}>🏆 ${t('ws_my_record')}</button>
        </div>
        <p class="ws-note">${recTarget ? '' : t('ws_no_record_yet')+' '}${t('ws_ai_note')}</p>
        <p class="ws-note">${esc(wsOppName())}: <b>${wsTarget()} ${wsUnit()}</b>${WS.mode==='reps' ? ` / ${WS.duration}${t('ws_sec_short')}` : ''}</p>
      </div>` : ''}

      ${showDur ? `<div class="ws-card"><div class="lab">${WS.mode==='reps' ? t('ws_duration') : t('ws_target_hold')}</div>
        <div class="ws-chips" id="wsDur">${durChoices.map(d=>`<button class="ws-chip ${WS.duration===d?'on':''}" data-d="${d}">${d} ${t('ws_sec_short')}</button>`).join('')}</div>
        ${!WS.battle ? `<p class="ws-note">${t('ws_target')}: <b>${wsTarget()} ${wsUnit()}</b></p>` : ''}
      </div>` : ''}

      <div class="ws-card"><div class="lab">${t('ws_how_to')}</div><ul class="ws-list">${c.form.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
      <div class="ws-card"><div class="lab">${t('ws_mistakes')}</div><ul class="ws-list bad">${c.mistakes.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>
      <div class="ws-card"><div class="lab">${t('ws_tips')}</div><ul class="ws-list tip">${c.tips.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>

      <div class="ws-card"><div class="lab">${t('ws_camera')}</div>
        ${WS.camState==='on' || WS.camState==='loading' ? `<div class="ws-stage" id="wsPreview" style="min-height:220px;margin:0 0 10px">
            <div class="ws-pill" id="wsPill" role="status" aria-live="polite"></div>
            <div class="ws-camctl"><button class="ws-chipbtn" id="wsFlip">${t('ws_cam_flip')}</button><button class="ws-chipbtn" id="wsCamOff">${t('ws_cam_off')}</button></div>
          </div>` : `<button class="ws-chipbtn" id="wsCam" style="width:100%">${t('ws_cam_btn')}</button>`}
        ${camNote}
        <p class="ws-note">${t('ws_cam_privacy')} ${t('ws_cam_accuracy')}</p>
      </div>

      <div class="ws-card"><div class="lab">${t('ws_progression')}</div>
        <div class="ws-ladder">${c.progNames.map((n,i)=>`<div class="${i===COACH[WS.exId].step?'cur':''}">${i+1}. ${esc(n)}</div>`).join('')}</div>
      </div>
    </div>
    <div class="ws-foot"><button class="ws-btn p big" id="wsGo">▶ ${t('ws_start')}</button></div>
  </div>`;

  wsAttachMedia(root.querySelector('#wsPreview'));
  wsUpdatePill();
  root.querySelector('#wsX').onclick = wsClose;
  root.querySelector('#wsGo').onclick = wsBeginCountdown;
  root.querySelectorAll('#wsOpp .ws-chip').forEach(b=> b.onclick=()=>{
    WS.oppType = b.dataset.opp;
    if(b.dataset.lvl) WS.oppLevel = +b.dataset.lvl;
    wsRender();
  });
  root.querySelectorAll('#wsDur .ws-chip').forEach(b=> b.onclick=()=>{ WS.duration = +b.dataset.d; wsRender(); });
  const camBtn = root.querySelector('#wsCam'); if(camBtn) camBtn.onclick = wsStartCamera;
  const off = root.querySelector('#wsCamOff'); if(off) off.onclick = ()=>{ wsStopCamera(); wsRender(); };
  const flip = root.querySelector('#wsFlip'); if(flip) flip.onclick = wsFlipCamera;
}

function wsBeginCountdown(){
  WS.step = 'count';
  let n = 3;
  const tick = ()=>{
    if(!WS || WS.step!=='count') return;
    const root = wsRoot();
    root.querySelector('#wsCountNum').outerHTML = n>0 ? `<b id="wsCountNum">${n}</b>` : `<b id="wsCountNum" class="go">${t('ws_go')}</b>`;
    if(n<0){ wsStartActive(); return; }
    n--;
    WS.countT = setTimeout(tick, n<0 ? 600 : 850);
  };
  wsRender();
  tick();
}
function wsRenderCount(root){
  root.innerHTML = `<div class="ws-inner">
    ${wsTopBar(ex(WS.exId).n)}
    <div class="ws-count">
      <p>${t('ws_get_ready')}</p>
      <b id="wsCountNum">3</b>
      <p>${t('ws_count_hint')}</p>
    </div>
  </div>`;
  root.querySelector('#wsX').onclick = wsClose;
}

function wsStartActive(){
  WS.step = 'active'; WS.amount = 0; WS.elapsed = 0; WS.paused = false; WS.finishing = false;
  if(WS.cam){ WS.cam.reset(); WS.cam.resume(); }
  WS.tickAt = performance.now();
  WS.ticker = setInterval(wsTick, 200);
  WS.cueIdx = 0;
  WS.cueT = setInterval(()=>{ if(!WS) return; WS.cueIdx++; const el = wsRoot().querySelector('#wsCue'); if(el) el.innerHTML = wsCueHTML(); }, 4000);
  if(navigator.wakeLock && navigator.wakeLock.request){
    navigator.wakeLock.request('screen').then(l=>{ if(WS) WS.wake = l; else l.release(); }).catch(()=>{});
  }
  wsRender();
}
function wsTick(){
  if(!WS || WS.step!=='active') return;
  const now = performance.now();
  const dt = (now - WS.tickAt)/1000;
  WS.tickAt = now;
  if(WS.paused) return;
  WS.elapsed += dt;
  if(WS.mode==='time' && !wsAutoCount()) WS.amount = Math.floor(WS.elapsed);
  if(WS.mode==='reps' && WS.elapsed >= WS.duration){ WS.elapsed = WS.duration; wsFinish(); return; }
  if(WS.mode==='time' && WS.elapsed >= 300){ wsFinish(); return; }
  wsUpdateHud();
}
function wsCueHTML(){
  const c = coachFor(WS.exId);
  return `<small>${t('ws_how_to')}</small>${esc(c.form[WS.cueIdx % c.form.length])}`;
}

function wsRenderActive(root){
  const x = ex(WS.exId);
  const camOn = WS.camState==='on' || WS.camState==='loading';
  const manualReps = WS.mode==='reps' && !wsAutoCount();
  root.innerHTML = `<div class="ws-inner">
    ${wsTopBar(x.n)}
    <div class="ws-hud">
      <div class="ws-hudrow">
        <div class="ws-side l"><div class="ws-name">${t('ws_you')}</div><div class="ws-score" id="wsMe" aria-live="polite" aria-atomic="true">0</div></div>
        <div class="ws-time"><small>${t('ws_time')}</small><b id="wsClock">0</b></div>
        <div class="ws-side r"><div class="ws-name">${esc(wsOppName())}</div><div class="ws-score" id="wsOpp">0</div></div>
      </div>
      <div class="ws-bar ${WS.battle?'':'solo'}"><i id="wsBar" style="width:${WS.battle?50:0}%"></i></div>
    </div>
    <div class="ws-stage" id="wsStage">
      ${camOn ? '' : `<div class="ws-demo"><div class="e">${x.e}</div><div class="ws-cue" id="wsCue">${wsCueHTML()}</div></div>`}
      <div class="ws-pill" id="wsPill" role="status" aria-live="polite"></div>
      <div class="ws-flash"></div>
      <div class="ws-camctl">${manualReps ? `<button class="ws-chipbtn" id="wsMinus" aria-label="${t('ws_minus_label')}">−1</button>` : ''}${camOn
        ? `<button class="ws-chipbtn" id="wsCamOff">${t('ws_cam_off')}</button>`
        : `<button class="ws-chipbtn" id="wsCam">${t('ws_cam_btn')}</button>`}</div>
    </div>
    <div class="ws-sub" id="wsSub"></div>
    <div class="ws-ctl ${manualReps?'':'two'}">
      <button class="ws-btn g" id="wsPause">${WS.paused ? '▶ '+t('ws_resume') : '❚❚ '+t('ws_pause')}</button>
      ${manualReps ? `<button class="ws-btn p big" id="wsPlus" aria-label="${t('ws_plus_label')}">+1</button>` : ''}
      <button class="ws-btn ${manualReps?'g':'p'}" id="wsFin">■ ${t('ws_finish')}</button>
    </div>
  </div>`;
  wsAttachMedia(root.querySelector('#wsStage'));
  wsUpdatePill();
  wsUpdateHud();
  root.querySelector('#wsX').onclick = wsClose;
  root.querySelector('#wsPause').onclick = wsTogglePause;
  root.querySelector('#wsFin').onclick = wsFinish;
  const plus = root.querySelector('#wsPlus');
  if(plus) plus.onclick = ()=>{ if(WS.paused) return; WS.amount++; wsRepFeedback(); wsUpdateHud(); };
  const minus = root.querySelector('#wsMinus'); // undo a mistaken tap
  if(minus) minus.onclick = ()=>{ if(WS.paused || WS.amount<=0) return; WS.amount--; wsUpdateHud(); };
  const camBtn = root.querySelector('#wsCam');
  if(camBtn) camBtn.onclick = async ()=>{ await wsStartCamera(); if(WS && WS.cam){ WS.cam.reset(); if(!WS.paused) WS.cam.resume(); wsRender(); } };
  const off = root.querySelector('#wsCamOff');
  if(off) off.onclick = ()=>{ wsStopCamera(); wsRender(); };
}
function wsUpdateHud(){
  const root = wsRoot(); if(!root || !WS || WS.step!=='active') return;
  const q = s => root.querySelector(s);
  const target = wsTarget(), opp = wsOppLive();
  const clock = WS.mode==='reps' ? WS.duration - WS.elapsed : WS.elapsed;
  if(q('#wsMe')) q('#wsMe').textContent = WS.amount;
  if(q('#wsOpp')) q('#wsOpp').textContent = opp;
  if(q('#wsClock')){ q('#wsClock').textContent = wsClock(Math.ceil(clock)); q('#wsClock').classList.toggle('low', WS.mode==='reps' && clock<=5); }
  if(q('#wsBar')){
    const w = WS.battle ? ((WS.amount+opp) ? WS.amount/(WS.amount+opp)*100 : 50) : (target ? Math.min(100, WS.amount/target*100) : 0);
    q('#wsBar').style.width = w.toFixed(1)+'%';
  }
  const sub = q('#wsSub');
  if(sub){
    const left = WS.paused ? `<b>${t('ws_paused')}</b>`
      : WS.note ? `<b>${esc(WS.note)}</b>`
      : `${t('ws_target')}: <b>${target} ${wsUnit()}</b>`;
    const right = wsAutoCount() ? `📷 ${t('ws_auto_count')}`
      : (WS.mode==='reps' ? `<button class="ws-chipbtn" id="wsUndo" style="padding:6px 12px">${t('ws_undo')}</button>` : `⏱ ${t('ws_holding')}`);
    sub.innerHTML = `<span>${left}</span>${right}`;
    const undo = sub.querySelector('#wsUndo');
    if(undo) undo.onclick = ()=>{ if(WS.amount>0){ WS.amount--; wsUpdateHud(); } };
  }
}
function wsTogglePause(){
  WS.paused = !WS.paused;
  WS.tickAt = performance.now();
  if(WS.cam){ WS.paused ? WS.cam.pause() : WS.cam.resume(); }
  const b = wsRoot().querySelector('#wsPause');
  if(b) b.textContent = WS.paused ? '▶ '+t('ws_resume') : '❚❚ '+t('ws_pause');
  wsUpdatePill(); wsUpdateHud();
}

function wsFinish(){
  if(!WS || WS.step!=='active' || WS.finishing) return; // timer end + Finish tap in the same tick, double taps
  WS.finishing = true;
  clearInterval(WS.ticker); clearInterval(WS.cueT);
  if(WS.cam) WS.cam.pause();
  if(WS.wake){ WS.wake.release().catch(()=>{}); WS.wake = null; }
  const formScore = wsAutoCount() ? WS.cam.counter.formScore : null;
  const oppAmount = WS.oppType==='target' ? wsTarget() : wsOppLive();
  const result = buildWorkoutResult({
    exId: WS.exId, mode: WS.mode, amount: WS.amount,
    // reps mode is judged over the chosen window even if finished early, so a
    // quick 6-reps-in-1s tap session can't inflate the "beat your record" pace
    duration: WS.mode==='reps' ? WS.duration : Math.max(1, Math.round(WS.elapsed)),
    activeSec: Math.max(1, Math.round(WS.elapsed)), formScore,
    oppType: WS.oppType, oppLevel: WS.oppType==='ai' ? WS.oppLevel : null, oppAmount,
  });
  let info = null;
  if(WS.amount > 0){ info = recordWorkoutResult(result); save(); }
  WS.result = {r: result, info, oppAmount};
  wsStopCamera();
  WS.step = 'result';
  wsRender();
  wsFocus('#wsDone');
}

function wsRenderResult(root){
  const x = ex(WS.exId), {r, info, oppAmount} = WS.result;
  const amount = WS.mode==='time' ? r.heldSec : r.reps;
  const tie = WS.oppType!=='target' && amount===oppAmount;
  let crown, verdict, cls='', msg;
  if(WS.oppType==='target'){
    const hit = amount >= oppAmount;
    crown = hit ? '🎯' : '💪'; verdict = hit ? t('ws_target_hit') : t('ws_session_done'); cls = hit ? 'win' : '';
    msg = hit ? t('ws_msg_target_hit') : t('ws_msg_target_miss');
  } else if(tie){
    crown = '🤝'; verdict = t('ws_draw'); msg = t('ws_msg_lose');
  } else if(r.won){
    crown = '🏆'; verdict = t('ws_you_win'); cls = 'win'; msg = t('ws_msg_win');
  } else {
    crown = '💪'; verdict = t('ws_keep_going'); msg = t('ws_msg_lose');
  }
  const lines = [];
  lines.push(WS.mode==='time' ? t('ws_done_time', amount) : t('ws_done_reps', amount));
  if(info){
    if(info.firstTime) lines.push(t('ws_pr_first'));
    else if(info.isPR) lines.push(t('ws_pr_up', info.prDelta));
    else lines.push(t('ws_pr_same', WS.mode==='time' ? info.stats.bestTime : info.stats.bestReps));
    lines.push(info.streakUp ? t('ws_streak_up', info.streak) : t('ws_streak', info.streak));
  }
  lines.push(r.formScore==null ? t('ws_form_none') : t('ws_form_score', r.formScore));
  const hint = info ? progressionHint(WS.exId) : null;

  root.innerHTML = `<div class="ws-inner">
    ${wsTopBar(x.n)}
    <div class="ws-body"><div class="ws-res">
      <div class="ws-crown">${crown}</div>
      <div class="ws-verdict ${cls}">${verdict}</div>
      <div class="ws-vs">
        <div class="ws-side l"><div class="ws-name">${t('ws_you')}</div><div class="ws-score l">${amount}</div></div>
        <div class="dash">—</div>
        <div class="ws-side r"><div class="ws-name">${esc(wsOppName())}</div><div class="ws-score r">${oppAmount}</div></div>
      </div>
      <p class="ws-msg">${msg}</p>
      <div class="ws-card"><ul class="ws-list">${lines.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
        ${info ? '' : `<p class="ws-note">${t('ws_not_saved')}</p>`}
      </div>
      ${hint ? `<div class="ws-card"><div class="lab">${t('ws_progression')}</div><p class="ws-lead">${esc(hint.dir==='up' ? t('ws_next_up', hint.name) : t('ws_next_down', hint.name))}</p></div>` : ''}
    </div></div>
    <div class="ws-foot">
      <button class="ws-btn p" id="wsDone">✓ ${t('ws_done')}</button>
      <button class="ws-btn g" id="wsAgain">↻ ${t('ws_again')}</button>
    </div>
  </div>`;
  root.querySelector('#wsX').onclick = wsDone;
  root.querySelector('#wsDone').onclick = wsDone;
  root.querySelector('#wsAgain').onclick = ()=>{
    WS.step = 'intro'; WS.amount = 0; WS.elapsed = 0; WS.result = null; WS.note = null;
    wsRender();
  };
}

/* ---------- close / cleanup ---------- */
function wsDone(){ wsTeardown(); render(); }
function wsClose(){
  if(!WS) return;
  if(WS.step==='active' && WS.amount>0 && !confirm(t('ws_confirm_quit'))) return;
  wsTeardown();
}
function wsTeardown(){
  if(!WS) return;
  clearInterval(WS.ticker); clearInterval(WS.cueT); clearTimeout(WS.countT); clearTimeout(WS.noteT);
  wsAbortCameraLoad();
  if(WS.cam) WS.cam.stop();
  if(WS.wake) WS.wake.release().catch(()=>{});
  const root = wsRoot(); if(root) root.remove();
  document.documentElement.classList.remove('ws-open');
  const hadHist = WS.hist, opener = WS.opener;
  WS = null;
  if(opener && opener.isConnected && opener!==document.body) try{ opener.focus({preventScroll:true}); }catch(e){}
  if(hadHist){ wsIgnorePop = true; try{ history.back(); }catch(e){ wsIgnorePop = false; } }
}

/* ---------- lifecycle guards (registered once) ---------- */
// app backgrounded: pause the clock and release the camera (mobile OSes freeze or
// revoke it anyway) — the user resumes and can turn the camera back on
document.addEventListener('visibilitychange', ()=>{
  if(!document.hidden || !WS) return;
  if(WS.step==='active' && !WS.paused) wsTogglePause();
  if(WS.cam || WS.camState==='loading'){ wsStopCamera(); WS.camState = 'error'; WS.camErr = 'hidden'; wsRender(); }
});
// page being unloaded / put in bfcache: never leave a camera stream running
window.addEventListener('pagehide', ()=>{
  if(!WS || !(WS.cam || WS.camState==='loading')) return;
  wsStopCamera(); WS.camState = 'error'; WS.camErr = 'hidden';
  if(WS.step==='active' && !WS.paused) wsTogglePause();
  wsRender(); // if the page comes back from bfcache it must not show a dead camera layout
});
// refresh / tab close with unsaved reps: native "leave site?" confirmation
window.addEventListener('beforeunload', e=>{
  if(WS && WS.step==='active' && WS.amount>0){ e.preventDefault(); e.returnValue = ''; }
});
// Back button closes the overlay (asking first if reps would be lost)
window.addEventListener('popstate', ()=>{
  if(wsIgnorePop){
    wsIgnorePop = false;
    if(WS && WS.pendingPush){ WS.pendingPush = false; try{ history.pushState({fzWorkout:true}, ''); WS.hist = true; }catch(e){} }
    return;
  }
  if(!WS || !WS.hist) return;
  WS.hist = false;
  if(WS.step==='active' && WS.amount>0 && !confirm(t('ws_confirm_quit'))){
    try{ history.pushState({fzWorkout:true}, ''); WS.hist = true; }catch(e){}
    return;
  }
  const wasResult = WS.step==='result';
  wsTeardown();
  if(wasResult) render();
});
document.addEventListener('keydown', e=>{
  if(e.key!=='Escape' || !WS) return;
  e.preventDefault();
  if(WS.step==='result') wsDone(); else wsClose();
});
