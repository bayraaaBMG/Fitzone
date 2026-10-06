/* ---------- roles, the admin route, and the staff directory ----------
   Three roles above a normal account:
     owner     — OWNER_EMAIL, signed in with a verified email. Fixed in
                 firestore.rules too, so it can never be granted or revoked.
     admin     — roles/{uid}.role 'admin' (or the custom claim admin:true):
                 exercise library, app settings, users, audit log.
     moderator — roles/{uid}.role 'moderator': users and their challenges.
   Only the owner grants or revokes admin/moderator.

   Everything in this file decides what to SHOW. A user who edits this code
   in their browser can reveal the dashboard, but every read and write it
   makes is checked again by firestore.rules, which is where access is
   actually enforced. */
const OWNER_EMAIL = 'bbayraaa20@gmail.com';
const ROLE_RANK = {moderator: 1, admin: 2, owner: 3};

let authRole = null; // 'owner' | 'admin' | 'moderator' | null

function hasRole(min){ return !!authRole && ROLE_RANK[authRole] >= ROLE_RANK[min]; }
function isOwnerUser(user){
  return !!(user && user.emailVerified && String(user.email || '').toLowerCase() === OWNER_EMAIL);
}

/* resolves authRole for a freshly signed-in user. Never throws: a failed
   lookup just leaves the account without staff access. */
async function loadRole(user){
  authRole = null;
  if(!user) return;
  if(isOwnerUser(user)){ authRole = 'owner'; return; }
  try{
    const c = (await user.getIdTokenResult()).claims || {};
    if(c.role === 'owner') authRole = 'owner';
    else if(c.admin === true) authRole = 'admin';
  }catch(e){}
  if(authRole) return;
  try{
    const snap = await firebase.firestore().collection('roles').doc(user.uid).get();
    const r = snap.exists ? (snap.data() || {}).role : null;
    if(r === 'admin' || r === 'moderator') authRole = r;
  }catch(e){}
}

/* ---------- /admin route ---------- */
const ADMIN_PATH_RE = /^\/admin\/?$/;
function wantsAdminPath(){ return ADMIN_PATH_RE.test(location.pathname); }

/* keeps the address bar in step with the tab: /admin while the dashboard is
   open, /app otherwise */
function syncAdminPath(){
  const onAdmin = wantsAdminPath();
  const target = S.tab === 'admin' ? '/admin' : (onAdmin ? '/app' : null);
  if(target && location.pathname !== target){
    try{ history.replaceState(history.state, '', target + location.search + location.hash); }catch(e){}
  }
}

let _adminScript = null;
function loadAdminScript(){
  if(typeof renderAdmin === 'function') return Promise.resolve();
  if(!_adminScript){
    _adminScript = new Promise((res, rej)=>{
      const s = document.createElement('script');
      s.src = 'js/views/admin.js';
      s.onload = res;
      s.onerror = ()=>{ _adminScript = null; rej(new Error('admin.js failed to load')); };
      document.head.appendChild(s);
    });
  }
  return _adminScript;
}

/* the protected route. Not staff → back to Home; the dashboard code itself
   is fetched only for staff, so nobody else even downloads it. */
function renderAdminRoute(){
  navEl.classList.add('hidden');
  if(!hasRole('moderator')){
    S.tab = 'home';
    toast(t('adm_denied'));
    render();
    return;
  }
  if(typeof renderAdmin === 'function'){ renderAdmin(); return; }
  app.innerHTML = `<div class="view center" style="padding-top:120px"><p class="mut">${t('auth_loading')}</p></div>`;
  loadAdminScript().then(()=>{ if(S.tab === 'admin') render(); })
    .catch(()=>{ S.tab = 'home'; toast(t('toast_save_failed')); render(); });
}
function openAdmin(){ closeSheet(); S.tab = 'admin'; render(); }

/* ---------- directory card ----------
   A few fields per account in directory/{uid}, so the admin user list reads
   small documents instead of every full users/{uid}. Written by the account
   itself; skipped when nothing changed in the last few hours. */
const DIRECTORY_EVERY_MS = 6 * 3600 * 1000;
let _dirSig = null, _dirAt = 0;
function touchDirectory(){
  if(!authUser || !S.profile || cloudLoadFailed || typeof firebase === 'undefined') return;
  const p = S.profile;
  const card = {email: authUser.email || '', name: String(p.name || '').replace(/[<>]/g, '').slice(0, 60)};
  if(typeof p.goal === 'string') card.goal = p.goal.replace(/[<>]/g, '').slice(0, 30);
  if([1, 2, 3].includes(p.level)) card.level = p.level;
  if(typeof p.place === 'string') card.place = p.place.replace(/[<>]/g, '').slice(0, 30);
  if(typeof p.joinedAt === 'string' && p.joinedAt.length <= 10) card.joinedAt = p.joinedAt;
  const sig = authUser.uid + JSON.stringify(card);
  const now = Date.now();
  if(sig === _dirSig && now - _dirAt < DIRECTORY_EVERY_MS) return;
  _dirSig = sig; _dirAt = now;
  firebase.firestore().collection('directory').doc(authUser.uid)
    .set({...card, lastSeen: now}).catch(()=>{ _dirSig = null; });
}

/* ---------- audit log (append-only, see firestore.rules adminLog) ---------- */
function adminLog(action, target, note){
  if(!authUser) return Promise.resolve();
  const e = {by: authUser.uid, byEmail: authUser.email || '', action, target: String(target || '').slice(0, 128), at: Date.now()};
  if(note) e.note = String(note).replace(/[<>]/g, '').slice(0, 300);
  return firebase.firestore().collection('adminLog').add(e).catch(()=>{});
}
