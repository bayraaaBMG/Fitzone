/* ---------- what the onboarding answers add up to ----------
   Pure arithmetic over a profile, kept out of the view so it can be checked
   on its own. Every number here comes from a published formula, named in
   js/references.js and shown on screen: Mifflin-St Jeor for resting energy,
   the WHO BMI bands for the healthy weight range, ISSN for protein, the AMDR
   for fat, NIH for a sensible rate of weight change.

   None of this is a measurement of the person and none of it is medical
   advice. Where an answer says a health condition is involved, the result
   deliberately stops short of prescribing a deficit and says to ask a
   doctor instead. */

/* Daily activity, 1 (sitting almost all day) to 5 (hard physical work, or
   training twice a day). The multipliers continue the scale the nutrition
   tab already offers rather than introducing a second, conflicting one. */
const ACTIVITY_MULT = {1: 1.2, 2: 1.3, 3: 1.45, 4: 1.65, 5: 1.8};

/* Conditions worth knowing about. The first group changes what we may
   suggest about calories at all; `injury` only changes exercise choice. */
const HEALTH_FLAGS = ['diabetes', 'thyroid', 'heart', 'kidney', 'pressure', 'pregnant', 'injury'];
const HEALTH_CARE = ['diabetes', 'thyroid', 'heart', 'kidney', 'pressure', 'pregnant'];

const DIET_HABITS = ['meat', 'mixed', 'veg'];

/* the WHO healthy band, BMI 18.5 to 24.9, turned back into kilograms */
function healthyWeightRange(heightCm){
  const h = (+heightCm || 0) / 100;
  if(h <= 0) return null;
  return {lo: Math.round(18.5 * h * h * 10) / 10, hi: Math.round(24.9 * h * h * 10) / 10};
}

/* How far outside the healthy band, if at all. Inside it the honest answer
   is zero: there is no reason to aim for the middle of the range. */
function weightDelta(weightKg, heightCm){
  const r = healthyWeightRange(heightCm);
  const w = +weightKg || 0;
  if(!r || w <= 0) return null;
  if(w > r.hi) return {dir: 'lose', kg: Math.round((w - r.hi) * 10) / 10, target: r.hi, range: r};
  if(w < r.lo) return {dir: 'gain', kg: Math.round((r.lo - w) * 10) / 10, target: r.lo, range: r};
  return {dir: 'stay', kg: 0, target: w, range: r};
}

/* 0.5-1 kg a week is the rate NIH describes as sustainable; anything faster
   is mostly water and muscle. Returned as a range of weeks, never a date. */
function weeksToChange(kg){
  const d = Math.abs(+kg || 0);
  if(d < 0.5) return null;
  return {fast: Math.ceil(d / 1), slow: Math.ceil(d / 0.5)};
}

/* A target the person typed is theirs to set, but it is still checked
   against the healthy band so the screen can say when it is below it. */
function targetCheck(targetKg, heightCm){
  const r = healthyWeightRange(heightCm);
  const t = +targetKg || 0;
  if(!r || t <= 0) return null;
  return {target: t, range: r, belowHealthy: t < r.lo, aboveHealthy: t > r.hi};
}

/* The whole result screen in one object. `care` is why the calorie figure
   was softened, if it was, so the screen can explain itself. */
function onboardSummary(p){
  if(!p || !p.weight || !p.height) return null;
  const act = ACTIVITY_MULT[p.activity] || ACTIVITY_MULT[3];
  const care = (p.health || []).filter(h => HEALTH_CARE.includes(h));
  const base = nutrition(p, act);

  // a condition of this kind is not ours to prescribe a deficit for
  let cal = base.cal, softened = null;
  if(care.indexOf('pregnant') >= 0){
    cal = base.tdee;
    softened = 'pregnant';
  } else if(care.length){
    cal = Math.max(base.cal, Math.round(base.tdee * CALC_CFG.careFloor));
    if(cal !== base.cal) softened = 'care';
  }
  const nut = calorieMacros(p, cal, base);

  const b = bmi(p.weight, p.height);
  const delta = weightDelta(p.weight, p.height);
  const goal = p.targetWeight ? targetCheck(p.targetWeight, p.height) : null;
  const aimKg = goal ? Math.round((p.targetWeight - p.weight) * 10) / 10 : (delta ? (delta.dir === 'lose' ? -delta.kg : delta.kg) : 0);

  return {
    bmi: Math.round(b * 10) / 10,
    cat: bmiCategory(b),
    catKey: bmiCategoryKey(b),
    range: delta ? delta.range : null,
    delta, goal, aimKg,
    weeks: weeksToChange(aimKg),
    nut, tdee: base.tdee, activity: act,
    care, softened,
    injury: (p.health || []).indexOf('injury') >= 0,
  };
}

/* which band, as a key rather than a translated string */
function bmiCategoryKey(b){
  if(b < 18.5) return 'under';
  if(b < 25) return 'normal';
  if(b < 30) return 'over';
  return 'obese';
}

/* macros for a calorie figure that may have been adjusted after the fact */
function calorieMacros(p, cal, base){
  const protein = Math.round(p.weight * CALC_CFG.proteinPerKg);
  const fat = Math.round(cal * CALC_CFG.fatShare / 9);
  const carb = Math.max(Math.round((cal - protein * 4 - fat * 9) / 4), 0);
  return {tdee: base.tdee, cal, label: base.label, protein, fat, carb};
}
