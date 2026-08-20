const CACHE = 'mongolfit-v8';
// never intercept Google/Firebase auth traffic — this SW's own fetch()
// re-issue + cache-fallback has no business anywhere near the sign-in
// handshake, so these are left to the browser's default handling untouched
const AUTH_HOST_RE = /^https:\/\/([^/]+\.)?(google\.com|googleapis\.com|googleusercontent\.com|gstatic\.com|firebaseapp\.com|web\.app)\//;
const ASSETS = [
  './', './Fitzone.html', './css/style.css',
  './js/firebase-config.js',
  './js/data.js','./js/foods.js','./js/i18n.js','./js/state.js','./js/planner.js','./js/auth.js','./js/core.js',
  './js/views/authgate.js','./js/views/onboard.js','./js/views/home.js','./js/views/exercise.js',
  './js/views/plan.js','./js/views/library.js','./js/views/progress.js','./js/views/nutrition.js',
  './js/views/settings.js','./js/views/profile.js','./js/app.js','./manifest.json'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  if(e.request.method !== 'GET') return;
  if(AUTH_HOST_RE.test(e.request.url)) return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(e.request, copy));
      return res;
    }).catch(()=> caches.match(e.request))
  );
});
