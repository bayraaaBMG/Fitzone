/* ---------- persistence (window.storage > localStorage > in-memory) ---------- */
const Store = (() => {
  let mem = {};
  const has = (typeof window !== 'undefined' && window.storage);
  const ls = (typeof localStorage !== 'undefined') ? localStorage : null;
  return {
    async get(k){
      try{ if(has){ const r = await window.storage.get(k); return r? JSON.parse(r.value): null; } }catch(e){}
      if(ls){ try{ const v=ls.getItem(k); if(v!=null) return JSON.parse(v); }catch(e){} }
      return mem[k] ?? null;
    },
    async set(k,v){
      mem[k]=v;
      try{ if(has) await window.storage.set(k, JSON.stringify(v)); }catch(e){}
      if(ls){ try{ ls.setItem(k, JSON.stringify(v)); }catch(e){} }
    },
  };
})();

/* ---------- app state ---------- */
let S = {
  profile:null,         // {name,age,sex,height,weight,goal,level,place,days,minutes,equip:[],joinedAt,photo}
  plan:null,            // [{title, focus, ex:[{id,sets,reps,rest}], done:bool}]
  weights:[],           // [{d:'YYYY-MM-DD', kg}]
  completed:[],         // ['YYYY-MM-DD']
  completedLog:{},      // {'YYYY-MM-DD': {title, focus:[...]}} — richer history alongside `completed`
  challenge:null,       // {start:'YYYY-MM-DD', done:['YYYY-MM-DD']} | null
  pantry:[],            // ['egg','beef',...] pantry tags the user has at home
  foodLog:{},           // {'YYYY-MM-DD': {breakfast:[],lunch:[],dinner:[],snack:[]}}
  waterLog:{},          // {'YYYY-MM-DD': ml}
  theme:'dark',         // 'dark' | 'light' | 'system'
  lang:'mn',            // 'mn' | 'en'
  exStats:{},           // {exerciseId: {sessions,bestReps,bestTime,bestScore,bestRate,streak,lastDay,last}} — see js/records.js
  workoutResults:[],    // [WorkoutResult] newest first, capped — see js/records.js
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
let _saveErrShown = false;
async function save(){
  const data = {
    profile:S.profile, plan:S.plan, weights:S.weights, completed:S.completed, completedLog:S.completedLog,
    challenge:S.challenge, pantry:S.pantry, foodLog:S.foodLog, waterLog:S.waterLog, theme:S.theme, lang:S.lang,
    exStats:S.exStats, workoutResults:S.workoutResults,
  };
  const key = authUser ? 'mf_state_'+authUser.uid : 'mf_state';
  await Store.set(key, data);
  if(authUser){
    // local copy above is already written, so a cloud failure never loses data — tell the user once
    try{ await usersDoc(authUser.uid).set({...data, updatedAt: Date.now()}, {merge:true}); _saveErrShown = false; }
    catch(e){ if(!_saveErrShown){ _saveErrShown = true; toast(t('toast_save_failed')); } }
  }
}
function esc(t){ return (t||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function todayLog(){
  const d=today();
  if(!S.foodLog[d]) S.foodLog[d]={breakfast:[],lunch:[],dinner:[],snack:[]};
  return S.foodLog[d];
}
