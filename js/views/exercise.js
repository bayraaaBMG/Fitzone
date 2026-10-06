/* ---------- EXERCISE DETAIL ---------- */
/* what an exercise shows when it has neither a clip nor an embed: the two
   demonstration frames, or the drawn muscle figure */
function novideoHTML(x){
  const demo = typeof exerciseDemoHTML==='function' ? exerciseDemoHTML(x.id) : '';
  const isPhoto = /class="exdemo"/.test(demo);
  return `<div class="novideo figure${isPhoto?' photo':''}">${demo}
    ${isPhoto ? '' : `<span class="xs mut">${t('video_coming_soon')}</span>`}</div>`;
}
/* a silent form clip from our own origin, looping on its own */
function clipHTML(x, clip){
  const auto = exClipAutoplay();
  const c = clip.credit;
  const cred = c
    ? `<span class="clipcred">${c.url ? `<a href="${c.url}" target="_blank" rel="noopener">${esc(c.by)}</a>` : esc(c.by)}${c.lic ? ' \u00b7 ' + esc(c.lic) : ''}</span>`
    : '';
  return `<div class="vidwrap clip" data-clip="${esc(x.id)}">
    <video ${auto ? 'autoplay ' : ''}loop muted playsinline preload="metadata" disablepictureinpicture
      poster="${clip.poster}" aria-label="${esc(t('clip_label', x.n))}">
      ${clip.src.map(s => `<source src="${s.src}" type="${s.type}">`).join('')}
    </video>
    <button class="clipbtn" type="button" aria-pressed="${auto ? 'true' : 'false'}"
      aria-label="${esc(auto ? t('clip_pause') : t('clip_play'))}">${auto ? '\u23f8' : '\u25b6'}</button>
    ${cred}</div>`;
}
function videoEmbed(x){
  // our own clip comes first: it loops silently and needs no third party
  const clip = typeof exClip==='function' ? exClip(x.id) : null;
  if(clip) return clipHTML(x, clip);
  if(!x.video) return novideoHTML(x);
  if(/^https:\/\/.+\.gif(\?.*)?$/i.test(x.video)){
    return `<div class="vidwrap gif"><img src="${esc(x.video)}" alt="${esc(x.n)}" loading="lazy"></div>`;
  }
  if(/^https?:\/\//.test(x.video) || /\.(mp4|webm|mov)(\?.*)?$/i.test(x.video)){
    return `<div class="vidwrap"><video controls preload="none" poster="${x.poster||''}"><source src="${esc(x.video)}" type="${/\.webm(\?.*)?$/i.test(x.video)?'video/webm':'video/mp4'}"></video></div>`;
  }
  return `<div class="vidwrap"><iframe src="https://www.youtube.com/embed/${x.video}" title="${esc(x.n)}" loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
}
function openExercise(id){
  const x=ex(id);
  const goal = S.profile?S.profile.goal:'tone';
  const lvl = S.profile?S.profile.level:x.lvl;
  const sch = repScheme(goal, lvl);
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    ${videoEmbed(x)}
    <h2 class="disp" style="font-size:23px">${x.n}</h2>
    <div style="margin-top:8px">
      <span class="vtag">${x.loc==='home'?'🏠 '+t('onb_home'):'🏋️ '+t('onb_gym')}</span><span class="vtag">${M_NAMES[x.m]}</span><span class="vtag">${LVL_NAMES[x.lvl]}</span>
      ${(x.goals||[]).map(g=>`<span class="vtag">${goalName(g)}</span>`).join('')}
    </div>
    <div class="exstart" style="margin-top:14px">
      <button class="btn p" id="exStart">▶ ${t('ws_start_btn')}</button>
      <button class="btn g" id="exBattle">${t('ws_battle_btn')}</button>
    </div>
    ${exPrLine(x.id)}
    <div class="kv">
      <div class="k"><b>${sch.sets}×${sch.reps}</b><span>Set·Reps</span></div>
      <div class="k"><b>${sch.rest}${t('unit_sec')}</b><span>${t('rest')}</span></div>
      <div class="k"><b>~${x.kcal}</b><span>${t('kcal_per_min')}</span></div>
    </div>
    <p class="xs mut" style="margin:-6px 0 6px">${refBadge('acsm_resistance')}</p>
    <div class="block"><div class="lab">🎯 ${t('target_muscle')}</div><div class="note">${x.tgt}</div></div>
    <div class="block"><div class="lab">📐 ${t('proper_technique')}</div><div class="note">${x.tech}</div></div>
    <div class="block"><div class="lab">⚠ ${t('common_mistakes')}</div><div class="note warn">${x.err}</div></div>
    ${typeof recoveryMapHTML==='function' ? recoveryMapHTML(id) : ''}
    <div class="block"><div class="lab">🔁 ${t('alt_exercises')}</div>
      <div class="note">${t('easier')}: <b>${x.easy}</b><br>${t('harder')}: <b>${x.hard}</b></div></div>`;
  sheet.querySelector('#exStart').onclick=()=> openWorkout(x.id, false);
  sheet.querySelector('#exBattle').onclick=()=> openWorkout(x.id, true);
  if(typeof startExerciseDemos==='function') startExerciseDemos(sheet);
  wireExerciseClip(sheet, x);
}

