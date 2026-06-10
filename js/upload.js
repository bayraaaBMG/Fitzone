/* ---------- Firebase Storage: хоолны зураг хадгалах ---------- */
let fbReady=false;

function initFirebase(){
  if(typeof firebase==='undefined') return;
  if(!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) return;
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().signInAnonymously()
      .then(()=>{ fbReady=true; })
      .catch(()=>{ fbReady=false; });
  }catch(e){ fbReady=false; }
}

function uploadMealPhoto(file){
  if(!fbReady) return Promise.reject(new Error('Firebase тохируулагдаагүй байна'));
  const name = `meals/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const ref = firebase.storage().ref(name);
  return ref.put(file).then(()=>ref.getDownloadURL());
}
