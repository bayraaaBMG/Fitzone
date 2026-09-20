const CACHE = 'mongolfit-v13';
// the pose model/runtime (MediaPipe on jsDelivr, model on storage.googleapis.com)
// is multi-MB and opt-in only — leave it to the browser's HTTP cache, never this SW
const HEAVY_HOST_RE = /^https:\/\/cdn\.jsdelivr\.net\//;
// never intercept Google/Firebase auth traffic — this SW's own fetch()
// re-issue + cache-fallback has no business anywhere near the sign-in
// handshake, so these are left to the browser's default handling untouched
// published AI V2 models are large and opt-in: same-origin, but left to the
// browser's HTTP cache so a workout never waits on a stale precached model
const MODEL_PATH_RE = /\/models\//;
const AUTH_HOST_RE = /^https:\/\/([^/]+\.)?(google\.com|googleapis\.com|googleusercontent\.com|gstatic\.com|firebaseapp\.com|web\.app)\//;
const ASSETS = [
  './', './Fitzone.html', './css/style.css', './css/workout.css',
  './js/firebase-config.js',
  './js/data.js','./js/coach-data.js','./js/foods.js','./js/i18n.js','./js/references.js','./js/dates.js','./js/state.js','./js/planner.js',
  './js/pose-rules.js','./js/records.js','./js/ai/ml-features.js','./js/ai/ml-runtime.js','./js/ai/ai-v2.js','./js/pose.js','./js/auth.js','./js/core.js',
  './js/views/authgate.js','./js/views/onboard.js','./js/views/home.js','./js/views/exercise.js','./js/views/workout.js',
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
  if(AUTH_HOST_RE.test(e.request.url) || HEAVY_HOST_RE.test(e.request.url)) return;
  if(MODEL_PATH_RE.test(new URL(e.request.url).pathname)) return;
  e.respondWith(
    fetch(e.request).then(res=>{
      // only cache successful same-origin app files — never error pages or third-party responses
      if(res.ok && new URL(e.request.url).origin===self.location.origin){
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
      }
      return res;
    }).catch(()=> caches.match(e.request))
  );
});
