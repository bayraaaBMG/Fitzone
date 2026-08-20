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

  // Google sign-in now uses signInWithPopup() everywhere (see auth.js) —
  // it resolves synchronously within this same page load via onAuthStateChanged
  // below, no redirect round-trip needed. signInWithRedirect only still runs
  // as a last-resort fallback for environments where a popup can't open at
  // all (installed iOS PWAs). This block exists solely to finish that rare
  // fallback path correctly if it was used.
  let redirectPending = false;
  try{ redirectPending = sessionStorage.getItem('mf_google_redirect_pending')==='1'; sessionStorage.removeItem('mf_google_redirect_pending'); }catch(e){}
  if(!redirectPending && /accounts\.google\.com|firebaseapp\.com/.test(document.referrer)) redirectPending = true;
  if(redirectPending) diagLog('boot: detected possible redirect return', {referrer: document.referrer});

  let redirectUser = null;
  try{
    const res = await firebase.auth().getRedirectResult();
    redirectUser = res && res.user;
    if(redirectPending) diagLog('getRedirectResult resolved', {hasUser: !!redirectUser});
  }
  catch(e){ diagLog('getRedirectResult threw', {code: e.code, message: e.message}); authErr = authErrMsg(e.code); }

  let sawUser = false; // did ANY onAuthStateChanged firing on this load report a signed-in user?
  firebase.auth().onAuthStateChanged(async user=>{
    authBusy = false;
    authDraft = {email:'', pass:'', pass2:''};
    if(redirectPending) diagLog('onAuthStateChanged fired', {hasUser: !!user});
    if(user){
      sawUser = true;
      authUser = user; authReady = true; authErr='';
      await loadCloudState(user.uid);
      render();
      return;
    }

    // no user on this callback. Known limitation (not a timing race): this
    // app is hosted off Firebase Hosting, so authDomain is a different site
    // from this domain — browsers' third-party storage partitioning (Chrome
    // 115+/Firefox 109+/Safari 16.1+) isolates the cross-origin auth-handler
    // iframe's storage, so a redirect-based sign-in can genuinely never
    // resolve here. See https://firebase.google.com/docs/auth/web/redirect-best-practices.
    // Give it one short, bounded grace window anyway (real restores that DO
    // succeed can still take a beat), then give up cleanly.
    if(redirectPending && !sawUser && !redirectUser && !authErr){
      let settled = null;
      for(let waited=0; waited<4500 && !settled; waited+=300){
        await new Promise(r=>setTimeout(r, 300));
        settled = firebase.auth().currentUser;
      }
      if(settled){
        authUser = settled; authReady = true; authErr='';
        await loadCloudState(settled.uid);
        render();
        return;
      }
      diagLog('redirect fallback did not restore a session — giving up', {
        redirectPending, sawUser, redirectUser: !!redirectUser, currentUser: !!firebase.auth().currentUser,
      });
      authErr = (isStandalone() && isIOS()) ? t('err_ios_standalone_google') : t('err_redirect_incomplete');
    }
    authUser = null; authReady = true;
    resetLocalState();
    render();
  });
})();
