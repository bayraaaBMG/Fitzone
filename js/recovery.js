/* ---------- muscle recovery model ----------
   Turns the training history the app already stores into a 0–100% recovery
   figure per muscle. Nothing new is persisted: the inputs are
     S.workoutResults  — per-exercise results with a completedAt timestamp
     S.completedLog     — one entry per completed plan day, with its focus
     S.plan             — which exercises that day's focus actually contained

   Model: every load event leaves fatigue on a muscle that decays linearly to
   zero over the exercise's `recov` hours (js/muscle-data.js). An assisting
   muscle takes SEC_FACTOR of both the load and the time. Fatigue from several
   sessions adds up and is capped at 1, so recovery = 100 × (1 − fatigue).

   This is an estimate for planning, never a medical or physiological
   measurement — the UI says so next to the number. */

const RECOVERY_PRI_WEIGHT = 1;
const RECOVERY_SEC_WEIGHT = 0.6;
/* a plan day carries no clock time, only a date — treat it as midday */
const RECOVERY_DAY_HOUR = 12;
/* how far back it is worth looking: nothing stays fatigued beyond this */
const RECOVERY_WINDOW_H = 96;

function recoveryDayTs(day){
  const t = Date.parse(day + 'T' + String(RECOVERY_DAY_HOUR).padStart(2, '0') + ':00:00+08:00');
  return isFinite(t) ? t : NaN;
}

/* [{ts, exerciseId}] or [{ts, groups:[coarse groups]}] — newest first */
function recoveryEvents(now){
  now = now == null ? Date.now() : now;
  const cutoff = now - RECOVERY_WINDOW_H * 3600e3;
  const out = [];
  const seenDay = new Set();

  for(const r of (S.workoutResults || [])){
    if(!r || !r.exerciseId || !isFinite(+r.completedAt)) continue;
    const ts = +r.completedAt;
    if(ts < cutoff || ts > now + 36e5) continue;
    out.push({ts, exerciseId: r.exerciseId});
    seenDay.add(getWorkoutDate(ts) + '|' + r.exerciseId);
  }

  for(const [day, entry] of Object.entries(S.completedLog || {})){
    const ts = recoveryDayTs(day);
    if(!isFinite(ts) || ts < cutoff || ts > now + 36e5) continue;
    // the plan day names its focus groups; prefer the exercises of that day
    const planDay = (S.plan || []).find(d => d && d.titleKey && entry && d.titleKey === entry.titleKey);
    const ids = planDay && Array.isArray(planDay.ex) ? planDay.ex.map(e => e.id).filter(Boolean) : [];
    if(ids.length){
      for(const id of ids){
        if(seenDay.has(day + '|' + id)) continue;   // already counted with a real timestamp
        out.push({ts, exerciseId: id});
      }
    } else if(entry && Array.isArray(entry.focus) && entry.focus.length){
      out.push({ts, groups: entry.focus.slice()});
    }
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/* fatigue (0–1) per fine muscle from one event */
function recoveryEventLoad(ev, now, into){
  const add = (muscle, weight, hours) => {
    if(!hours || hours <= 0) return;
    const elapsed = (now - ev.ts) / 3600e3;
    const left = 1 - elapsed / hours;
    if(left <= 0) return;
    into[muscle] = (into[muscle] || 0) + weight * left;
  };
  if(ev.exerciseId){
    const m = exMuscles(ev.exerciseId);
    if(!m) return;
    for(const p of m.pri) add(p, RECOVERY_PRI_WEIGHT, m.recov);
    for(const s of m.sec) add(s, RECOVERY_SEC_WEIGHT, m.recov * SEC_FACTOR);
    return;
  }
  // a day-level entry that only names coarse groups: spread it over the group
  for(const g of (ev.groups || [])){
    for(const muscle of (GROUP_MUSCLES[g] || [])) add(muscle, RECOVERY_SEC_WEIGHT, 36);
  }
}

/* {muscle: {pct, fatigue, hoursLeft}} for every fine muscle */
function muscleRecovery(now){
  now = now == null ? Date.now() : now;
  const fatigue = {};
  for(const ev of recoveryEvents(now)) recoveryEventLoad(ev, now, fatigue);

  const out = {};
  for(const m of MUSCLES){
    const f = Math.min(1, fatigue[m] || 0);
    out[m] = {
      fatigue: f,
      pct: Math.round(100 * (1 - f)),
      hoursLeft: f > 0 ? recoveryHoursLeft(m, now) : 0,
    };
  }
  return out;
}

/* hours until this muscle is back at 100%: the latest moment any live event
   on it decays to zero */
function recoveryHoursLeft(muscle, now){
  now = now == null ? Date.now() : now;
  let until = 0;
  for(const ev of recoveryEvents(now)){
    const m = ev.exerciseId ? exMuscles(ev.exerciseId) : null;
    let hours = 0;
    if(m){
      if(m.pri.includes(muscle)) hours = m.recov;
      else if(m.sec.includes(muscle)) hours = m.recov * SEC_FACTOR;
    } else if(ev.groups && ev.groups.some(g => (GROUP_MUSCLES[g] || []).includes(muscle))){
      hours = 36;
    }
    if(!hours) continue;
    const done = ev.ts + hours * 3600e3;
    if(done > until) until = done;
  }
  return until > now ? Math.ceil((until - now) / 3600e3) : 0;
}

/* the muscles an exercise works, with their current recovery — primary first */
function exerciseRecovery(exId, now){
  const m = exMuscles(exId);
  if(!m) return [];
  const rec = muscleRecovery(now);
  return [
    ...m.pri.map(x => ({muscle:x, role:'pri', ...rec[x]})),
    ...m.sec.map(x => ({muscle:x, role:'sec', ...rec[x]})),
  ];
}

/* green / amber / red band for the UI */
function recoveryBand(pct){ return pct >= 80 ? 'ok' : pct >= 40 ? 'mid' : 'low'; }
