const CACHE = 'mongolfit-v2';
const ASSETS = [
  './', './Fitzone.html', './css/style.css',
  './js/firebase-config.js','./js/upload.js',
  './js/data.js','./js/foods.js','./js/state.js','./js/planner.js','./js/core.js',
  './js/views/onboard.js','./js/views/home.js','./js/views/exercise.js',
  './js/views/plan.js','./js/views/library.js','./js/views/progress.js','./js/views/nutrition.js',
  './js/views/settings.js','./js/app.js','./manifest.json'
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
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
});
