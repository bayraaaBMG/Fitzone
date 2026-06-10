/* ---------- rule-based plan generator ---------- */
function repScheme(goal, lvl){
  // returns {reps, rest(sec), sets}
  if(goal==='strength') return {reps:'5–6', rest:120, sets: lvl===1?3:4};
  if(goal==='muscle')   return {reps:'8–12', rest:75, sets: lvl===1?3:4};
  if(goal==='fatloss')  return {reps:'12–15', rest:40, sets:3};
  return {reps:'10–15', rest:50, sets:3}; // tone / health
}
function splitFor(days, lvl){
  if(days<=2) return [['legs','chest','back','abs'], ['legs','shoulders','back','abs']]
                .map((f,i)=>({title:'Бүх бие '+(i?'B':'A'), focus:f}));
  if(days===3){
    if(lvl>=2) return [
      {title:'Push (Түлэх)', focus:['chest','shoulders','arms']},
      {title:'Pull (Татах)', focus:['back','back','arms']},
      {title:'Legs (Хөл)', focus:['legs','glutes','abs']}];
    return [['legs','chest','back','abs'],['legs','shoulders','back','abs'],['legs','chest','glutes','abs']]
      .map((f,i)=>({title:'Бүх бие '+['A','B','C'][i], focus:f}));
  }
  if(days===4) return [
    {title:'Upper (Дээд)', focus:['chest','back','shoulders','arms']},
    {title:'Lower (Доод)', focus:['legs','glutes','abs']},
    {title:'Upper (Дээд)', focus:['back','chest','shoulders','arms']},
    {title:'Lower (Доод)', focus:['legs','glutes','abs']}];
  if(days===5) return [
    {title:'Push (Түлэх)', focus:['chest','shoulders','arms']},
    {title:'Pull (Татах)', focus:['back','back','arms']},
    {title:'Legs (Хөл)', focus:['legs','glutes','abs']},
    {title:'Upper (Дээд)', focus:['chest','back','shoulders']},
    {title:'Lower (Доод)', focus:['legs','glutes','abs']}];
  return [ // 6
    {title:'Push (Түлэх)', focus:['chest','shoulders','arms']},
    {title:'Pull (Татах)', focus:['back','back','arms']},
    {title:'Legs (Хөл)', focus:['legs','glutes','abs']},
    {title:'Push (Түлэх)', focus:['chest','shoulders','arms']},
    {title:'Pull (Татах)', focus:['back','back','arms']},
    {title:'Legs (Хөл)', focus:['legs','glutes','abs']}];
}
function pickEx(muscle, p, used){
  const gymOK = p.place==='gym' || p.place==='both';
  const equip = p.equip||[];
  let pool = EX.filter(x=>{
    if(x.m!==muscle) return false;
    if(x.loc==='gym' && !gymOK) return false;
    if(x.loc==='home' && p.place==='gym') return false; // pure gym → gym moves
    if(x.lvl > p.level && x.lvl===3) return false; // skip advanced moves unless user is advanced
    // gym moves: skip if user lacks the required equipment
    if(x.loc==='gym' && x.eq!=='none' && equip.length && !equip.includes(x.eq) && !equip.includes('machine')) return false;
    return true;
  });
  // prefer not-yet-used, level <= user level
  pool.sort((a,b)=>{
    const au=used.has(a.id)?1:0, bu=used.has(b.id)?1:0;
    if(au!==bu) return au-bu;
    return Math.abs(a.lvl-p.level)-Math.abs(b.lvl-p.level);
  });
  return pool[0] || null;
}
function generatePlan(p){
  const days = splitFor(p.days, p.level);
  const sch = repScheme(p.goal, p.level);
  const used = new Set();
  const plan = days.map(d=>{
    const exs=[];
    d.focus.forEach(mus=>{
      const x = pickEx(mus, p, used);
      if(x && !exs.find(e=>e.id===x.id)){
        used.add(x.id);
        exs.push({id:x.id, sets:sch.sets, reps:sch.reps, rest:sch.rest, doneSets:Array(sch.sets).fill(false)});
      }
    });
    // fat loss finisher
    if(p.goal==='fatloss'){
      const fin = EX.find(x=>x.m==='cardio' && (p.place!=='gym'));
      if(fin && !exs.find(e=>e.id===fin.id)) exs.push({id:fin.id, sets:3, reps:'30–40 сек', rest:30, doneSets:Array(3).fill(false)});
    }
    return {title:d.title, focus:d.focus, ex:exs, done:false};
  });
  return plan;
}
function planEstMin(day){
  // rough: sets * (reps~40s + rest)
  let s=0; day.ex.forEach(e=>{ s += e.sets*(45+e.rest); });
  return Math.max(p_minTarget(), Math.round(s/60));
}
function p_minTarget(){ return S.profile?S.profile.minutes:30; }

/* ---------- nutrition (Mifflin-St Jeor) ---------- */
function nutrition(p, activity){
  const s = p.sex==='m'?5:-161;
  const bmr = 10*p.weight + 6.25*p.height - 5*p.age + s;
  const tdee = Math.round(bmr*activity);
  let cal = tdee, label='Хадгалах';
  if(p.goal==='fatloss'){ cal = Math.round(tdee*0.8); label='Жин хасах'; }
  else if(p.goal==='muscle'||p.goal==='strength'){ cal = Math.round(tdee*1.1); label='Булчин нэмэх'; }
  const protein = Math.round(p.weight*2);            // g
  const fat = Math.round(cal*0.25/9);                // g
  const carb = Math.round((cal - protein*4 - fat*9)/4);
  return {tdee, cal, label, protein, fat, carb:Math.max(carb,0)};
}
function pct(part,whole){ return Math.min(100,Math.round(part/whole*100)); }

/* ---------- 7-day week schedule ---------- */
// spreads `numDays` workout days evenly across a Mon..Sun week.
// returns array of length 7: index into S.plan, or -1 for a rest day.
function weekSchedule(numDays){
  const sched = Array(7).fill(-1);
  for(let i=0;i<numDays;i++){
    sched[Math.min(6, Math.round(i*7/numDays))] = i;
  }
  return sched;
}

/* ---------- BMI ---------- */
function bmi(weight, height){
  const h = height/100;
  return weight/(h*h);
}
function bmiCategory(b){
  if(b<18.5) return {n:'Дутуу жинтэй', c:'var(--acc)'};
  if(b<25)   return {n:'Хэвийн', c:'var(--ok)'};
  if(b<30)   return {n:'Илүүдэл жинтэй', c:'var(--warn)'};
  return {n:'Таргалалттай', c:'var(--coral)'};
}
