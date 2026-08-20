/* ---------- EXERCISE DETAIL ---------- */
function videoEmbed(x){
  if(!x.video) return `<div class="novideo"><div class="e">🎬</div>${t('video_coming_soon')}</div>`;
  if(/^https?:\/\//.test(x.video) || /\.(mp4|webm|mov)(\?.*)?$/i.test(x.video)){
    return `<div class="vidwrap"><video controls preload="none" poster="${x.poster||''}"><source src="${x.video}" type="video/mp4"></video></div>`;
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
    <div class="kv">
      <div class="k"><b>${sch.sets}×${sch.reps}</b><span>Set·Reps</span></div>
      <div class="k"><b>${sch.rest}${t('unit_sec')}</b><span>${t('rest')}</span></div>
      <div class="k"><b>~${x.kcal}</b><span>${t('kcal_per_min')}</span></div>
    </div>
    <p class="xs mut" style="margin:-6px 0 6px">${refBadge('acsm_resistance')}</p>
    <div class="block"><div class="lab">🎯 ${t('target_muscle')}</div><div class="note">${x.tgt}</div></div>
    <div class="block"><div class="lab">📐 ${t('proper_technique')}</div><div class="note">${x.tech}</div></div>
    <div class="block"><div class="lab">⚠ ${t('common_mistakes')}</div><div class="note warn">${x.err}</div></div>
    <div class="block"><div class="lab">🔁 ${t('alt_exercises')}</div>
      <div class="note">${t('easier')}: <b>${x.easy}</b><br>${t('harder')}: <b>${x.hard}</b></div></div>`;
}
