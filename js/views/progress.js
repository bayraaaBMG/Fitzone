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
          <div class="field" style="flex:1;margin:0"><label>${t('todays_weight')}</label>
            <input class="txin" id="w_in" type="number" inputmode="decimal" placeholder="${cur}"></div>
          <button class="btn p" id="w_add" style="width:auto;flex:none;padding:14px 18px">${t('add')}</button>
        </div>
      </div>

      <div class="secttl"><h2>${t('prog_week')}</h2></div>
      ${weekStreak()}

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
  const start=new Date(S.challenge.start);
  const doneSet=new Set(S.challenge.done);
  const td=today();
  let cells='';
  for(let i=0;i<30;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const ds=fmt(d);
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
  const set=new Set(S.completed); let s=0; let d=new Date();
  // allow today or yesterday as anchor
  if(!set.has(fmt(d))) d.setDate(d.getDate()-1);
  while(set.has(fmt(d))){ s++; d.setDate(d.getDate()-1); }
  return s;
}
function fmt(d){ return d.toISOString().slice(0,10); }
function weekStreak(){
  const names=wdNames();
  const now=new Date(); const day=(now.getDay()+6)%7; // Mon=0
  let html='<div class="streakrow">';
  for(let i=0;i<7;i++){
    const d=new Date(now); d.setDate(now.getDate()-(day-i));
    const on=S.completed.includes(fmt(d));
    const isFuture=i>day;
    html+=`<div class="d"><div class="box ${on?'on':''}">${on?'✓':isFuture?'':'·'}</div><span>${names[i]}</span></div>`;
  }
  return html+'</div>';
}
function weightChart(ws, base){
  if(ws.length<2){
    return `<div class="empty" style="padding:26px 10px"><div class="e">📉</div><span class="sm">${t('chart_needs_entries')}</span></div>`;
  }
  const W=480,H=150,pad=24;
  const kgs=ws.map(w=>w.kg);
  let mn=Math.min(...kgs), mx=Math.max(...kgs);
  if(mx-mn<2){ mn-=1; mx+=1; }
  const x=i=> pad + i*(W-pad*2)/(ws.length-1);
  const y=v=> pad + (1-(v-mn)/(mx-mn))*(H-pad*2);
  const pts=ws.map((w,i)=>[x(i),y(w.kg)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${x(ws.length-1).toFixed(1)} ${H-pad} L ${pad} ${H-pad} Z`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="var(--acc-ink)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc-ink)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="var(--acc-ink)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="var(--bg)" stroke="var(--acc-ink)" stroke-width="2"/>`).join('')}
    <text x="${pad}" y="14" fill="var(--mut2)" font-size="11" font-family="Inter">${mx.toFixed(1)}${t('unit_kg')}</text>
    <text x="${pad}" y="${H-6}" fill="var(--mut2)" font-size="11" font-family="Inter">${mn.toFixed(1)}${t('unit_kg')}</text>
  </svg>`;
}
