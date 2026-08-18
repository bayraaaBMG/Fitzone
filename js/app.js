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
      authErr = (isStandalone() && isIOS())
        ? 'Суулгасан апп дээр Google-ээр нэвтрэх зарим үед бүтэлгүйтдэг (iOS-ийн хязгаарлалт). Safari дээрээ шууд нээгээд эсвэл имэйлээр нэвтэрнэ үү.'
        : 'Google-ээр нэвтрэх дуусаагүй байна — дахин оролдоно уу, эсвэл имэйлээр нэвтэрнэ үү.';
    }
    authUser = null; authReady = true;
    resetLocalState();
    render();
  });
})();
