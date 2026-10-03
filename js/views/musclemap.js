/* ---------- SVG muscle map ----------
   A simplified front and back figure, drawn here rather than imported so the
   regions can be addressed one by one and there is no third-party asset or
   licence involved. Each region carries data-muscle, so the same markup works
   for "these are the muscles this exercise works" and for "this is how
   recovered each muscle is".

   Regions are deliberately schematic: enough to read at 150px wide on a
   phone, not an anatomy chart. */

/* Geometry, on a 100 x 170 grid. The body is assembled from simple rounded
   parts so the muscle regions line up with it; `rr` builds a rounded-rect
   path. Both views share the silhouette — it is symmetric front to back. */
function rr(x, y, w, h, r){
  return `M${x+r} ${y} h${w-2*r} a${r} ${r} 0 0 1 ${r} ${r} v${h-2*r} a${r} ${r} 0 0 1 ${-r} ${r} h${-(w-2*r)} a${r} ${r} 0 0 1 ${-r} ${-r} v${-(h-2*r)} a${r} ${r} 0 0 1 ${r} ${-r} z`;
}

const MUSCLE_BODY_PARTS = [
  rr(46, 19, 8, 8, 3),                                   // neck
  'M34 26 h32 q5 0 5 5 l-3 33 q-1 6 -6 6 h-24 q-5 0 -6 -6 l-3 -33 q0 -5 5 -5 z',  // torso
  rr(37, 68, 26, 18, 6),                                 // hips
  rr(23, 28, 10, 31, 5), rr(67, 28, 10, 31, 5),          // upper arms
  rr(22, 57, 9, 27, 4), rr(69, 57, 9, 27, 4),            // forearms
  rr(24, 83, 7, 8, 3),   rr(69, 83, 7, 8, 3),            // hands
  rr(37, 84, 12, 40, 6), rr(51, 84, 12, 40, 6),          // thighs
  rr(38, 122, 10, 33, 5), rr(52, 122, 10, 33, 5),        // calves
  rr(36, 153, 12, 7, 3), rr(52, 153, 12, 7, 3),          // feet
];
const MUSCLE_BODY_HEAD = {cx:50, cy:12, r:8};

const MUSCLE_SHAPES = {
  front: {
    shoulders: [rr(24, 28, 9, 12, 4), rr(68, 28, 9, 12, 4)],
    chest:     [rr(36, 31, 13, 14, 4), rr(51, 31, 13, 14, 4)],
    biceps:    [rr(24, 42, 9, 16, 4), rr(68, 42, 9, 16, 4)],
    abs:       [rr(44, 47, 12, 20, 4)],
    obliques:  [rr(37, 48, 6, 18, 3), rr(57, 48, 6, 18, 3)],
    quads:     [rr(38, 86, 10, 32, 5), rr(52, 86, 10, 32, 5)],
    calves:    [rr(39, 124, 8, 25, 4), rr(53, 124, 8, 25, 4)],
  },
  back: {
    traps:     [rr(38, 27, 24, 13, 5)],
    lats:      [rr(35, 41, 12, 24, 4), rr(53, 41, 12, 24, 4)],
    triceps:   [rr(24, 42, 9, 17, 4), rr(68, 42, 9, 17, 4)],
    glutes:    [rr(38, 69, 11, 15, 5), rr(51, 69, 11, 15, 5)],
    hams:      [rr(38, 86, 10, 32, 5), rr(52, 86, 10, 32, 5)],
    calves:    [rr(39, 124, 8, 25, 4), rr(53, 124, 8, 25, 4)],
  },
};

/* the plain silhouette every view is drawn on */
function muscleBodySVG(bodyFill, lineFill){
  return `<circle cx="${MUSCLE_BODY_HEAD.cx}" cy="${MUSCLE_BODY_HEAD.cy}" r="${MUSCLE_BODY_HEAD.r}" fill="${bodyFill}" stroke="${lineFill}" stroke-width="1"/>`
    + MUSCLE_BODY_PARTS.map(d => `<path d="${d}" fill="${bodyFill}" stroke="${lineFill}" stroke-width="1"/>`).join('');
}

/* opts: {fill(muscle) -> css color, label(muscle) -> string|null, title} */
function muscleMapSVG(opts){
  const o = opts || {};
  const view = side => {
    const shapes = MUSCLE_SHAPES[side];
    const parts = Object.keys(shapes).map(m => {
      const fill = o.fill ? o.fill(m) : 'none';
      if(!fill || fill === 'none') return '';
      return shapes[m].map(d => `<path d="${d}" fill="${fill}" data-muscle="${m}"/>`).join('');
    }).join('');
    return `<svg class="mmap" viewBox="0 0 100 170" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">
      ${muscleBodySVG('var(--mmap-body)', 'var(--mmap-line)')}
      ${parts}
    </svg>`;
  };
  return `<div class="mmap-wrap" role="img" aria-label="${esc(o.title || '')}">${view('front')}${view('back')}</div>`;
}

/* ---------- per-exercise illustration ----------
   The same figure as the recovery map, but highlighting what this exercise
   works: primary muscles solid, assisting muscles faint. Drawn here, so every
   exercise has a picture with no third-party asset and no licence to honour.
   Front or back view is chosen by where the primary muscles actually are. */

const MUSCLE_SIDE = {
  chest:'front', shoulders:'front', biceps:'front', abs:'front', obliques:'front',
  quads:'front', calves:'front', traps:'back', lats:'back', triceps:'back',
  glutes:'back', hams:'back',
};

