/* ---------- boot ---------- */
(async function init(){
  try{
    const saved = await Store.get('mf_state');
    if(saved && saved.profile){
      S.profile=saved.profile; S.plan=saved.plan||generatePlan(saved.profile);
      S.weights=saved.weights||[]; S.completed=saved.completed||[];
      S.challenge=saved.challenge||null;
      S.tab='home';
    }
  }catch(e){}
  render();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
})();
