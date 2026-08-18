/* ============================================================
   CORE — render dispatcher, bottom nav, shared bits (top bar, sheet)
   ============================================================ */
const app = document.getElementById('app');
const navEl = document.getElementById('nav');

function render(){
  if(!authReady){ renderAuthLoading(); navEl.classList.add('hidden'); return; }
  if(!authUser){ renderAuthGate(); navEl.classList.add('hidden'); return; }
  if(!S.profile){ renderOnboard(); navEl.classList.add('hidden'); return; }
  navEl.classList.remove('hidden');
  renderNav();
  if(S.tab==='home') renderHome();
  else if(S.tab==='plan') renderPlan();
  else if(S.tab==='library') renderLibrary();
  else if(S.tab==='progress') renderProgress();
  else if(S.tab==='nutrition') renderNutrition();
  else if(S.tab==='profile') renderProfile();
  window.scrollTo(0,0);
}

/* ---------- NAV ---------- */
function renderNav(){
  const tabs=[['home','🏠',t('nav_home')],['plan','📋',t('nav_plan')],['library','🏋️',t('nav_library')],['progress','📈',t('nav_progress')],['nutrition','🍳',t('nav_nutrition')]];
  navEl.innerHTML = tabs.map(([id,ic,nm])=>
    `<button class="${S.tab===id?'on':''}" data-tab="${id}"><span class="ni">${ic}</span>${nm}</button>`).join('');
  navEl.querySelectorAll('button').forEach(b=> b.onclick=()=>{ S.tab=b.dataset.tab; render(); });
}

/* ---------- shared bits ---------- */
function topBar(){
  return `<div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div>
    <button class="who" id="whoBtn">${esc(S.profile.name)}<br><span style="color:var(--acc-ink)">${goalName(S.profile.goal)}</span></button>
    <button class="iconbtn" id="settingsBtn" aria-label="${t('settings')}">⚙</button></div>`;
}
function topWire(){
  const b=document.getElementById('settingsBtn');
  if(b) b.onclick=openSettings;
  const w=document.getElementById('whoBtn');
  if(w) w.onclick=()=>{ S.tab='profile'; render(); };
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

/* ---------- PWA install ---------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredInstallPrompt = e;
});
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isMobile(){
  return isIOS() || /android|windows phone|mobi/i.test(navigator.userAgent);
}

/* ---------- theme ---------- */
function applyTheme(theme){
  if(theme==='light' || theme==='dark') document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme'); // 'system' — follow prefers-color-scheme
  try{ localStorage.setItem('mf_theme', theme); }catch(e){}
}
function installBoxHTML(){
  if(isStandalone()) return `<p class="xs mut">✓ Апп болгож суулгасан байна.</p>`;
  if(deferredInstallPrompt) return `<button class="btn g" id="installBtn">📲 Апп болгож суулгах</button>`;
  if(isIOS()) return `<p class="xs mut">Safari дээрх "Хуваалцах" 📤 товч дараад "Add to Home Screen" сонговол апп болгож суулгана.</p>`;
  return `<p class="xs mut">Энэ browser дээр browser-ийн цэснээс "Install app" / "Add to Home Screen" сонголтыг ашиглаж суулгаж болно.</p>`;
}
function wireInstallBox(root){
  const b=root.querySelector('#installBtn');
  if(!b) return;
  b.onclick=()=>{
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(()=>{ deferredInstallPrompt=null; });
  };
}
