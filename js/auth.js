/* ---------- Firebase Auth + Firestore cloud sync ---------- */
let authUser = null;        // firebase.User | null
let authReady = false;      // true once the initial auth check resolves
let authInitError = false;  // true if Firebase itself failed to load (offline/blocked)

function usersDoc(uid){ return firebase.firestore().collection('users').doc(uid); }

function applyStateData(d){
  S.profile = d.profile || null;
  S.plan = d.plan || (d.profile ? generatePlan(d.profile) : null);
  S.weights = d.weights || [];
  S.completed = d.completed || [];
  S.challenge = d.challenge || null;
  S.pantry = d.pantry || [];
  S.foodLog = d.foodLog || {};
  S.tab = 'home';
}
function resetLocalState(){
  S.profile=null; S.plan=null; S.weights=[]; S.completed=[];
  S.challenge=null; S.pantry=[]; S.foodLog={}; S.tab='home';
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
      toast('Офлайн горим — сүүлд хадгалсан өгөгдөл харагдаж байна');
    } else {
      toast('Дата ачаалахад алдаа гарлаа. Холболтоо шалгаарай.');
    }
  }
}

function signUp(email, pass){ return firebase.auth().createUserWithEmailAndPassword(email, pass); }
function logIn(email, pass){ return firebase.auth().signInWithEmailAndPassword(email, pass); }
async function logOut(){
  const uid = authUser && authUser.uid;
  await firebase.auth().signOut();
  if(uid) await Store.set('mf_state_'+uid, null);
}
function resetPassword(email){ return firebase.auth().sendPasswordResetEmail(email); }

function authErrMsg(code){
  const map = {
    'auth/email-already-in-use': 'Энэ имэйл хаяг бүртгэлтэй байна. Нэвтэрч үзнэ үү.',
    'auth/invalid-email': 'Имэйл хаяг буруу байна.',
    'auth/weak-password': 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.',
    'auth/user-not-found': 'Ийм имэйлтэй хэрэглэгч олдсонгүй.',
    'auth/wrong-password': 'Нууц үг буруу байна.',
    'auth/invalid-credential': 'Имэйл эсвэл нууц үг буруу байна.',
    'auth/too-many-requests': 'Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.',
    'auth/network-request-failed': 'Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.',
  };
  return map[code] || 'Алдаа гарлаа. Дахин оролдоно уу.';
}
