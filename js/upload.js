/* ---------- Firebase init + Storage (хоолны зураг хадгалах) ---------- */
function initFirebase(){
  if(typeof firebase==='undefined') return;
  if(!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) return;
  try{ firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
}

/* the Firebase Storage SDK retries a stuck/blocked upload (e.g. CORS
   misconfig, flaky network) near-indefinitely with no rejection —
   race it against a hard timeout so the caller always settles */
function uploadMealPhoto(file){
  if(!authUser) return Promise.reject(new Error('Нэвтрээгүй байна'));
  const name = `meals/${authUser.uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const ref = firebase.storage().ref(name);
  const task = ref.put(file);
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>{ task.cancel(); reject(new Error('upload-timeout')); }, 20000);
    task.then(()=>ref.getDownloadURL())
      .then(url=>{ clearTimeout(timer); resolve(url); })
      .catch(e=>{ clearTimeout(timer); reject(e); });
  });
}
