/* ---------- does this meal suit me? ----------
   Answers the question the user actually asks — "энэ хоол надад тохирох уу?" —
   from numbers the app already has: the Mifflin–St Jeor targets in
   js/planner.js (nutrition()), today's intake, the goal in the profile and the
   meal's own calories and macros.

   Deterministic arithmetic, no model, no network, no stored data. Every verdict
   can be explained in a sentence, which is the point: a user who is told "this
   is 48% of your day's calories and gives 6 g of protein" can decide for
   themselves. The thresholds below are conventions, not medical advice, and the
   UI says so. */

/* protein per 100 kcal — the usual way to say "is this food protein-dense" */
const FOOD_DENSITY = {low: 4, good: 7};
/* a single meal as a share of the daily target */
const FOOD_SHARE = {big: 0.40, huge: 0.55};

function foodTargets(){
  if(!S.profile) return null;
  const act = (typeof actLevel === 'number') ? actLevel : 1.45;
  return nutrition(S.profile, act);
}

/* {band, reasons:[{key,args}], share, density, over, remaining} */
function foodVerdict(item, opts){
  const o = opts || {};
  const n = o.targets || foodTargets();
  if(!n || !item || !(item.kcal > 0)) return null;
  const eaten = o.consumed || (typeof consumedToday === 'function' ? consumedToday() : {kcal:0, protein:0});
  const goal = (S.profile && S.profile.goal) || 'health';
  const kcal = +item.kcal || 0, protein = +item.protein || 0;

  const share = kcal / n.cal;                       // of the whole day
  const density = protein / (kcal / 100);           // g protein per 100 kcal
  const remaining = Math.max(0, n.cal - eaten.kcal);
  const over = kcal > remaining && eaten.kcal > 0;  // would push past today's target
  const proteinLeft = Math.max(0, n.protein - eaten.protein);

  const reasons = [];
  let score = 0;   // negative = worse

  if(share >= FOOD_SHARE.huge){ score -= 2; reasons.push({key:'fadv_r_huge', args:[Math.round(share*100), kcal]}); }
  else if(share >= FOOD_SHARE.big){ score -= 1; reasons.push({key:'fadv_r_big', args:[Math.round(share*100), kcal]}); }
  else reasons.push({key:'fadv_r_fits', args:[Math.round(share*100), kcal]});

  if(density < FOOD_DENSITY.low){ score -= (goal === 'muscle' ? 2 : 1); reasons.push({key:'fadv_r_lowprot', args:[protein, density.toFixed(1)]}); }
  else if(density >= FOOD_DENSITY.good){ score += 1; reasons.push({key:'fadv_r_highprot', args:[protein, density.toFixed(1)]}); }

  if(over){ score -= 1; reasons.push({key:'fadv_r_over', args:[remaining, kcal - remaining]}); }
  else if(remaining > 0) reasons.push({key:'fadv_r_left', args:[remaining]});

  if(goal === 'muscle' && proteinLeft > 0 && protein >= proteinLeft * 0.3)
    reasons.push({key:'fadv_r_protein_help', args:[protein, Math.round(proteinLeft)]});
  if(goal === 'fatloss' && share < 0.25 && density >= FOOD_DENSITY.good)
    reasons.push({key:'fadv_r_good_fatloss', args:[]});

  const band = score <= -2 ? 'poor' : score <= -1 ? 'ok' : 'good';
  return {band, reasons, share, density, over, remaining, kcal, protein,
          headline: 'fadv_h_' + band + '_' + (goal === 'muscle' ? 'muscle' : goal === 'fatloss' ? 'fatloss' : 'health')};
}

/* better things to eat instead, from the recipe book — same meal slot first,
   then whatever the kitchen can actually make */
function foodSwaps(item, opts){
  const o = opts || {};
  const n = o.targets || foodTargets();
  if(!n || typeof RECIPES === 'undefined') return [];
  const goal = (S.profile && S.profile.goal) || 'health';
  const slot = o.slot;
  const pantry = new Set(S.pantry || []);
  const baseKcal = +item.kcal || 0, baseProt = +item.protein || 0;

  return RECIPES
    .filter(r => r.id !== item.recipeId)
    .filter(r => !slot || (r.meal || []).includes(slot))
    .map(r => {
      const v = foodVerdict(r, {targets:n, consumed:o.consumed});
      if(!v) return null;
      const haveAll = (r.needs || []).length && (r.needs || []).every(x => pantry.has(x));
      let rank = 0;
      if(v.band === 'good') rank += 3; else if(v.band === 'ok') rank += 1;
      if(goal === 'fatloss' && r.kcal < baseKcal) rank += 2;
      if(goal === 'muscle' && r.protein > baseProt) rank += 2;
      if((r.tags || []).includes(goal)) rank += 2;
      if(haveAll) rank += 2;                       // can be cooked at home right now
      if((r.tags || []).includes('mongol')) rank += 1;
      return {recipe:r, verdict:v, haveAll, rank,
              dKcal: r.kcal - baseKcal, dProtein: r.protein - baseProt};
    })
    .filter(Boolean)
    .filter(s => s.verdict.band !== 'poor')
    .sort((a, b) => b.rank - a.rank || a.recipe.kcal - b.recipe.kcal)
    .slice(0, o.count || 3);
}

/* one line for the top of the nutrition tab: what today still needs */
function dayAdvice(){
  const n = foodTargets();
  if(!n) return null;
  const c = typeof consumedToday === 'function' ? consumedToday() : {kcal:0, protein:0};
  const kcalLeft = n.cal - c.kcal, protLeft = n.protein - c.protein;
  const goal = (S.profile && S.profile.goal) || 'health';
  if(c.kcal === 0) return {key:'fadv_day_start', args:[n.cal, n.protein], band:'good'};
  if(kcalLeft < 0) return {key:'fadv_day_over', args:[Math.abs(Math.round(kcalLeft))], band:'poor'};
  if(protLeft > 0 && kcalLeft < protLeft * 4) return {key:'fadv_day_tight', args:[Math.round(kcalLeft), Math.round(protLeft)], band:'ok'};
  if(protLeft > 0) return {key:'fadv_day_protein', args:[Math.round(kcalLeft), Math.round(protLeft)], band:'good'};
  return {key: goal === 'fatloss' ? 'fadv_day_ok_fatloss' : 'fadv_day_ok', args:[Math.round(Math.max(0, kcalLeft))], band:'good'};
}

/* what the kitchen can make right now, best fit first */
function pantryPicks(count){
  const pantry = new Set(S.pantry || []);
  if(!pantry.size || typeof RECIPES === 'undefined') return [];
  const goal = (S.profile && S.profile.goal) || 'health';
  const n = foodTargets();
  return RECIPES
    .map(r => {
      const need = r.needs || [];
      const have = need.filter(x => pantry.has(x)).length;
      if(!need.length || have === 0) return null;
      const v = n ? foodVerdict(r, {targets:n}) : null;
      const missing = need.filter(x => !pantry.has(x));
      let rank = have * 2 - missing.length;
      if((r.tags || []).includes(goal)) rank += 3;
      if(v && v.band === 'good') rank += 2; else if(v && v.band === 'poor') rank -= 3;
      return {recipe:r, have, missing, verdict:v, rank};
    })
    .filter(Boolean)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, count || 3);
}
