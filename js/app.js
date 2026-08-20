/* ---------- boot ---------- */
(async function init(){
  initFirebase();
  // applyStateData() (which normally sets the theme) only runs once a
  // Firestore doc is actually loaded — a brand-new session (auth gate,
  // onboarding, right up to the first save()) would otherwise never get an
  // explicit data-theme attribute and silently fall back to the browser's
  // prefers-color-scheme instead of the intended dark default. The inline
  // <head> script already applies any locally-cached choice pre-paint;
  // mirror that same cached value into S.theme here (falling back to the
  // hardcoded 'dark' default only if this device has never cached one) so
  // this call can't override what was already painted and cause a flash.
  try{ const cached = localStorage.getItem('mf_theme'); if(cached) S.theme = cached; }catch(e){}
  applyTheme(S.theme);
  applyLangLabels();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  render(); // auth-loading splash until the session check below resolves

  if(typeof firebase==='undefined' || !firebase.apps.length){
    authInitError = true; authReady = true;
    render();
    return;
  }

  // Google sign-in is popup-only now (see auth.js) — it resolves
  // synchronously within this same page load via onAuthStateChanged below.
  // signInWithRedirect is no longer used anywhere in this app, so there is
  // no redirect round-trip left to reconcile on boot. Clear out any stale
  // pending-redirect flag a previous app version may have left behind, so
  // it can never be read or acted on by anything.
  try{ sessionStorage.removeItem('mf_google_redirect_pending'); }catch(e){}

  // getRedirectResult() is kept ONLY in case some already-open tab is mid a
  // redirect started by a now-removed code path (or a browser-cached old
  // version of this app) — it is never used to decide success or failure,
  // and a null result here is completely normal and expected on every
  // regular page load, not an error condition.
  try{
    const res = await firebase.auth().getRedirectResult();
    if(res && res.user) diagLog('getRedirectResult: found a stray pending sign-in from a stale/legacy redirect', {uid: res.user.uid});
  }catch(e){ diagLog('getRedirectResult threw (harmless, ignored)', {code: e.code, message: e.message}); }

  // onAuthStateChanged is the single source of truth for auth state — no
  // extra grace periods, polling, or redirect-specific branching.
  firebase.auth().onAuthStateChanged(async user=>{
    authBusy = false;
    authDraft = {email:'', pass:'', pass2:''};
    if(user){
      authUser = user; authReady = true; authErr='';
      await loadCloudState(user.uid);
      render();
      return;
    }
    authUser = null; authReady = true;
    resetLocalState();
    render();
  });
})();
