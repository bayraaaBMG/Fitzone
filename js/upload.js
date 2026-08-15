/* ---------- Firebase init + Storage (хоолны зураг хадгалах) ---------- */
function initFirebase(){
  if(typeof firebase==='undefined') return;
  if(!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) return;
  try{ firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
}

function uploadMealPhoto(file){
  if(!authUser) return Promise.reject(new Error('Нэвтрээгүй байна'));
  const name = `meals/${authUser.uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const ref = firebase.storage().ref(name);
  return ref.put(file).then(()=>ref.getDownloadURL());
}
