/* ============================================================
   CORE — render dispatcher, bottom nav, shared bits (top bar, sheet)
   ============================================================ */
const app = document.getElementById('app');
const navEl = document.getElementById('nav');

function render(){
  if(!S.profile){ renderOnboard(); navEl.classList.add('hidden'); return; }
  navEl.classList.remove('hidden');
  renderNav();
  if(S.tab==='home') renderHome();
  else if(S.tab==='plan') renderPlan();
  else if(S.tab==='library') renderLibrary();
  else if(S.tab==='progress') renderProgress();
  else if(S.tab==='nutrition') renderNutrition();
  window.scrollTo(0,0);
}

/* ---------- NAV ---------- */
function renderNav(){
  const tabs=[['home','🏠','Нүүр'],['plan','📋','Хөтөлбөр'],['library','🏋️','Дасгал'],['progress','📈','Ахиц'],['nutrition','🍳','Хоол']];
  navEl.innerHTML = tabs.map(([id,ic,nm])=>
    `<button class="${S.tab===id?'on':''}" data-tab="${id}"><span class="ni">${ic}</span>${nm}</button>`).join('');
  navEl.querySelectorAll('button').forEach(b=> b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}

/* ---------- shared bits ---------- */
function topBar(){
  return `<div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div>
    <div class="who">${esc(S.profile.name)}<br><span style="color:var(--acc)">${goalName(S.profile.goal)}</span></div>
    <button class="iconbtn" id="settingsBtn" aria-label="Тохиргоо">⚙</button></div>`;
}
function topWire(){
  const b=document.getElementById('settingsBtn');
  if(b) b.onclick=openSettings;
}
function mkSheet(){
  closeSheet();
  const s=document.createElement('div'); s.className='sheet'; s.id='sheet';
  s.innerHTML=`<div class="inner"></div>`;
  s.onclick=e=>{ if(e.target===s) closeSheet(); };
  document.body.appendChild(s);
  return s;
}
function closeSheet(){ const s=document.getElementById('sheet'); if(s) s.remove(); }

/* ---------- chip selectors (used by onboarding & settings) ---------- */
function chips(state, name, opts, multi){
  return `<div class="chiprow" data-name="${name}" data-multi="${multi?1:0}">` +
    opts.map(o=>{
      const on = multi ? (state[name]||[]).includes(o.v) : state[name]===o.v;
      return `<button class="chip ${on?'on':''}" data-v="${o.v}">${o.e?o.e+' ':''}${o.n}</button>`;
    }).join('') + `</div>`;
}
function wireChips(root, state, onChange){
  root.querySelectorAll('.chiprow').forEach(row=>{
    const name=row.dataset.name, multi=row.dataset.multi==='1';
    row.querySelectorAll('.chip').forEach(c=> c.onclick=()=>{
      let v=c.dataset.v;
      if(multi){
        let arr=state[name]||[];
        arr = arr.includes(v)? arr.filter(x=>x!==v): [...arr, v];
        state[name]=arr;
      } else {
        state[name] = isNaN(+v)? v : +v;
      }
      onChange();
    });
  });
}

/* ---------- rest timer ---------- */
let restTimer=null;
function startRestTimer(seconds){
  stopRestTimer();
  let remain=seconds;
  const bar=document.createElement('div'); bar.className='timerbar'; bar.id='restTimer';
  document.body.appendChild(bar);
  const paint=()=>{
    bar.innerHTML=`<span>⏱ Амралт <b>${remain}</b>с</span><button id="restStop">Алгасах</button>`;
    bar.querySelector('#restStop').onclick=stopRestTimer;
  };
  paint();
  restTimer=setInterval(()=>{
    remain--;
    if(remain<=0){ stopRestTimer(); toast('Амралт дууслаа 💪'); if(navigator.vibrate) navigator.vibrate(200); return; }
    paint();
  },1000);
}
function stopRestTimer(){
  if(restTimer){ clearInterval(restTimer); restTimer=null; }
  const bar=document.getElementById('restTimer'); if(bar) bar.remove();
}
