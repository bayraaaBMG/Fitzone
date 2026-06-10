/* ---------- persistence (window.storage with in-memory fallback) ---------- */
const Store = (() => {
  let mem = {};
  const has = (typeof window !== 'undefined' && window.storage);
  return {
    async get(k){ try{ if(has){ const r = await window.storage.get(k); return r? JSON.parse(r.value): null;} }catch(e){} return mem[k] ?? null; },
    async set(k,v){ mem[k]=v; try{ if(has) await window.storage.set(k, JSON.stringify(v)); }catch(e){} },
  };
})();

/* ---------- app state ---------- */
let S = {
  profile:null,         // {name,age,sex,height,weight,goal,level,place,days,minutes,equip:[]}
  plan:null,            // [{title, focus, ex:[{id,sets,reps,rest}], done:bool}]
  weights:[],           // [{d:'YYYY-MM-DD', kg}]
  completed:[],         // ['YYYY-MM-DD']
  tab:'home',
};

/* ---------- utils ---------- */
const today = ()=> new Date().toISOString().slice(0,10);
const ex = id => EX.find(x=>x.id===id);
let toastT;
function toast(msg){
  let t=document.createElement('div'); t.className='toast'; t.textContent=msg;
  document.body.appendChild(t); clearTimeout(toastT);
  toastT=setTimeout(()=>t.remove(), 2200);
}
async function save(){ await Store.set('mf_state', {profile:S.profile, plan:S.plan, weights:S.weights, completed:S.completed}); }
function esc(t){ return (t||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
