/* ---------- PLAN ---------- */
function wdNames(){ return [t('wd_mon'),t('wd_tue'),t('wd_wed'),t('wd_thu'),t('wd_fri'),t('wd_sat'),t('wd_sun')]; }
function renderPlan(){
  const p=S.profile;
  const sched=weekSchedule(p.days);
  const todayIdx=(new Date().getDay()+6)%7; // Mon=0
  const WD_NAMES=wdNames();
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>${t('plan_title')}</h2><a class="regen">${t('plan_regen')}</a></div>
      <p class="mut sm" style="margin:0 0 16px">${goalName(p.goal)} · ${LVL_NAMES[p.level]} · ${p.place==='home'?t('onb_home'):p.place==='gym'?t('onb_gym'):t('home_both_places')} · ${t('home_days_per_week', p.days)}</p>
      <p class="xs mut" style="margin:0 0 6px">${t('plan_week')}</p>
      <div class="weekgrid">
        ${sched.map((di,wi)=>{
          if(di===-1) return `<div class="wd rest"><div class="lbl">${WD_NAMES[wi]}</div><div class="ic">😴</div></div>`;
          const d=S.plan[di];
          return `<div class="wd ${d.done?'done':''} ${wi===todayIdx?'today':''}" data-i="${di}">
            <div class="lbl">${WD_NAMES[wi]}</div><div class="ic">${d.done?'✓':'💪'}</div>
          </div>`;
        }).join('')}
      </div>
      <div id="days"></div>
      <div class="note warn" style="margin-top:18px"><div class="lab">⚠ ${t('warmup_title')}</div>${t('warmup_note')} ${refBadge('who_activity','acsm_resistance')}</div>
    </div>`;
  topWire();
  app.querySelectorAll('.weekgrid .wd[data-i]').forEach(w=> w.onclick=()=>openDay(+w.dataset.i));
  const wrap=document.getElementById('days');
  wrap.innerHTML = S.plan.map((d,i)=>`
    <div class="dayhead ${d.done?'done':''}" data-i="${i}" style="cursor:pointer">
      <div class="n">${d.done?'✓':i+1}</div>
      <div class="meta"><b>${planDayTitle(d)}</b><span>${d.ex.length} ${t('unit_exercises')} · ~${planEstMin(d)} ${t('unit_min')} · ${d.focus.map(f=>M_NAMES[f]).filter((v,k,a)=>a.indexOf(v)===k).join(', ')}</span></div>
      <div class="sr" style="color:var(--mut2);font-size:20px">›</div>
    </div>`).join('');
  wrap.querySelectorAll('.dayhead').forEach(h=> h.onclick=()=>openDay(+h.dataset.i));
  app.querySelector('.regen').onclick=()=>{
    S.plan=generatePlan(S.profile); save(); render(); toast(t('toast_program_updated'));
  };
}

/* ---------- DAY / WORKOUT SHEET ---------- */
function openDay(i){
  const d=S.plan[i];
  d.ex.forEach(e=>{
    if(!Array.isArray(e.doneSets) || e.doneSets.length!==e.sets) e.doneSets = Array(e.sets).fill(false);
  });
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:24px">${planDayTitle(d)}</h2>
    <p class="mut sm" style="margin:4px 0 16px">${d.ex.length} ${t('unit_exercises')} · ~${planEstMin(d)} ${t('unit_min')} · ${t('rest_between_sets')}</p>
    <div>${d.ex.map((e,k)=>{const x=ex(e.id);return `
      <div class="exrow" data-ex="${x.id}" data-i="${k}" style="cursor:pointer">
        <div class="thumb">${x.e}</div>
        <div class="info"><b>${x.n}</b><span>${M_NAMES[x.m]} · ${t('rest')} ${e.rest}${t('unit_sec')}</span></div>
        <div class="sr">${e.sets}×${e.reps}<small>set·reps</small></div>
        <button class="timerbtn" data-rest="${e.rest}" aria-label="${t('rest_timer')}">⏱</button>
        <div class="setdots">${e.doneSets.map((on,si)=>`<div class="setdot ${on?'on':''}" data-si="${si}">${si+1}</div>`).join('')}</div>
      </div>`;}).join('')}</div>
    <div style="margin-top:20px">
      ${d.done
        ? `<button class="btn g" id="undo">✓ ${t('done_undo')}</button>`
        : `<button class="btn p" id="complete">${t('finish_workout')} ✓</button>`}
    </div>`;
  sheet.querySelectorAll('.exrow').forEach(r=> r.onclick=()=> openExercise(r.dataset.ex));
  sheet.querySelectorAll('.timerbtn').forEach(b=> b.onclick=ev=>{ ev.stopPropagation(); startRestTimer(+b.dataset.rest); });
  sheet.querySelectorAll('.setdot').forEach(dot=> dot.onclick=ev=>{
    ev.stopPropagation();
    const k=+dot.closest('.exrow').dataset.i, si=+dot.dataset.si;
    const e=d.ex[k];
    e.doneSets[si]=!e.doneSets[si];
    dot.classList.toggle('on');
    save();
  });
  const cb=sheet.querySelector('#complete');
  if(cb) cb.onclick=()=>{
    d.done=true;
    const dt=today();
    if(!S.completed.includes(dt)) S.completed.push(dt);
    S.completedLog[dt] = {titleKey:d.titleKey, focus:d.focus};
    save(); closeSheet(); render();
    toast(t('toast_workout_logged'));
  };
  const ub=sheet.querySelector('#undo');
  if(ub) ub.onclick=()=>{ d.done=false; save(); closeSheet(); render(); };
}
