/* ---------- boot ---------- */
(function init(){
  initFirebase();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  render(); // auth-loading splash until the session check below resolves

  if(typeof firebase==='undefined' || !firebase.apps.length){
    authInitError = true; authReady = true;
    render();
    return;
  }
  firebase.auth().onAuthStateChanged(async user=>{
    authUser = user; authReady = true; authBusy = false; authErr = '';
    authDraft = {email:'', pass:'', pass2:''};
    if(user) await loadCloudState(user.uid);
    else resetLocalState();
    render();
  });
})();
