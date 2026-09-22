/* ---------- Firebase init + Auth + Firestore cloud sync ---------- */
let authUser = null;        // firebase.User | null
let authReady = false;      // true once the initial auth check resolves
let authInitError = false;  // true if Firebase itself failed to load (offline/blocked)

/* Debug mode is opt-in: open the site once with ?debug=1 (persists on this
   device, ?debug=0 turns it off). Only then is the Google sign-in trail
   logged to the console and shown under login errors — normal users never
   see diagnostics. */
const FZ_DEBUG = (()=>{ try{
  if(/[?&]debug=1(&|$)/.test(location.search)) localStorage.setItem('mf_debug','1');
  if(/[?&]debug=0(&|$)/.test(location.search)) localStorage.removeItem('mf_debug');
  return localStorage.getItem('mf_debug')==='1';
}catch(e){ return false; } })();
let authDiagLog = [];
function diagLog(msg, extra){
  if(!FZ_DEBUG) return;
  const line = `${new Date().toISOString().slice(11,19)} ${msg}` + (extra!==undefined ? ' ' + JSON.stringify(extra) : '');
  authDiagLog.push(line);
  console.log('[GoogleAuth]', line);
}
/* embedded in-app browsers (Instagram, Facebook, LINE, KakaoTalk, TikTok, Android WebView)
   are refused by Google sign-in ("disallowed_useragent") — warn before the user tries */
function isInAppBrowser(){ return /FBAN|FBAV|Instagram|Line\/|KAKAOTALK|Snapchat|TikTok|musical_ly|; wv\)/i.test(navigator.userAgent||''); }

