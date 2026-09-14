/* ---------- workout results, personal records, streaks ----------
   Stored inside the existing users/{uid} Firestore document via save()
   (same owner-only rule as everything else — no rules change needed):

   S.exStats[exerciseId] = {
     sessions, bestReps, bestTime, bestScore, bestRate,   // bestRate = reps per second
     streak, lastDay, last: WorkoutResult
   }
   S.workoutResults = [WorkoutResult, ...]  newest first, capped

   WorkoutResult = {
     userId, exerciseId, mode, reps, heldSec, duration, score, formScore,
     opponent:{type:'target'|'ai'|'record', level, target}, won, completedAt
   }

   Future real-player challenges (NOT implemented yet, nothing written to
   Firestore for this): a top-level `challenges/{id}` collection shaped like
     {challengerId, opponentId, exerciseId, targetReps, duration,
      status:'pending'|'accepted'|'completed'|'expired', createdAt, expiresAt,
      challengerResult, opponentResult}
   with rules that only let the two participants read it, only the
   challenger create it, and each participant write only their own result.
   buildChallenge() below produces that shape so it can be wired up later
   without changing WorkoutResult. */
const WORKOUT_RESULTS_CAP = 50;
const AI_LEVEL_MULT = {1:0.6, 2:1, 3:1.4};

function dayBefore(ymd){ const d=new Date(ymd+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); }

function workoutScore(amount, formScore){
  return amount*10 + (formScore==null ? 0 : Math.round(formScore/2));
}

function exStatsFor(id){
  return (S.exStats && S.exStats[id]) || {sessions:0, bestReps:0, bestTime:0, bestScore:0, bestRate:0, streak:0, lastDay:null, last:null};
}

/* opponent/target amount for a session: reps (reps mode) or seconds (time mode) */
function aiTargetFor(exId, level, duration){
  const c = COACH[exId]; if(!c) return 0;
  const mult = AI_LEVEL_MULT[level] || 1;
  if(c.mode==='time') return Math.max(10, Math.round(c.pace*mult));
  return Math.max(3, Math.round(c.pace*mult*duration/60));
}
function soloTargetFor(exId, duration){
  const lvl = S.profile ? S.profile.level : 1;
  return aiTargetFor(exId, lvl, duration);
}
function recordTargetFor(exId, duration){
  const c = COACH[exId], s = exStatsFor(exId);
  if(!c || !s.sessions) return null;
  if(c.mode==='time') return s.bestTime ? s.bestTime+1 : null;
  return s.bestRate ? Math.round(s.bestRate*duration)+1 : null;
}

function buildWorkoutResult(o){
  const reps = o.mode==='reps' ? o.amount : 0;
  const heldSec = o.mode==='time' ? o.amount : 0;
  const completedAt = Date.now();
  return {
    id: `${o.exId}-${completedAt}`,
    userId: (typeof authUser!=='undefined' && authUser) ? authUser.uid : null,
    exerciseId: o.exId, mode: o.mode, reps, heldSec,
    duration: o.duration, activeSec: o.activeSec || o.duration, score: workoutScore(o.amount, o.formScore),
    formScore: o.formScore==null ? null : o.formScore,
    opponent: {type:o.oppType, level:o.oppLevel||null, target:o.oppAmount},
    won: o.oppType==='target' ? o.amount>=o.oppAmount : o.amount>o.oppAmount,
    completedAt,
  };
}

/* applies a finished session to stats; returns what changed for the result screen */
function recordWorkoutResult(r){
  if(!S.exStats) S.exStats = {};
  if(!Array.isArray(S.workoutResults)) S.workoutResults = [];
  if(r.id && S.workoutResults.some(x=>x && x.id===r.id)) return null; // same result submitted twice
  const prev = exStatsFor(r.exerciseId);
  const amount = r.mode==='time' ? r.heldSec : r.reps;
  const prevBest = r.mode==='time' ? prev.bestTime : prev.bestReps;
  const d = today();
  const streak = prev.lastDay===d ? prev.streak : (prev.lastDay===dayBefore(d) ? prev.streak+1 : 1);
  const next = {
    sessions: prev.sessions+1,
    bestReps: r.mode==='reps' ? Math.max(prev.bestReps, r.reps) : prev.bestReps,
    bestTime: r.mode==='time' ? Math.max(prev.bestTime, r.heldSec) : prev.bestTime,
    bestScore: Math.max(prev.bestScore, r.score),
    bestRate: (r.mode==='reps' && r.duration>0) ? Math.max(prev.bestRate, +(r.reps/r.duration).toFixed(3)) : prev.bestRate,
    streak, lastDay: d, last: r,
  };
  S.exStats[r.exerciseId] = next;
  S.workoutResults.unshift(r);
  if(S.workoutResults.length > WORKOUT_RESULTS_CAP) S.workoutResults.length = WORKOUT_RESULTS_CAP;
  return {
    isPR: amount>0 && amount>prevBest, prDelta: amount-prevBest, firstTime: prev.sessions===0,
    streak, streakUp: prev.lastDay!==d, stats: next,
  };
}

/* progression suggestion from actual performance */
function progressionHint(exId){
  const c = coachFor(exId), s = exStatsFor(exId);
  if(!c || !s.last) return null;
  const last = s.last;
  const amount = c.mode==='time' ? last.heldSec : last.reps;
  const ref = aiTargetFor(exId, 2, last.duration || c.dur);
  const formOk = last.formScore==null || last.formScore>=80;
  if(c.next && amount >= Math.round(ref*1.2) && formOk) return {dir:'up', name:c.next};
  if(c.prev && amount < Math.round(ref*0.4)) return {dir:'down', name:c.prev};
  return null;
}

function buildChallenge(o){
  const now = Date.now();
  return {
    challengerId: o.challengerId, opponentId: o.opponentId, exerciseId: o.exerciseId,
    targetReps: o.targetReps, duration: o.duration, status: 'pending',
    createdAt: now, expiresAt: now + 48*3600*1000, challengerResult: null, opponentResult: null,
  };
}
