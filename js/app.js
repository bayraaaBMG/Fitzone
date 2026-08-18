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

  // was this load returning from a signInWithRedirect() round-trip?
  let redirectPending = false;
  try{ redirectPending = sessionStorage.getItem('mf_google_redirect_pending')==='1'; sessionStorage.removeItem('mf_google_redirect_pending'); }catch(e){}

  // resolve any pending Google redirect-based sign-in (and surface its error,
  // if any) before the auth-state listener starts clearing authErr on its own
  let redirectUser = null;
  try{ const res = await firebase.auth().getRedirectResult(); redirectUser = res && res.user; }
  catch(e){ authErr = authErrMsg(e.code); }

  firebase.auth().onAuthStateChanged(async user=>{
    authUser = user; authReady = true; authBusy = false;
    authDraft = {email:'', pass:'', pass2:''};
    if(user){
      authErr='';
      await loadCloudState(user.uid);
    } else {
      resetLocalState();
      // redirect round-trip completed but no session came back — the
      // account picker likely succeeded on Google's side but the browser
      // (commonly mobile Safari's storage partitioning) lost the result;
      // say so plainly instead of silently dumping the user back at login
      if(redirectPending && !redirectUser && !authErr){
        authErr = 'Google-ээр нэвтрэх дуусаагүй байна — дахин оролдоно уу, эсвэл имэйлээр нэвтэрнэ үү.';
      }
    }
    render();
  });
})();