function initFirebase(){
  if(typeof firebase==='undefined') return;
  if(!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) return;
  try{ firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
}

function usersDoc(uid){ return firebase.firestore().collection('users').doc(uid); }

/* The Firestore doc / local cache is writable only by its owner, but it is
   still untrusted input for rendering: coerce types so a malformed or
   hand-edited document can't crash a view or smuggle markup into
   attributes. Valid data passes through unchanged. */
const asArr = v => Array.isArray(v) ? v : [];
const asObj = v => (v && typeof v==='object' && !Array.isArray(v)) ? v : {};
const asNum = (v, d=0) => { const n = +v; return isFinite(n) ? n : d; };
function cleanProfile(p){
  if(!p || typeof p!=='object' || Array.isArray(p)) return null;
  const out = {...p,
    name: String(p.name==null ? '' : p.name).slice(0,60),
    age: asNum(p.age, 25), height: asNum(p.height, 170), weight: asNum(p.weight, 70),
    days: Math.min(6, Math.max(2, Math.round(asNum(p.days, 3)))), minutes: asNum(p.minutes, 30),
    level: [1,2,3].includes(+p.level) ? +p.level : 1,
    equip: asArr(p.equip).filter(e=>typeof e==='string'),
  };
  // only our own canvas-generated image data URLs may reach an <img src>
  if(!(typeof p.photo==='string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.photo))) delete out.photo;
  return out;
}
function cleanFoodLog(fl){
  const out = {};
  for(const [d, day] of Object.entries(asObj(fl))){
    const o = {};
    ['breakfast','lunch','dinner','snack'].forEach(slot=>{
      o[slot] = asArr(asObj(day)[slot]).filter(i=>i && typeof i==='object').map(i=>{
        const c = {...i, n:String(i.n==null?'':i.n).slice(0,80), kcal:asNum(i.kcal), protein:asNum(i.protein), carb:asNum(i.carb), fat:asNum(i.fat)};
        if(typeof c.photo!=='string') delete c.photo;
        return c;
      });
    });
    out[d] = o;
  }
  return out;
}
function applyStateData(d){
  d = asObj(d);
  S.profile = cleanProfile(d.profile);
  const planOk = Array.isArray(d.plan) && d.plan.length && d.plan.every(x=>x && Array.isArray(x.ex));
  S.plan = planOk ? d.plan : (S.profile ? generatePlan(S.profile) : null);
  S.weights = asArr(d.weights).filter(w=>w && typeof w.d==='string' && isFinite(+w.kg)).map(w=>({d:w.d, kg:+w.kg}));
  S.completed = asArr(d.completed).filter(x=>typeof x==='string');
  S.completedLog = asObj(d.completedLog);
  S.challenge = (d.challenge && typeof d.challenge.start==='string') ? {start:d.challenge.start, done:asArr(d.challenge.done).filter(x=>typeof x==='string')} : null;
  S.pantry = asArr(d.pantry).filter(x=>typeof x==='string');
  S.foodLog = cleanFoodLog(d.foodLog);
  S.waterLog = Object.fromEntries(Object.entries(asObj(d.waterLog)).map(([k,v])=>[k, asNum(v)]));
  S.theme = ['dark','light','system'].includes(d.theme) ? d.theme : 'dark';
  S.lang = ['mn','en'].includes(d.lang) ? d.lang : 'mn';
  try{ localStorage.setItem('mf_lang', S.lang); }catch(e){}
  S.exStats = Object.fromEntries(Object.entries(asObj(d.exStats)).filter(([,v])=>v && typeof v==='object'));
  S.workoutResults = asArr(d.workoutResults).filter(r=>r && typeof r==='object');
  S.tab = 'home';
  applyTheme(S.theme);
  applyLangLabels();
}
function resetLocalState(){
  S.profile=null; S.plan=null; S.weights=[]; S.completed=[]; S.completedLog={};
  S.challenge=null; S.pantry=[]; S.foodLog={}; S.waterLog={}; S.tab='home';
  S.exStats={}; S.workoutResults=[];
  // theme/lang are device/browser preferences, not account data — keep as-is on logout
}

/* pulls this account's data from Firestore; migrates any pre-login local
   draft into a brand-new account; falls back to the last-synced local
   cache if the network is unavailable.
   With no local copy to show, a failed read (e.g. the SDK's transport
   dropping a request — the intermittent "Listen/channel 400" in the
   console) is retried with a short backoff. If it still fails the app shows
   a retry screen instead of onboarding, because onboarding would save a
   fresh empty profile over the real cloud document. A load that finishes
   after the user signed out or switched accounts is discarded. */
let cloudLoadFailed = false;
let _cloudLoadSeq = 0;
const CLOUD_RETRY_MS = [700, 2000];
async function loadCloudState(uid){
  const seq = ++_cloudLoadSeq;
  const stale = () => seq!==_cloudLoadSeq || !authUser || authUser.uid!==uid;
  cloudLoadFailed = false;
  const cached = await Store.get('mf_state_'+uid);
  let snap = null;
  for(let attempt=0; ; attempt++){
    try{ snap = await usersDoc(uid).get(); break; }
    catch(e){
      if(stale()) return;
      const permanent = e && (e.code==='permission-denied' || e.code==='unauthenticated');
      if((cached && cached.profile) || permanent || attempt>=CLOUD_RETRY_MS.length || navigator.onLine===false) break;
      await new Promise(r=>setTimeout(r, CLOUD_RETRY_MS[attempt]));
      if(stale()) return;
    }
  }
  if(stale()) return;
  if(snap){
    if(snap.exists){
      applyStateData(snap.data() || {});
    } else {
      resetLocalState();
      const legacy = await Store.get('mf_state');
      if(stale()) return;
      if(legacy && legacy.profile){
        applyStateData(legacy);
        await save();
        await Store.set('mf_state', null);
      }
    }
  } else if(cached && cached.profile){
    applyStateData(cached);
    toast(t('toast_offline_mode'));
  } else {
    cloudLoadFailed = true;
  }
}

function signUp(email, pass){ return firebase.auth().createUserWithEmailAndPassword(email, pass); }
function logIn(email, pass){ return firebase.auth().signInWithEmailAndPassword(email, pass); }

/* popup-only, on every platform — signInWithRedirect is deliberately NOT
   used as a fallback, on this app, ever.

   This app is hosted on Vercel, not Firebase Hosting, so authDomain is
   the default fitzone-7f325.firebaseapp.com — a different site from
   fitzone-five-jet.vercel.app. signInWithRedirect's round trip depends on
   a hidden cross-origin iframe (from authDomain, embedded in this page)
   to read back the "redirect complete" state that Firebase's auth
   handler wrote during the full-page visit to that domain. Chrome 115+ /
   Firefox 109+ / Safari 16.1+ all now partition that iframe's storage per
   top-level site, so the bucket it can read from here is NOT the bucket
   the full-page authDomain visit wrote to moments earlier —
   getRedirectResult() legitimately, deterministically returns no user on
   real devices, confirmed on real hardware. This is a known, current
   Firebase limitation for apps not hosted on Firebase Hosting with a
   matching custom domain (see
   https://firebase.google.com/docs/auth/web/redirect-best-practices,
   "Option 2: switch to signInWithPopup") — not a timing race, so no
   grace period or retry fixes it, and falling back to it from a failed
   popup would just trade one broken flow for another, silently. If
   signInWithPopup can't open here (blocked, or an environment that
   doesn't support window.open, e.g. an installed iOS PWA), we surface
   that plainly instead — see authErrMsg's 'popup-unavailable' case. */
function googleSignIn(){
  const provider = new firebase.auth.GoogleAuthProvider();
  const persistence = firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  diagLog('googleSignIn: attempting signInWithPopup', {isMobile: isMobile(), isStandalone: isStandalone()});
  return persistence.then(()=> firebase.auth().signInWithPopup(provider)).catch(e=>{
    diagLog('signInWithPopup failed', {code: e.code, message: e.message});
    if(e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment'){
      const err = new Error('Google sign-in popup unavailable in this browser/environment');
      err.code = 'popup-unavailable';
      throw err;
    }
    throw e;
  });
}

async function logOut(){
  const uid = authUser && authUser.uid;
  _cloudLoadSeq++; cloudLoadFailed = false; // drop any load still in flight
  await firebase.auth().signOut();
  if(uid) await Store.set('mf_state_'+uid, null);
}
function resetPassword(email){ return firebase.auth().sendPasswordResetEmail(email); }

function authErrMsg(code){
  const map = {
    'auth/email-already-in-use': t('autherr_email_in_use'),
    'auth/invalid-email': t('autherr_invalid_email'),
    'auth/weak-password': t('autherr_weak_password'),
    'auth/user-not-found': t('autherr_user_not_found'),
    'auth/wrong-password': t('autherr_wrong_password'),
    'auth/operation-not-allowed': t('autherr_operation_not_allowed'),
    'auth/invalid-credential': t('autherr_invalid_credential'),
    'auth/too-many-requests': t('autherr_too_many_requests'),
    'auth/network-request-failed': t('autherr_network'),
    'auth/popup-closed-by-user': t('autherr_popup_closed'),
    'auth/cancelled-popup-request': t('autherr_cancelled'),
    'auth/account-exists-with-different-credential': t('autherr_account_exists'),
    'auth/unauthorized-domain': t('autherr_unauthorized_domain'),
    'popup-unavailable': t('autherr_popup_unavailable'),
    'auth/invalid-login-credentials': t('autherr_invalid_credential'),
    'auth/web-storage-unsupported': t('autherr_storage'),
    'auth/user-disabled': t('autherr_user_disabled'),
    'auth/internal-error': t('autherr_retry'),
    'auth/timeout': t('autherr_timeout'),
    'auth/user-token-expired': t('autherr_session_expired'),
    'auth/id-token-expired': t('autherr_session_expired'),
    'auth/requires-recent-login': t('autherr_session_expired'),
    'auth/missing-password': t('err_fill_email_pass'),
    'auth/missing-email': t('err_fill_email_pass'),
  };
  return map[code] || t('autherr_generic');
}