/* ---- clip playback ----
   Only the open sheet holds a clip, so one observer is enough for all of them. */
let _clipIO = null;
function stopExerciseClips(){
  if(_clipIO){ _clipIO.disconnect(); _clipIO = null; }
  document.querySelectorAll('.vidwrap.clip video').forEach(v => { try{ v.pause(); }catch(e){} });
}
function wireExerciseClip(sheet, x){
  const wrap = sheet.querySelector('.vidwrap.clip');
  if(!wrap) return;
  const v = wrap.querySelector('video'), btn = wrap.querySelector('.clipbtn');
  let userPaused = !v.autoplay, dead = false;

  // no file there, or one the browser cannot decode: show the illustration
  // instead of a black box, and stop asking for it for the rest of the session
  const fail = () => {
    if(dead) return;
    dead = true;
    if(typeof exClipFailed==='function') exClipFailed(wrap.dataset.clip);
    stopExerciseClips();
    wrap.insertAdjacentHTML('beforebegin', novideoHTML(x));
    wrap.remove();
    if(typeof startExerciseDemos==='function') startExerciseDemos(sheet);
  };
  v.addEventListener('error', fail);
  // the element fires error itself once every candidate is exhausted; counting
  // the sources as well covers browsers that only report it on the <source>
  const srcs = v.querySelectorAll('source');
  let left = srcs.length;
  srcs.forEach(s => s.addEventListener('error', () => {
    if(typeof exClipFormatFailed==='function') exClipFormatFailed(s.getAttribute('src'));
    if(--left <= 0) fail();
  }));

  const setBtn = playing => {
    btn.textContent = playing ? '\u23f8' : '\u25b6';
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.setAttribute('aria-label', playing ? t('clip_pause') : t('clip_play'));
  };
  btn.onclick = () => {
    if(v.paused){ userPaused = false; v.play().catch(()=>{}); }
    else { userPaused = true; v.pause(); }
  };
  v.addEventListener('play', () => setBtn(true));
  v.addEventListener('pause', () => setBtn(false));
  // a browser may refuse autoplay; that must not look like a broken clip
  if(v.autoplay) v.play().catch(() => { userPaused = true; setBtn(false); });

  // scrolled out of the sheet: stop, so no battery goes on a clip nobody sees
  if(window.IntersectionObserver){
    _clipIO = new IntersectionObserver(entries => entries.forEach(en => {
      if(dead) return;
      if(en.isIntersecting){ if(!userPaused) v.play().catch(()=>{}); }
      else if(!v.paused) v.pause();
    }), {threshold:0.15});
    _clipIO.observe(v);
  }
}
function exPrLine(id){
  const s=exStatsFor(id), c=COACH[id];
  if(!s.sessions || !c) return '';
  const best = c.mode==='time' ? `${s.bestTime} ${t('ws_sec_short')}` : `${s.bestReps} ${t('ws_reps_short')}`;
  return `<p class="expr">${t('ex_pr_line', `<b>${best}</b>`, s.streak)}</p>`;
}
