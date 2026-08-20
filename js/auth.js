/* ---------- Firebase init + Auth + Firestore cloud sync ---------- */
let authUser = null;        // firebase.User | null
let authReady = false;      // true once the initial auth check resolves
let authInitError = false;  // true if Firebase itself failed to load (offline/blocked)

/* rolling diagnostic trail for the Google sign-in flow specifically —
   surfaced in the UI under the login error (see authgate.js) so a real
   failure on a real device carries actual evidence instead of a guess */
let authDiagLog = [];
function diagLog(msg, extra){
  const line = `${new Date().toISOString().slice(11,19)} ${msg}` + (extra!==undefined ? ' ' + JSON.stringify(extra) : '');
  authDiagLog.push(line);
  console.log('[GoogleAuth]', line);
}

function initFirebase(){
  if(typeof firebase==='undefined') return;
  if(!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) return;
  try{ firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
}

function usersDoc(uid){ return firebase.firestore().collection('users').doc(uid); }

function applyStateData(d){
  S.profile = d.profile || null;
  S.plan = d.plan || (d.profile ? generatePlan(d.profile) : null);
  S.weights = d.weights || [];
  S.completed = d.completed || [];
  S.completedLog = d.completedLog || {};
  S.challenge = d.challenge || null;
  S.pantry = d.pantry || [];
  S.foodLog = d.foodLog || {};
  S.waterLog = d.waterLog || {};
  S.theme = d.theme || 'dark';
  S.lang = d.lang || 'mn';
  S.tab = 'home';
  applyTheme(S.theme);
  applyLangLabels();
}
function resetLocalState(){
  S.profile=null; S.plan=null; S.weights=[]; S.completed=[]; S.completedLog={};
  S.challenge=null; S.pantry=[]; S.foodLog={}; S.waterLog={}; S.tab='home';
  // theme/lang are device/browser preferences, not account data — keep as-is on logout
}

/* pulls this account's data from Firestore; migrates any pre-login local
   draft into a brand-new account; falls back to the last-synced local
   cache if the network is unavailable */
async function loadCloudState(uid){
  const localKey = 'mf_state_'+uid;
  try{
    const snap = await usersDoc(uid).get();
    if(snap.exists){
      applyStateData(snap.data() || {});
    } else {
      resetLocalState();
      const legacy = await Store.get('mf_state');
      if(legacy && legacy.profile){
        applyStateData(legacy);
        await save();
        await Store.set('mf_state', null);
      }
    }
  }catch(e){
    const cached = await Store.get(localKey);
    if(cached && cached.profile){
      applyStateData(cached);
      toast(t('toast_offline_mode'));
    } else {
      toast(t('toast_load_error'));
    }
  }
}

function signUp(email, pass){ return firebase.auth().createUserWithEmailAndPassword(email, pass); }
function logIn(email, pass){ return firebase.auth().signInWithEmailAndPassword(email, pass); }

/* popup everywhere, including mobile — redirect only as a last-resort
   fallback when a popup genuinely can't open (e.g. installed iOS PWAs,
   which don't support window.open).

   This app is hosted on Vercel, not Firebase Hosting, so authDomain is
   the default fitzone-7f325.firebaseapp.com — a different site from
   fitzone-five-jet.vercel.app. signInWithRedirect's round trip depends on
   a hidden cross-origin iframe (from authDomain, embedded in this page)
   to read back the "redirect complete" state that Firebase's auth
   handler wrote during the full-page visit to that domain. Since Chrome
   115+ / Firefox 109+ / Safari 16.1+ all now partition iframe storage per
   top-level site, that iframe's storage bucket when embedded here is NOT
   the same bucket the full-page authDomain visit wrote to — so
   getRedirectResult() legitimately, deterministically returns no user on
   real devices. This is a known Firebase limitation for apps not hosted
   on Firebase Hosting with a matching custom domain (see
   https://firebase.google.com/docs/auth/web/redirect-best-practices,
   "Option 2: switch to signInWithPopup"), not a timing race — no amount
   of waiting after the redirect fixes it. signInWithPopup avoids the
   problem entirely: the whole exchange happens via postMessage while the
   popup is open in the same page load, with no cross-origin storage
   read-back required. */
function googleSignIn(){
  const provider = new firebase.auth.GoogleAuthProvider();
  const persistence = firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  diagLog('googleSignIn: attempting signInWithPopup', {isMobile: isMobile(), isStandalone: isStandalone()});
  return persistence.then(()=> firebase.auth().signInWithPopup(provider)).catch(e=>{
    diagLog('signInWithPopup failed', {code: e.code, message: e.message});
    if(e.code==='auth/popup-blocked' || e.code==='auth/operation-not-supported-in-this-environment'){
      diagLog('falling back to signInWithRedirect (popup unavailable in this environment)');
      try{ sessionStorage.setItem('mf_google_redirect_pending', '1'); }catch(err){}
      return firebase.auth().signInWithRedirect(provider);
    }
    throw e;
  });
}

async function logOut(){
  const uid = authUser && authUser.uid;
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
  };
  return map[code] || t('autherr_generic');
}
