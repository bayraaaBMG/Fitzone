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

  // was this load returning from a signInWithRedirect() round-trip? Trust
  // sessionStorage but also fall back to document.referrer, in case Safari's
  // storage partitioning dropped the flag across the cross-origin bounce
  // through accounts.google.com / the firebaseapp.com auth handler.
  let redirectPending = false;
  try{ redirectPending = sessionStorage.getItem('mf_google_redirect_pending')==='1'; sessionStorage.removeItem('mf_google_redirect_pending'); }catch(e){}
  if(!redirectPending && /accounts\.google\.com|firebaseapp\.com/.test(document.referrer)) redirectPending = true;

  // resolve any pending Google redirect-based sign-in (and surface its real
  // error, if any) before the auth-state listener starts clearing authErr —
  // but a null result here is NOT proof of failure: getRedirectResult()'s
  // promise and the persisted-session restore that drives onAuthStateChanged
  // are two separate internal mechanisms that don't always settle in lockstep
  // (most visible on Safari), so a null redirect result plus a still-empty
  // currentUser right after is checked again below with a short grace period
  // before we ever tell the user it failed.
  let redirectUser = null;
  try{ const res = await firebase.auth().getRedirectResult(); redirectUser = res && res.user; }
  catch(e){ authErr = authErrMsg(e.code); }

  let sawUser = false; // did ANY onAuthStateChanged firing on this load report a signed-in user?
  firebase.auth().onAuthStateChanged(async user=>{
    authBusy = false;
    authDraft = {email:'', pass:'', pass2:''};
    if(user){
      sawUser = true;
      authUser = user; authReady = true; authErr='';
      await loadCloudState(user.uid);
      render();
      return;
    }

    // no user on this callback. If we're mid-redirect-restore, give Firebase
    // one more short beat to finish reconciling currentUser before we
    // conclude the round-trip genuinely lost the session — never flash the
    // login gate as "failed" while restore may still be in flight.
    if(redirectPending && !sawUser && !redirectUser && !authErr){
      await new Promise(r=>setTimeout(r, 1200));
      const settled = firebase.auth().currentUser;
      if(settled){
        authUser = settled; authReady = true; authErr='';
        await loadCloudState(settled.uid);
        render();
        return;
      }
      authErr = (isStandalone() && isIOS()) ? t('err_ios_standalone_google') : t('err_redirect_incomplete');
    }
    authUser = null; authReady = true;
    resetLocalState();
    render();
  });
})();
