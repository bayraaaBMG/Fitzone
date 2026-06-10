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
      <div class="secttl" style="margin-top:4px"><h2>Миний ахиц</h2></div>
      <div class="statbig">
        <div class="s acc"><b>${cur}<span style="font-size:14px"> кг</span></b><span>Одоогийн жин</span></div>
        <div class="s"><b style="color:${delta<0?'var(--ok)':delta>0?'var(--coral)':'var(--txt)'}">${delta>0?'+':''}${delta.toFixed(1)}</b><span>Нийт өөрчлөлт (кг)</span></div>
        <div class="s"><b>${S.completed.length}</b><span>Нийт дасгал</span></div>
        <div class="s"><b>${streak}🔥</b><span>Дараалсан өдөр</span></div>
      </div>

      <div class="chartwrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <b class="sm">Жингийн өөрчлөлт</b><span class="xs mut">${ws.length} бичлэг</span>
        </div>
        ${weightChart(ws, p.weight)}
      </div>

      <div class="card">
        <div class="inrow" style="align-items:flex-end">
          <div class="field" style="flex:1;margin:0"><label>Өнөөдрийн жин (кг)</label>
            <input class="txin" id="w_in" type="number" inputmode="decimal" placeholder="${cur}"></div>
          <button class="btn p" id="w_add" style="width:auto;flex:none;padding:14px 18px">Нэмэх</button>
        </div>
      </div>

      <div class="secttl"><h2>Энэ 7 хоног</h2></div>
      ${weekStreak()}
    </div>`;
  topWire();
  document.getElementById('w_add').onclick=()=>{
    const v=parseFloat(document.getElementById('w_in').value);
    if(!v||v<25||v>300){ toast('Бодит жин (кг) оруулна уу'); return; }
    const t=today();
    const ix=S.weights.findIndex(w=>w.d===t);
    if(ix>=0) S.weights[ix].kg=v; else S.weights.push({d:t,kg:v});
    save(); render(); toast('Жин бүртгэгдлээ');
  };
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
  const names=['Дав','Мяг','Лха','Пүр','Баа','Бям','Ням'];
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
    return `<div class="empty" style="padding:26px 10px"><div class="e">📉</div><span class="sm">Жингээ 2-оос дээш удаа бүртгэхэд график зурагдана.</span></div>`;
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
      <stop offset="0" stop-color="#C9F73B" stop-opacity=".28"/><stop offset="1" stop-color="#C9F73B" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#C9F73B" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="#0A0B0D" stroke="#C9F73B" stroke-width="2"/>`).join('')}
    <text x="${pad}" y="14" fill="#646C78" font-size="11" font-family="Inter">${mx.toFixed(1)}кг</text>
    <text x="${pad}" y="${H-6}" fill="#646C78" font-size="11" font-family="Inter">${mn.toFixed(1)}кг</text>
  </svg>`;
}
