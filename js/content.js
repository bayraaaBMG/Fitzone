/* ---------- content the admins edit: exercise library + app config ----------
   exercises/{id}  overrides the built-in exercise with that id (js/data.js)
                   or adds a new one; hidden:true takes it out of the library
                   and the planner but keeps it resolvable for old plans and
                   history.
   config/app      {announce:{on, mn, en}, calc:{...}} — the Home banner and
                   the calorie algorithm's numbers (CALC_CFG, ACTIVITY_MULT,
                   CAL_FLOOR).
   Both are read by every signed-in user and written only by admins
   (firestore.rules). They are still cleaned here before use: they reach
   innerHTML, and a mistake in one admin edit must not break the app.
   The last copy is cached on the device so the edits show offline too. */

/* the shipped library, captured before any language swap or override, so
   removing an override restores the original exactly */
const EX_BUILTIN = EX.map(x => ({...x, goals: (x.goals || []).slice()}));
const EX_BUILTIN_IDS = new Set(EX_BUILTIN.map(x => x.id));
const EX_EN_BUILTIN = Object.fromEntries(Object.entries(EX_EN).map(([k, v]) => [k, {...v}]));
const CALC_DEFAULTS = {
  ...CALC_CFG,
  activity: {...ACTIVITY_MULT},
  floorM: CAL_FLOOR.m, floorF: CAL_FLOOR.f,
};

const EX_TEXT_MAX = {n: 80, tgt: 200, tech: 1200, err: 600, easy: 200, hard: 200};
const EX_LOCS = ['home', 'gym'];
const EX_MUSCLE_KEYS = ['chest', 'back', 'legs', 'glutes', 'shoulders', 'arms', 'abs', 'cardio'];
const EX_EQUIP = ['none', 'dumbbell', 'barbell', 'machine', 'cable'];
const EX_GOAL_KEYS = ['fatloss', 'muscle', 'tone', 'strength', 'health'];
const EX_ID_RE = /^[a-z0-9_-]{2,40}$/;
const EX_VIDEO_RE = /^([A-Za-z0-9_-]{11}|https:\/\/[A-Za-z0-9./_~%-]{4,300}\.(mp4|webm|gif))$/;

let EX_DOCS = {};        // id -> cleaned exercises/{id} document, as loaded
let APP_CONFIG = null;   // cleaned config/app, as loaded

