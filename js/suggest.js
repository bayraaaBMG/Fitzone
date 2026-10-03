/* ---------- recovery-based exercise suggestions ----------
   "What is worth training right now": the exercises whose working muscles are
   the most recovered, filtered to what the person can actually do today
   (home or gym, the equipment they said they have) and biased towards their
   goal and level.

   Derived entirely from state that already exists — no new stored field. */

/* an exercise is only worth suggesting when its primary muscles are rested */
const SUGGEST_MIN_PRIMARY = 70;
const SUGGEST_COUNT = 4;

function suggestPlace(profile){
  const p = (profile || S.profile || {}).place;
  return p === 'gym' ? 'gym' : p === 'both' ? null : 'home';   // null = both are fine
}

function suggestEquipOk(x, profile){
  if(x.eq === 'none') return true;
  const p = profile || S.profile || {};
  if(p.place === 'home' && x.loc === 'gym') return false;
  // a gym profile is assumed to have the gym's kit; at home only what was listed
  if(x.loc === 'gym') return true;
  return Array.isArray(p.equip) ? p.equip.includes(x.eq) : false;
}

/* score 0–100: how rested this exercise is, primaries weighted over assistants */
function suggestScore(exId, rec){
  const m = exMuscles(exId);
  if(!m) return null;
  const pri = m.pri.map(k => (rec[k] || {}).pct || 0);
  const sec = m.sec.map(k => (rec[k] || {}).pct || 0);
  if(!pri.length) return null;
  const priAvg = pri.reduce((a, b) => a + b, 0) / pri.length;
  const secAvg = sec.length ? sec.reduce((a, b) => a + b, 0) / sec.length : 100;
  return {
    worstPrimary: Math.min(...pri),
    score: Math.round(priAvg * 0.8 + secAvg * 0.2),
    muscles: m.pri,
  };
}

/* [{id, score, worstPrimary, muscles}] — best first, one per primary muscle */
function suggestExercises(opts){
  const o = opts || {};
  const profile = o.profile || S.profile || {};
  const rec = o.recovery || muscleRecovery(o.now);
  const place = suggestPlace(profile);
  const doneToday = new Set((S.workoutResults || [])
    .filter(r => r && r.completedAt && getWorkoutDate(r.completedAt) === today())
    .map(r => r.exerciseId));

  const scored = [];
  for(const x of EX){
    if(doneToday.has(x.id)) continue;
    if(place && x.loc !== place) continue;
    if(!suggestEquipOk(x, profile)) continue;
    const s = suggestScore(x.id, rec);
    if(!s || s.worstPrimary < SUGGEST_MIN_PRIMARY) continue;
    const goalMatch = profile.goal && (x.goals || []).includes(profile.goal) ? 6 : 0;
    const levelFit = profile.level ? Math.max(0, 4 - Math.abs(x.lvl - profile.level) * 4) : 0;
    scored.push({id:x.id, score:s.score, worstPrimary:s.worstPrimary, muscles:s.muscles,
                 rank: s.score + goalMatch + levelFit});
  }
  scored.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));

  // keep the list varied: at most one exercise per primary muscle
  const used = new Set(), out = [];
  for(const s of scored){
    if(s.muscles.some(m => used.has(m))) continue;
    s.muscles.forEach(m => used.add(m));
    out.push(s);
    if(out.length >= (o.count || SUGGEST_COUNT)) break;
  }
  // if variety left us short (small library for this profile), top up by rank
  if(out.length < (o.count || SUGGEST_COUNT)){
    for(const s of scored){
      if(out.find(e => e.id === s.id)) continue;
      out.push(s);
      if(out.length >= (o.count || SUGGEST_COUNT)) break;
    }
  }
  return out;
}

/* muscles sorted by how rested they are — for the whole-body view */
function recoveryOverview(now){
  const rec = muscleRecovery(now);
  const rows = MUSCLES.map(m => ({muscle:m, ...rec[m]}));
  const ready = rows.filter(r => r.pct >= 80).length;
  const worst = rows.slice().sort((a, b) => a.pct - b.pct)[0];
  const avg = Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length);
  return {rows, rec, ready, worst, avg, total: rows.length};
}
