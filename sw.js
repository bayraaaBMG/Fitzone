const CACHE = 'mongolfit-v31';
// the pose model/runtime (MediaPipe on jsDelivr, model on storage.googleapis.com)
// is multi-MB and opt-in only — leave it to the browser's HTTP cache, never this SW
const HEAVY_HOST_RE = /^https:\/\/cdn\.jsdelivr\.net\//;
// never intercept Google/Firebase auth traffic — this SW's own fetch()
// re-issue + cache-fallback has no business anywhere near the sign-in
// handshake, so these are left to the browser's default handling untouched
// published AI V2 models are large and opt-in: same-origin, but left to the
// browser's HTTP cache so a workout never waits on a stale precached model
const MODEL_PATH_RE = /\/models\//;
// exercise clips are hundreds of KB and served as range requests, which a Cache
// cannot hold (a 206 is not storable) - the browser's HTTP cache does this job
// properly, so the service worker keeps its hands off them
const MEDIA_PATH_RE = /\.(mp4|webm|mov|m4v)$/i;
const AUTH_HOST_RE = /^https:\/\/([^/]+\.)?(google\.com|googleapis\.com|googleusercontent\.com|gstatic\.com|firebaseapp\.com|web\.app)\//;
const ASSETS = [
  './MongolFit.html', './app', './css/style.css', './css/workout.css',
  './js/firebase-config.js',
  './js/data.js','./js/coach-data.js','./js/foods.js','./js/i18n.js','./js/references.js','./js/food-photos.js','./js/food-videos.js','./js/food-advice.js','./js/dates.js','./js/state.js','./js/planner.js','./js/onboard-calc.js','./js/content.js',
  './js/pose-rules.js','./js/records.js','./js/ex-photos.js','./js/ex-videos.js','./js/muscle-data.js','./js/recovery.js','./js/suggest.js','./js/ai/ml-features.js','./js/ai/ml-runtime.js','./js/ai/ai-v2.js','./js/pose.js','./js/auth.js','./js/roles.js','./js/core.js',
  './js/views/authgate.js','./js/views/onboard.js','./js/views/home.js','./js/views/musclemap.js','./js/views/exercise.js','./js/views/workout.js',
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
  const p = new URL(e.request.url).pathname;
  if(MODEL_PATH_RE.test(p) || MEDIA_PATH_RE.test(p)) return;
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