function exerciseFigureSides(m){
  const sides = new Set(m.pri.map(x => MUSCLE_SIDE[x]).filter(Boolean));
  if(!sides.size) sides.add('front');
  // show the other side too when an assisting muscle lives there and there is room
  if(sides.size === 1 && m.sec.some(x => MUSCLE_SIDE[x] && !sides.has(MUSCLE_SIDE[x])))
    sides.add(m.sec.map(x => MUSCLE_SIDE[x]).find(s => s && !sides.has(s)));
  return [...sides];
}

/* opts: {size:'thumb'|'hero', showLabel:boolean} */
function exerciseFigureSVG(exId, opts){
  const o = opts || {};
  const m = typeof exMuscles === 'function' ? exMuscles(exId) : null;
  const x = typeof ex === 'function' ? ex(exId) : null;
  if(!m) return `<span class="exfig-fallback" aria-hidden="true">${x ? x.e : ''}</span>`;
  const pri = new Set(m.pri), sec = new Set(m.sec);
  const fill = mus => pri.has(mus) ? 'var(--fig-pri)' : sec.has(mus) ? 'var(--fig-sec)' : 'none';
  const sides = exerciseFigureSides(m);
  const names = [...m.pri, ...m.sec].map(k => MUSCLE_NAMES[k]).join(', ');
  const label = t('fig_alt', x ? x.n : '', names);
  const view = side => {
    const shapes = MUSCLE_SHAPES[side];
    const parts = Object.keys(shapes).map(mus => {
      const f = fill(mus);
      if(f === 'none') return '';
      return shapes[mus].map(d => `<path d="${d}" fill="${f}" data-muscle="${mus}"/>`).join('');
    }).join('');
    return `<svg class="exfig-svg" viewBox="0 0 100 170" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">
      ${muscleBodySVG('var(--fig-body)', 'var(--fig-line)')}
      ${parts}
    </svg>`;
  };
  return `<div class="exfig ${o.size === 'hero' ? 'hero' : 'thumb-fig'}" role="img" aria-label="${esc(label)}">
    ${sides.map(view).join('')}
  </div>`;
}

/* ---------- demonstration animation ----------
   Two photographed frames — the start and the end of the movement — swapped on
   a loop, which reads as the movement without shipping video. The frames are
   public-domain (free-exercise-db); exercises the dataset does not cover fall
   back to the drawn muscle figure. Reduced-motion holds the first frame. */
function exerciseDemoHTML(exId, opts){
  const o = opts || {};
  const frames = typeof exPhotoFrames === 'function' ? exPhotoFrames(exId) : 0;
  const x = typeof ex === 'function' ? ex(exId) : null;
  if(!frames || !x) return typeof exerciseFigureSVG === 'function' ? exerciseFigureSVG(exId, {size:'hero'}) : '';
  const alt = t('demo_alt', x.n);
  const imgs = [];
  for(let i = 0; i < frames; i++){
    imgs.push(`<img src="assets/ex/${exId}-${i}.webp" alt="${i === 0 ? esc(alt) : ''}" width="400" height="267"
      loading="lazy" decoding="async" class="demo-frame${i === 0 ? ' on' : ''}">`);
  }
  return `<div class="exdemo" data-ex="${exId}">${imgs.join('')}
    <span class="demo-tag">${t('demo_tag')}</span></div>`;
}

/* swaps the frame of every demo on screen; one timer for the whole app */
let _demoTimer = null, _demoStep = 0;
function startExerciseDemos(root){
  stopExerciseDemos();
  const demos = (root || document).querySelectorAll('.exdemo');
  if(!demos.length) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  _demoTimer = setInterval(() => {
    _demoStep++;
    document.querySelectorAll('.exdemo').forEach(d => {
      const f = d.querySelectorAll('.demo-frame');
      if(f.length < 2) return;
      f.forEach((img, i) => img.classList.toggle('on', i === _demoStep % f.length));
    });
  }, 900);
}
function stopExerciseDemos(){ if(_demoTimer){ clearInterval(_demoTimer); _demoTimer = null; } }

/* the body map coloured by how recovered each muscle is, plus the same
   information as text — the figure is decoration, the list is the content */
function recoveryMapHTML(exId){
  const rows = exerciseRecovery(exId);
  if(!rows.length) return '';
  const byMuscle = {};
  rows.forEach(r => byMuscle[r.muscle] = r);
  const colour = {ok:'var(--ok)', mid:'var(--warn)', low:'var(--coral)'};
  const fill = m => {
    const r = byMuscle[m];
    if(!r) return 'none';
    const c = colour[recoveryBand(r.pct)];
    return r.role === 'pri' ? c : `color-mix(in srgb, ${c} 45%, transparent)`;
  };
  const title = rows.map(r => `${MUSCLE_NAMES[r.muscle]} ${r.pct}%`).join(', ');
  const chips = rows.map(r => `<li class="mrow ${recoveryBand(r.pct)}">
      <span class="mn">${MUSCLE_NAMES[r.muscle]}</span>
      <span class="mrole">${r.role === 'pri' ? t('rec_primary') : t('rec_secondary')}</span>
      <span class="mbar"><i style="width:${r.pct}%"></i></span>
      <b class="mpct">${r.pct}%</b>
    </li>`).join('');
  const worst = rows.reduce((a, r) => r.pct < a.pct ? r : a, rows[0]);
  const note = worst.pct >= 100 ? t('rec_ready')
    : worst.hoursLeft ? t('rec_hours_left', MUSCLE_NAMES[worst.muscle], worst.hoursLeft)
    : t('rec_ready');
  return `<div class="block recovery">
    <div class="lab">🧬 ${t('rec_title')}</div>
    <div class="recgrid">
      ${muscleMapSVG({fill, title: t('rec_map_alt', title)})}
      <ul class="mlist">${chips}</ul>
    </div>
    <p class="xs mut recnote">${note} · ${t('rec_estimate')}</p>
  </div>`;
}
