/* ---------- PROGRESS ---------- */
function renderProgress(){
  const p=S.profile;
  const ws=S.weights.slice().sort((a,b)=>a.d<b.d?-1:1);
  const cur = ws.length?ws[ws.length-1].kg : p.weight;
  const start = ws.length?ws[0].kg : p.weight;
  const delta = (cur-start);
  const streak = calcStreak();
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>${t('prog_title')}</h2></div>
      <div class="statbig">
        <div class="s acc"><b>${cur}<span style="font-size:14px"> ${t('unit_kg')}</span></b><span>${t('prog_cur_weight')}</span></div>
        <div class="s"><b style="color:${delta<0?'var(--ok)':delta>0?'var(--coral)':'var(--txt)'}">${delta>0?'+':''}${delta.toFixed(1)}</b><span>${t('prog_total_change')}</span></div>
        <div class="s"><b>${S.completed.length}</b><span>${t('prog_total_workouts')}</span></div>
        <div class="s"><b>${streak}🔥</b><span>${t('prog_streak')}</span></div>
      </div>

      <div class="chartwrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <b class="sm">${t('prog_chart')}</b><span class="xs mut">${ws.length} ${t('unit_entries')}</span>
        </div>
        ${weightChart(ws, p.weight)}
      </div>

      <div class="card">
        <div class="inrow" style="align-items:flex-end">
          <div class="field" style="flex:1;margin:0"><label for="w_in">${t('todays_weight')}</label>
            <input class="txin" id="w_in" type="number" inputmode="decimal" placeholder="${cur}"></div>
          <button class="btn p" id="w_add" style="width:auto;flex:none;padding:14px 18px">${t('add')}</button>
        </div>
      </div>

      <div class="secttl"><h2>${t('prog_week')}</h2></div>
      ${weekStreak()}

      <div class="secttl"><h2>${t('prog_measures')}</h2></div>
      ${measureCard()}

      <div class="secttl"><h2>${t('prog_records')}</h2></div>
      ${recordsCard()}

      <div class="secttl"><h2>${t('prog_consistency')}</h2></div>
      ${consistencyCard()}

      <div class="secttl"><h2>${t('prog_challenge')}</h2></div>
      ${challengeCard()}
    </div>`;
  topWire();
  document.getElementById('w_add').onclick=()=>{
    const v=parseFloat(document.getElementById('w_in').value);
    if(!v||v<25||v>300){ toast(t('err_enter_valid_weight')); return; }
    const dt=today();
    const ix=S.weights.findIndex(w=>w.d===dt);
    if(ix>=0) S.weights[ix].kg=v; else S.weights.push({d:dt,kg:v});
    save(); render(); toast(t('toast_weight_logged'));
  };
  wireMeasures();
  const cstart=document.getElementById('chall_start');
  if(cstart) cstart.onclick=()=>{
    S.challenge={start:today(), done:[]};
    save(); render(); toast(t('toast_challenge_started'));
  };
  const creset=document.getElementById('chall_reset');
  if(creset) creset.onclick=()=>{
    S.challenge=null; save(); render();
  };
  app.querySelectorAll('.challgrid .cd[data-d]').forEach(c=> c.onclick=()=>{
    const ds=c.dataset.d;
    if(ds>today()) return;
    const ix=S.challenge.done.indexOf(ds);
    if(ix>=0) S.challenge.done.splice(ix,1); else S.challenge.done.push(ds);
    save(); render();
  });
}

/* ---------- 30-day challenge ---------- */
function challengeCard(){
  if(!S.challenge){
    return `<div class="card">
      <p class="mut sm" style="margin:0 0 12px">${t('challenge_intro')}</p>
      <button class="btn p" id="chall_start">${t('challenge_start_btn')} 🔥</button>
    </div>`;
  }
  const doneSet=new Set(S.challenge.done);
  const td=today();
  let cells='';
  for(let i=0;i<30;i++){
    const ds=addDays(S.challenge.start, i);
    const isDone=doneSet.has(ds);
    const cls=[isDone?'done':'', ds===td?'today':'', ds>td?'future':''].filter(Boolean).join(' ');
    cells+=`<div class="cd ${cls}" data-d="${ds}">${isDone?'✓':i+1}</div>`;
  }
  const doneCount=S.challenge.done.length;
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <b class="sm">${t('challenge_days_done', doneCount)}</b>
      <a class="regen" id="chall_reset">↻ ${t('restart')}</a>
    </div>
    <div class="challgrid">${cells}</div>
    ${doneCount>=30?`<div class="note ok"><div class="lab">🎉 ${t('congrats')}</div>${t('challenge_complete')}</div>`:`<p class="mut xs" style="margin:0">${t('challenge_tap_hint')}</p>`}
  </div>`;
}
function calcStreak(){
  if(!S.completed.length) return 0;
  const set=new Set(S.completed); let s=0; let d=today();
  // allow today or yesterday as anchor
  if(!set.has(d)) d=addDays(d, -1);
  while(set.has(d)){ s++; d=addDays(d, -1); }
  return s;
}
function weekStreak(){
  const names=wdNames();
  const td=today(); const day=weekdayIdx(td); // Mon=0
  let html='<div class="streakrow">';
  for(let i=0;i<7;i++){
    const on=S.completed.includes(addDays(td, i-day));
    const isFuture=i>day;
    html+=`<div class="d"><div class="box ${on?'on':''}">${on?'✓':isFuture?'':'·'}</div><span>${names[i]}</span></div>`;
  }
  return html+'</div>';
}
function weightChart(ws, base){
  return lineChart(ws.map(w=>({d:w.d, v:w.kg})), t('unit_kg'));
}
/* one line chart for every metric: [{d, v}] in date order, labelled with its unit */
function lineChart(ws, unit){
  if(ws.length<2){
    return `<div class="empty" style="padding:26px 10px"><div class="e">📉</div><span class="sm">${t('chart_needs_entries')}</span></div>`;
  }
  const W=480,H=150,pad=24;
  const kgs=ws.map(w=>w.v);
  let mn=Math.min(...kgs), mx=Math.max(...kgs);
  if(mx-mn<2){ mn-=1; mx+=1; }
  const x=i=> pad + i*(W-pad*2)/(ws.length-1);
  const y=v=> pad + (1-(v-mn)/(mx-mn))*(H-pad*2);
  const pts=ws.map((w,i)=>[x(i),y(w.v)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${x(ws.length-1).toFixed(1)} ${H-pad} L ${pad} ${H-pad} Z`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="var(--acc-ink)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc-ink)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="var(--acc-ink)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="var(--bg)" stroke="var(--acc-ink)" stroke-width="2"/>`).join('')}
    <text x="${pad}" y="14" fill="var(--mut2)" font-size="11" font-family="Inter">${mx.toFixed(1)}${unit}</text>
    <text x="${pad}" y="${H-6}" fill="var(--mut2)" font-size="11" font-family="Inter">${mn.toFixed(1)}${unit}</text>
  </svg>`;
}

/* ---------- body measurements (cm) ----------
   One entry per day, every metric optional: someone who only tracks their
   waist gets a waist chart and nothing else. `measureMetric` is view state,
   not account data, so it is never saved. */
let measureMetric = 'waist';
const measureLabel = k => t('meas_'+k);
function measureEntries(k){
  return S.measures.filter(m=>isFinite(+m[k])).map(m=>({d:m.d, v:+m[k]})).sort((a,b)=>a.d<b.d?-1:1);
}
function measureCard(){
  const has = MEASURE_KEYS.filter(k=>measureEntries(k).length);
  const metric = has.includes(measureMetric) ? measureMetric : (has[0] || measureMetric);
  const pts = measureEntries(metric);
  const last = pts.length ? pts[pts.length-1] : null;
  const delta = pts.length>1 ? last.v - pts[0].v : 0;
  const inputs = MEASURE_KEYS.map(k=>{
    const e = measureEntries(k);
    const v = e.length ? e[e.length-1].v : '';
    return `<div class="field" style="margin:0"><label for="m_${k}">${measureLabel(k)} (${t('unit_cm')})</label>
      <input class="txin" id="m_${k}" type="number" inputmode="decimal" step="0.1" min="${MEASURE_MIN}" max="${MEASURE_MAX}" placeholder="${v===''?'—':v}"></div>`;
  }).join('');
  return `<div class="card">
    <p class="mut sm" style="margin:0 0 12px">${t('prog_measures_hint')}</p>
    <div class="measgrid">${inputs}</div>
    <button class="btn p" id="m_add" style="margin-top:12px">${t('prog_measures_save')}</button>
  </div>
  ${has.length ? `<div class="chiprow" style="margin:14px 0 10px" role="group" aria-label="${esc(t('prog_measures_pick'))}">
      ${has.map(k=>`<button class="chip ${k===metric?'on':''}" data-metric="${k}" aria-pressed="${k===metric}">${measureLabel(k)}</button>`).join('')}
    </div>
    <div class="chartwrap">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b class="sm">${measureLabel(metric)}</b>
        <span class="xs mut">${last ? `${last.v} ${t('unit_cm')}${pts.length>1 ? ` · ${delta>0?'+':''}${delta.toFixed(1)}` : ''}` : ''}</span>
      </div>
      ${lineChart(pts, t('unit_cm'))}
    </div>` : `<div class="empty" style="padding:22px 10px"><div class="e">📏</div><span class="sm">${t('prog_measures_empty')}</span></div>`}`;
}
function wireMeasures(){
  const add = document.getElementById('m_add');
  if(add) add.onclick = ()=>{
    const entry = {d:today()};
    let bad = false;
    for(const k of MEASURE_KEYS){
      const el = document.getElementById('m_'+k);
      const raw = el ? el.value.trim() : '';
      if(!raw) continue;
      const v = parseFloat(raw);
      if(!isFinite(v) || v<MEASURE_MIN || v>MEASURE_MAX){ bad = true; break; }
      entry[k] = Math.round(v*10)/10;
    }
    if(bad){ toast(t('err_enter_valid_measure')); return; }
    if(Object.keys(entry).length===1){ toast(t('err_enter_one_measure')); return; }
    const ix = S.measures.findIndex(m=>m.d===entry.d);
    if(ix>=0) S.measures[ix] = {...S.measures[ix], ...entry}; else S.measures.push(entry);
    save(); render(); toast(t('toast_measure_logged'));
  };
  app.querySelectorAll('.chip[data-metric]').forEach(c=> c.onclick = ()=>{
    measureMetric = c.dataset.metric;
    render();
  });
}

/* ---------- personal records per exercise ---------- */
function recordsCard(){
  const rows = Object.entries(S.exStats||{})
    .filter(([id, st])=> ex(id) && st && st.sessions>0)
    .sort((a,b)=> (b[1].bestScore||0) - (a[1].bestScore||0))
    .slice(0, 6);
  if(!rows.length) return `<div class="empty" style="padding:22px 10px"><div class="e">🏅</div><span class="sm">${t('prog_records_empty')}</span></div>`;
  return `<div class="card" style="padding:6px 0"><table class="rectable">
    <caption class="sr-only">${esc(t('prog_records'))}</caption>
    <thead><tr><th scope="col">${t('prog_rec_exercise')}</th><th scope="col">${t('prog_rec_best')}</th><th scope="col">${t('prog_rec_sessions')}</th></tr></thead>
    <tbody>${rows.map(([id, st])=>{
      const x = ex(id), c = COACH[id] || {};
      const best = c.mode==='time' ? `${st.bestTime||0} ${t('unit_sec')}` : `${st.bestReps||0} ${t('ws_reps_short')}`;
      return `<tr><td><span aria-hidden="true">${x.e}</span> ${esc(x.n)}</td><td><b>${best}</b></td><td>${st.sessions}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

/* ---------- consistency: workouts per week over the last 8 weeks ---------- */
function consistencyCard(){
  const td = today(), day = weekdayIdx(td);
  const weeks = [];
  for(let w=7; w>=0; w--){
    const start = addDays(td, -day - w*7);
    const end = addDays(start, 6);
    weeks.push({start, n: S.completed.filter(d=>d>=start && d<=end).length});
  }
  const total = weeks.reduce((a,w)=>a+w.n, 0);
  const avg = total/weeks.length;
  const max = Math.max(3, ...weeks.map(w=>w.n));
  const planned = (S.profile && S.profile.days) || 0;
  return `<div class="card">
    <div class="statbig" style="margin:0 0 14px">
      <div class="s acc"><b>${avg.toFixed(1)}</b><span>${t('prog_avg_week')}</span></div>
      <div class="s"><b>${total}</b><span>${t('prog_last8')}</span></div>
    </div>
    <div class="weekbars" role="img" aria-label="${esc(t('prog_consistency_alt', weeks.map(w=>w.n).join(', ')))}">
      ${weeks.map(w=>`<div class="wb"><i style="height:${Math.max(4, w.n/max*100)}%"></i><span>${w.n}</span></div>`).join('')}
    </div>
    <p class="mut xs" style="margin:10px 0 0">${planned ? t('prog_plan_target', planned) : t('prog_last8_hint')}</p>
  </div>`;
}

