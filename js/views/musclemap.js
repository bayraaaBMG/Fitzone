/* ---------- SVG muscle map ----------
   A simplified front and back figure, drawn here rather than imported so the
   regions can be addressed one by one and there is no third-party asset or
   licence involved. Each region carries data-muscle, so the same markup works
   for "these are the muscles this exercise works" and for "this is how
   recovered each muscle is".

   Regions are deliberately schematic: enough to read at 150px wide on a
   phone, not an anatomy chart. */

const MUSCLE_SHAPES = {
  front: {
    chest:     ['M31 40 q9 -5 18 0 l-1 11 q-8 5 -17 0 z', 'M69 40 q-9 -5 -18 0 l1 11 q8 5 17 0 z'],
    shoulders: ['M24 36 q-7 2 -8 12 q6 3 11 -1 z', 'M76 36 q7 2 8 12 q-6 3 -11 -1 z'],
    biceps:    ['M19 50 q-4 7 -3 16 q5 2 8 -2 l1 -14 z', 'M81 50 q4 7 3 16 q-5 2 -8 -2 l-1 -14 z'],
    abs:       ['M42 56 h16 v26 q-8 4 -16 0 z'],
    obliques:  ['M36 58 q-3 10 1 22 l5 2 v-26 z', 'M64 58 q3 10 -1 22 l-5 2 v-26 z'],
    quads:     ['M39 88 q-4 18 -2 34 q7 3 12 -1 l2 -32 z', 'M61 88 q4 18 2 34 q-7 3 -12 -1 l-2 -32 z'],
    calves:    ['M41 128 q-3 12 0 22 q6 2 9 -2 l-1 -20 z', 'M59 128 q3 12 0 22 q-6 2 -9 -2 l1 -20 z'],
  },
  back: {
    traps:     ['M38 34 q12 -4 24 0 l-4 14 q-8 3 -16 0 z'],
    lats:      ['M33 50 q-4 16 2 28 l10 -4 v-26 z', 'M67 50 q4 16 -2 28 l-10 -4 v-26 z'],
    triceps:   ['M19 50 q-4 8 -3 17 q5 2 8 -2 l1 -15 z', 'M81 50 q4 8 3 17 q-5 2 -8 -2 l-1 -15 z'],
    glutes:    ['M38 82 q-2 12 4 18 q8 2 12 -3 l-1 -15 z', 'M62 82 q2 12 -4 18 q-8 2 -12 -3 l1 -15 z'],
    hams:      ['M40 103 q-3 14 -1 24 q7 3 11 -1 l1 -23 z', 'M60 103 q3 14 1 24 q-7 3 -11 -1 l-1 -23 z'],
    calves:    ['M41 132 q-3 11 0 20 q6 2 9 -2 l-1 -18 z', 'M59 132 q3 11 0 20 q-6 2 -9 -2 l1 -18 z'],
  },
};

/* the plain silhouette both views are drawn on */
const MUSCLE_BODY_PATH =
  'M50 8 q7 0 7 8 q0 7 -4 10 q9 2 15 7 q7 5 9 14 l3 20 q1 6 -3 7 q-4 1 -6 -5 l-3 -11 l-1 18 q0 8 2 16 l3 18 q1 9 0 18 l-2 22 q-1 7 -5 7 q-4 0 -4 -7 l-2 -22 l-4 -18 l-4 18 l-2 22 q0 7 -4 7 q-4 0 -5 -7 l-2 -22 q-1 -9 0 -18 l3 -18 q2 -8 2 -16 l-1 -18 l-3 11 q-2 6 -6 5 q-4 -1 -3 -7 l3 -20 q2 -9 9 -14 q6 -5 15 -7 q-4 -3 -4 -10 q0 -8 7 -8 z';

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
      <path d="${MUSCLE_BODY_PATH}" fill="var(--mmap-body)" stroke="var(--mmap-line)" stroke-width="1"/>
      ${parts}
    </svg>`;
  };
  return `<div class="mmap-wrap" role="img" aria-label="${esc(o.title || '')}">${view('front')}${view('back')}</div>`;
}

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
