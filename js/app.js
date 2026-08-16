/* ---------- boot ---------- */
(async function init(){
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

  // resolve any pending Google redirect-based sign-in (and surface its error,
  // if any) before the auth-state listener starts clearing authErr on its own
  try{ await firebase.auth().getRedirectResult(); }
  catch(e){ authErr = authErrMsg(e.code); }

  firebase.auth().onAuthStateChanged(async user=>{
    authUser = user; authReady = true; authBusy = false;
    authDraft = {email:'', pass:'', pass2:''};
    if(user){ authErr=''; await loadCloudState(user.uid); }
    else resetLocalState();
    render();
  });
})();