const cleanTxt = (v, max) => typeof v === 'string' ? v.replace(/[<>]/g, '').slice(0, max) : undefined;
const clampNum = (v, lo, hi, d) => { const n = +v; return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function cleanExerciseDoc(d, id){
  if(!d || typeof d !== 'object' || !EX_ID_RE.test(id)) return null;
  const base = EX_BUILTIN.find(x => x.id === id) || {};
  const out = {id, hidden: d.hidden === true};
  out.n = cleanTxt(d.n, EX_TEXT_MAX.n) || base.n || id;
  out.e = cleanTxt(d.e, 16) || base.e || '🏋️';
  out.loc = EX_LOCS.includes(d.loc) ? d.loc : (base.loc || 'home');
  out.m = EX_MUSCLE_KEYS.includes(d.m) ? d.m : (base.m || 'abs');
  out.lvl = [1, 2, 3].includes(d.lvl) ? d.lvl : (base.lvl || 1);
  out.eq = EX_EQUIP.includes(d.eq) ? d.eq : (base.eq || 'none');
  out.kcal = clampNum(d.kcal, 0, 40, base.kcal || 5);
  out.video = typeof d.video === 'string' && EX_VIDEO_RE.test(d.video) ? d.video : '';
  out.goals = Array.isArray(d.goals) ? d.goals.filter(g => EX_GOAL_KEYS.includes(g)) : (base.goals || []).slice();
  for(const k of ['tgt', 'tech', 'err', 'easy', 'hard']) out[k] = cleanTxt(d[k], EX_TEXT_MAX[k]) ?? base[k] ?? '';
  const en = {};
  if(d.en && typeof d.en === 'object'){
    for(const k of Object.keys(EX_TEXT_MAX)){ const v = cleanTxt(d.en[k], EX_TEXT_MAX[k]); if(v) en[k] = v; }
  }
  if(Object.keys(en).length) out.en = en;
  return out;
}

/* rebuilds EX from the shipped library plus the loaded documents. EX keeps
   its identity (everything holds a reference to it); the Mongolian snapshot
   that applyLangLabels() swaps from is rebuilt alongside, then the current
   language is applied again. */
function applyExerciseDocs(){
  const rows = EX_BUILTIN.map(x => ({...x, goals: x.goals.slice()}));
  Object.keys(EX_EN).forEach(k => { if(!(k in EX_EN_BUILTIN)) delete EX_EN[k]; });
  Object.entries(EX_EN_BUILTIN).forEach(([k, v]) => { EX_EN[k] = {...v}; });
  for(const d of Object.values(EX_DOCS)){
    const {en, ...fields} = d;
    const i = rows.findIndex(x => x.id === d.id);
    const custom = !EX_BUILTIN_IDS.has(d.id);
    const row = {...(i >= 0 ? rows[i] : {}), ...fields, custom};
    if(i >= 0) rows[i] = row; else rows.push(row);
    if(en) EX_EN[d.id] = {...(EX_EN_BUILTIN[d.id] || {}), ...en};
  }
  EX.length = 0;
  EX.push(...rows);
  if(typeof _mnSnapshot !== 'undefined' && _mnSnapshot){
    _mnSnapshot.ex = rows.map(x => ({id: x.id, n: x.n, tgt: x.tgt, tech: x.tech, err: x.err, easy: x.easy, hard: x.hard}));
  }
  applyLangLabels();
}

/* the exercises a user is offered (library, planner). Hidden ones stay in
   EX so ex(id) still resolves for plans and history that mention them. */
function liveExercises(){ return EX.filter(x => !x.hidden); }

function cleanConfig(d){
  d = (d && typeof d === 'object') ? d : {};
  const a = (d.announce && typeof d.announce === 'object') ? d.announce : {};
  const c = (d.calc && typeof d.calc === 'object') ? d.calc : {};
  const act = (c.activity && typeof c.activity === 'object') ? c.activity : {};
  const D = CALC_DEFAULTS;
  return {
    announce: {on: a.on === true, mn: cleanTxt(a.mn, 300) || '', en: cleanTxt(a.en, 300) || ''},
    calc: {
      activity: Object.fromEntries([1, 2, 3, 4, 5].map(k => [k, clampNum(act[k], 1, 2.5, D.activity[k])])),
      deficit: clampNum(c.deficit, 0.6, 1, D.deficit),
      surplus: clampNum(c.surplus, 1, 1.3, D.surplus),
      proteinPerKg: clampNum(c.proteinPerKg, 0.8, 3, D.proteinPerKg),
      fatShare: clampNum(c.fatShare, 0.15, 0.45, D.fatShare),
      careFloor: clampNum(c.careFloor, 0.8, 1, D.careFloor),
      floorM: clampNum(c.floorM, 1000, 2500, D.floorM),
      floorF: clampNum(c.floorF, 800, 2500, D.floorF),
    },
  };
}
function applyConfig(cfg){
  APP_CONFIG = cfg;
  const c = cfg.calc;
  Object.assign(ACTIVITY_MULT, c.activity);
  CAL_FLOOR.m = c.floorM; CAL_FLOOR.f = c.floorF;
  for(const k of ['deficit', 'surplus', 'proteinPerKg', 'fatShare', 'careFloor']) CALC_CFG[k] = c[k];
}

function setExerciseDocs(raw){
  EX_DOCS = {};
  for(const [id, d] of Object.entries(raw || {})){ const c = cleanExerciseDoc(d, id); if(c) EX_DOCS[id] = c; }
  applyExerciseDocs();
}

/* the device copy first (instant, works offline), then Firestore */
async function loadRemoteContent(){
  try{
    const cached = await Store.get('mf_content');
    if(cached){ setExerciseDocs(cached.exercises); applyConfig(cleanConfig(cached.config)); }
  }catch(e){}
  if(typeof firebase === 'undefined' || !firebase.apps.length) return;
  const db = firebase.firestore();
  const [exSnap, cfgSnap] = await Promise.all([
    db.collection('exercises').get().catch(() => null),
    db.collection('config').doc('app').get().catch(() => null),
  ]);
  const cached = (await Store.get('mf_content').catch(() => null)) || {};
  const next = {exercises: cached.exercises || {}, config: cached.config || null};
  if(exSnap){
    next.exercises = {};
    exSnap.forEach(doc => { next.exercises[doc.id] = doc.data(); });
    setExerciseDocs(next.exercises);
  }
  if(cfgSnap){
    next.config = cfgSnap.exists ? cfgSnap.data() : null;
    applyConfig(cleanConfig(next.config));
  }
  await Store.set('mf_content', next);
}

/* ---------- Home announcement ---------- */
function announceText(){
  const a = APP_CONFIG && APP_CONFIG.announce;
  if(!a || !a.on) return '';
  return (S.lang === 'en' && a.en) ? a.en : (a.mn || a.en || '');
}
function announceHTML(){
  const txt = announceText();
  if(!txt) return '';
  try{ if(localStorage.getItem('mf_announce_seen') === txt) return ''; }catch(e){}
  return `<div class="note announce" id="announce"><div class="lab">📣 ${t('announce_label')}</div>
    <div style="white-space:pre-line">${esc(txt)}</div>
    <button class="btn g sm" id="announceOk" style="margin-top:10px">${t('announce_ok')}</button></div>`;
}
function wireAnnounce(root){
  const b = root.querySelector('#announceOk');
  if(!b) return;
  b.onclick = () => {
    try{ localStorage.setItem('mf_announce_seen', announceText()); }catch(e){}
    const n = root.querySelector('#announce'); if(n) n.remove();
  };
}
