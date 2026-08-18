/* ---------- PROFILE / HISTORY ---------- */
function renderProfile(){
  const p=S.profile;
  const ws=S.weights.slice().sort((a,b)=>a.d<b.d?-1:1);
  const startWeight = ws.length ? ws[0].kg : p.weight;
  const curWeight = ws.length ? ws[ws.length-1].kg : p.weight;
  const delta = curWeight-startWeight;
  const streak = calcStreak();
  const doneCount = S.plan.filter(d=>d.done).length;
  const joined = p.joinedAt || (ws.length?ws[0].d:null);

  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>${t('profile_title')}</h2></div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="position:relative;flex:none">
            <label for="pf_photo" style="display:block;width:52px;height:52px;border-radius:50%;overflow:hidden;cursor:pointer">
              ${p.photo
                ? `<img src="${p.photo}" alt="" style="width:100%;height:100%;object-fit:cover">`
                : `<div style="width:100%;height:100%;background:var(--card2);border:1px solid var(--line);display:grid;place-items:center;font-size:22px">${p.sex==='f'?'👩':'👨'}</div>`}
            </label>
            <label for="pf_photo" class="iconbtn" style="position:absolute;bottom:-4px;right:-4px;width:22px;height:22px;margin:0;display:grid;place-items:center;font-size:11px">📷</label>
            <input type="file" id="pf_photo" accept="image/*" hidden>
          </div>
          <div style="min-width:0">
            <b style="font-size:17px;display:block">${esc(p.name)}</b>
            <span class="xs mut" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(authUser?authUser.email:'')}</span>
          </div>
        </div>
        <hr class="sep">
        <div class="grid g2">
          <div><span class="xs mut">${t('profile_goal')}</span><div style="font-weight:700;margin-top:2px">${goalName(p.goal)}</div></div>
          <div><span class="xs mut">${t('profile_joined')}</span><div style="font-weight:700;margin-top:2px">${joined||'—'}</div></div>
        </div>
        <button class="btn g" id="pf_edit" style="margin-top:14px">✏️ ${t('profile_edit')}</button>
      </div>

      <div class="statbig" style="margin-top:16px">
        <div class="s"><b>${startWeight}<span style="font-size:13px"> ${t('unit_kg')}</span></b><span>${t('profile_start_weight')}</span></div>
        <div class="s acc"><b>${curWeight}<span style="font-size:13px"> ${t('unit_kg')}</span></b><span>${t('profile_cur_weight')}</span></div>
        <div class="s"><b style="color:${delta<0?'var(--ok)':delta>0?'var(--coral)':'var(--txt)'}">${delta>0?'+':''}${delta.toFixed(1)}</b><span>${t('profile_total_change')}</span></div>
        <div class="s"><b>${streak}🔥</b><span>${t('profile_streak')}</span></div>
        <div class="s"><b>${S.completed.length}</b><span>${t('profile_total_workouts')}</span></div>
        <div class="s"><b>${doneCount}/${p.days}</b><span>${t('profile_week_progress')}</span></div>
      </div>

      ${installCardHTML()}

      ${profileSummaryCard(startWeight, curWeight, joined)}

      <div class="secttl"><h2>${t('profile_weight_history')}</h2></div>
      <div class="chartwrap">${weightChart(ws, p.weight)}</div>
      ${historyList(ws.slice().reverse().map(w=>({d:w.d, label:`${w.kg} ${t('unit_kg')}`})), '⚖')}

      <div class="secttl"><h2>${t('profile_workout_history')}</h2></div>
      ${historyList(workoutHistoryRows(), '💪')}

      <div class="secttl"><h2>${t('profile_food_history')}</h2></div>
      ${historyList(foodHistoryRows(), '🍽')}

      <div class="secttl"><h2>${t('profile_timeline')}</h2></div>
      ${timelineRows(ws)}
    </div>`;
  topWire();
  wireInstallCard(app);
  document.getElementById('pf_edit').onclick=openSettings;
  document.getElementById('pf_photo').onchange=e=>{
    const f=e.target.files[0];
    if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const size=200;
        const canvas=document.createElement('canvas');
        canvas.width=size; canvas.height=size;
        const ctx=canvas.getContext('2d');
        const s=Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, size, size);
        S.profile.photo=canvas.toDataURL('image/jpeg', 0.8);
        save();
        renderProfile();
        toast(t('profile_photo_updated'));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(f);
  };
}

function historyList(rows, icon){
  if(!rows.length) return `<p class="xs mut" style="margin:0 0 10px">${t('profile_no_history')}</p>`;
  const shown = rows.slice(0,10);
  return `<div class="card">
    ${shown.map(r=>`<div class="foodrow"><div class="e">${icon}</div><div style="flex:1"><b>${esc(r.d)}</b></div><span class="xs mut">${esc(r.label)}</span></div>`).join('')}
    ${rows.length>10?`<p class="xs mut center" style="margin:8px 0 0">+${rows.length-10}</p>`:''}
  </div>`;
}

function workoutHistoryRows(){
  return S.completed.slice().sort((a,b)=>b<a?-1:1).map(d=>{
    const entry = S.completedLog[d];
    return {d, label: entry ? (entry.titleKey ? t('plantitle_'+entry.titleKey) : entry.title) : t('workout_done_generic')};
  });
}
function foodHistoryRows(){
  // todayLog() lazily creates an empty {breakfast:[],...} entry as a side
  // effect of viewing Home/Nutrition — skip days with nothing actually logged
  return Object.keys(S.foodLog).sort((a,b)=>b<a?-1:1).map(d=>{
    const log=S.foodLog[d];
    let kcal=0, items=0;
    ['breakfast','lunch','dinner','snack'].forEach(slot=>(log[slot]||[]).forEach(it=>{ kcal+=it.kcal||0; items++; }));
    return {d, items, label:`${items} ${t('unit_meals')} · ${kcal} ${t('unit_kcal')}`};
  }).filter(r=>r.items>0);
}

function profileSummaryCard(startWeight, curWeight, joined){
  const delta = curWeight-startWeight;
  const days = joined ? Math.max(0, Math.round((new Date(today())-new Date(joined))/86400000)) : null;
  return `
    <div class="secttl"><h2>${t('profile_summary')}</h2></div>
    <div class="card">
      <div class="grid g2">
        <div>
          <span class="xs mut">${t('profile_summary_from')}${joined?` (${joined})`:''}</span>
          <div style="font-weight:700;margin-top:4px">${startWeight} ${t('unit_kg')}</div>
        </div>
        <div>
          <span class="xs mut">${t('profile_summary_to')}</span>
          <div style="font-weight:700;margin-top:4px">${curWeight} ${t('unit_kg')}</div>
        </div>
      </div>
      <hr class="sep">
      <p class="sm" style="margin:0">
        ${delta<0?`↓ ${t('summary_lost',Math.abs(delta).toFixed(1))}`:delta>0?`↑ ${t('summary_gained',delta.toFixed(1))}`:t('summary_unchanged')}
        ${days!=null?` · ${t('summary_within_days',days)}`:''} · ${t('summary_workouts_done',S.completed.length)} · ${streakLabel()}
      </p>
    </div>`;
}
function streakLabel(){ const s=calcStreak(); return s>0?t('summary_streak_active',s):t('summary_streak_none'); }

function timelineRows(ws){
  const days = {};
  ws.forEach(w=>{ (days[w.d]=days[w.d]||[]).push('⚖'); });
  S.completed.forEach(d=>{ (days[d]=days[d]||[]).push('💪'); });
  Object.keys(S.foodLog).forEach(d=>{ if(Object.values(S.foodLog[d]).some(a=>a.length)) (days[d]=days[d]||[]).push('🍽'); });
  const dates = Object.keys(days).sort((a,b)=>b<a?-1:1).slice(0,14);
  if(!dates.length) return `<p class="xs mut" style="margin:0 0 10px">${t('profile_no_history')}</p>`;
  return `<div class="card">${dates.map(d=>`<div class="foodrow"><div style="flex:1"><b>${d}</b></div><span>${[...new Set(days[d])].join(' ')}</span></div>`).join('')}</div>`;
}
