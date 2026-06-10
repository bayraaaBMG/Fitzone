/* ---------- PLAN ---------- */
function renderPlan(){
  const p=S.profile;
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>Миний хөтөлбөр</h2><a class="regen">↻ Шинэчлэх</a></div>
      <p class="mut sm" style="margin:0 0 16px">${goalName(p.goal)} · ${p.level===1?'Анхан':p.level===2?'Дунд':'Ахисан'} · ${p.place==='home'?'Гэр':p.place==='gym'?'Жийм':'Гэр+Жийм'} · долоо хоногт ${p.days} өдөр</p>
      <div id="days"></div>
      <div class="note warn" style="margin-top:18px"><div class="lab">⚠ Анхаар</div>Хөтөлбөр эхлэхээс өмнө 5 мин халаалт, дараа нь сунгалт хий. Хурц өвдөлт мэдрэгдвэл зогсоо.</div>
    </div>`;
  topWire();
  const wrap=document.getElementById('days');
  wrap.innerHTML = S.plan.map((d,i)=>`
    <div class="dayhead ${d.done?'done':''}" data-i="${i}" style="cursor:pointer">
      <div class="n">${d.done?'✓':i+1}</div>
      <div class="meta"><b>${d.title}</b><span>${d.ex.length} дасгал · ~${planEstMin(d)} мин · ${d.focus.map(f=>M_NAMES[f]).filter((v,k,a)=>a.indexOf(v)===k).join(', ')}</span></div>
      <div class="sr" style="color:var(--mut2);font-size:20px">›</div>
    </div>`).join('');
  wrap.querySelectorAll('.dayhead').forEach(h=> h.onclick=()=>openDay(+h.dataset.i));
  app.querySelector('.regen').onclick=()=>{
    S.plan=generatePlan(S.profile); save(); render(); toast('Хөтөлбөр шинэчлэгдлээ');
  };
}

/* ---------- DAY / WORKOUT SHEET ---------- */
function openDay(i){
  const d=S.plan[i];
  d.ex.forEach(e=>{
    if(!Array.isArray(e.doneSets) || e.doneSets.length!==e.sets) e.doneSets = Array(e.sets).fill(false);
  });
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:24px">${d.title}</h2>
    <p class="mut sm" style="margin:4px 0 16px">${d.ex.length} дасгал · ~${planEstMin(d)} минут · амралт дасгалын дунд</p>
    <div>${d.ex.map((e,k)=>{const x=ex(e.id);return `
      <div class="exrow" data-ex="${x.id}" data-i="${k}" style="cursor:pointer">
        <div class="thumb">${x.e}</div>
        <div class="info"><b>${x.n}</b><span>${M_NAMES[x.m]} · амралт ${e.rest}с</span></div>
        <div class="sr">${e.sets}×${e.reps}<small>set·reps</small></div>
        <button class="timerbtn" data-rest="${e.rest}" aria-label="Амралтын тооцуур">⏱</button>
        <div class="setdots">${e.doneSets.map((on,si)=>`<div class="setdot ${on?'on':''}" data-si="${si}">${si+1}</div>`).join('')}</div>
      </div>`;}).join('')}</div>
    <div style="margin-top:20px">
      ${d.done
        ? `<button class="btn g" id="undo">✓ Дууссан — буцаах</button>`
        : `<button class="btn p" id="complete">Дасгал дуусгах ✓</button>`}
    </div>`;
  sheet.querySelectorAll('.exrow').forEach(r=> r.onclick=()=> openExercise(r.dataset.ex));
  sheet.querySelectorAll('.timerbtn').forEach(b=> b.onclick=ev=>{ ev.stopPropagation(); startRestTimer(+b.dataset.rest); });
  sheet.querySelectorAll('.setdot').forEach(dot=> dot.onclick=ev=>{
    ev.stopPropagation();
    const k=+dot.closest('.exrow').dataset.i, si=+dot.dataset.si;
    const e=d.ex[k];
    e.doneSets[si]=!e.doneSets[si];
    dot.classList.toggle('on');
    save();
  });
  const cb=sheet.querySelector('#complete');
  if(cb) cb.onclick=()=>{
    d.done=true;
    const t=today();
    if(!S.completed.includes(t)) S.completed.push(t);
    save(); closeSheet(); render();
    toast('Бэрхээ! Дасгал бүртгэгдлээ 🔥');
  };
  const ub=sheet.querySelector('#undo');
  if(ub) ub.onclick=()=>{ d.done=false; save(); closeSheet(); render(); };
}
