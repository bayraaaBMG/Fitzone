/* ---------- HOME ---------- */
function renderHome(){
  const p=S.profile;
  const next = S.plan.find(d=>!d.done) || S.plan[0];
  const nIdx = S.plan.indexOf(next);
  const doneCount = S.plan.filter(d=>d.done).length;
  const nut = nutrition(p, 1.45);
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="hero" style="padding:24px 20px">
        <div class="eyebrow">Өнөөдөр</div>
        <h1 style="font-size:28px">Тавтай морил,<br><span class="y">${esc(p.name)}</span></h1>
        <p>${goalName(p.goal)} · ${p.place==='home'?'Гэртээ':p.place==='gym'?'Жиймд':'Гэр + жийм'} · 7 хоногт ${p.days} өдөр</p>
        <div style="margin-top:18px"><button class="btn p" id="goNext">▶ ${next.title} эхлүүлэх</button></div>
      </div>

      <div class="grid g2" style="margin-top:14px">
        <div class="card"><span class="xs mut">Энэ долоо хоног</span><div style="font-family:Archivo;font-weight:900;font-size:26px;margin-top:4px">${doneCount}/${p.days}</div><span class="xs mut">дасгал дууссан</span></div>
        <div class="card"><span class="xs mut">Зорилгын калори</span><div style="font-family:Archivo;font-weight:900;font-size:26px;margin-top:4px;color:var(--acc)">${nut.cal}</div><span class="xs mut">ккал / өдөр</span></div>
      </div>

      <div class="secttl"><h2>Дасгал хийх</h2></div>
      <div class="grid g2">
        <button class="tile acc" id="goHomeWO"><div class="ic">🏠</div><h3>Гэрийн дасгал</h3><p>Тоног хэрэгслэлгүй, хаана ч хийнэ</p></button>
        <button class="tile" id="goGymWO"><div class="ic">🏋️</div><h3>Жийм дасгал</h3><p>Тоног төхөөрөмжтэй, хүчтэй ачаалал</p></button>
      </div>

      <div class="secttl"><h2>Дараагийн дасгал</h2><a data-tab="plan" class="goTab">Бүгд ›</a></div>
      <div class="card">
        <div class="dayhead" style="margin:0 0 12px;background:transparent;border:none;padding:0">
          <div class="n">${nIdx+1}</div>
          <div class="meta"><b>${next.title}</b><span>${next.ex.length} дасгал · ~${planEstMin(next)} мин</span></div>
        </div>
        ${next.ex.slice(0,3).map(e=>{const x=ex(e.id);return `
          <div class="exrow"><div class="thumb">${x.e}</div>
            <div class="info"><b>${x.n}</b><span>${M_NAMES[x.m]||''}</span></div>
            <div class="sr">${e.sets}×${e.reps}<small>set · reps</small></div></div>`;}).join('')}
        ${next.ex.length>3?`<p class="xs mut center" style="margin:10px 0 0">+${next.ex.length-3} дасгал</p>`:''}
      </div>

      <div class="secttl"><h2>Хурдан туслах</h2></div>
      <div class="scrollrow">
        ${['Өнөөдөр ядарч байна','Гэдэс багасгах','20 минутын дасгал','Нуруу өвдөхгүй'].map(q=>
          `<button class="chip ai" data-q="${esc(q)}">💬 ${q}</button>`).join('')}
      </div>
    </div>`;
  topWire();
  document.getElementById('goNext').onclick=()=>openDay(nIdx);
  document.getElementById('goHomeWO').onclick=()=>{ libF.loc='home'; S.tab='library'; render(); };
  document.getElementById('goGymWO').onclick=()=>{ libF.loc='gym'; S.tab='library'; render(); };
  app.querySelectorAll('.goTab').forEach(a=>a.onclick=()=>{S.tab=a.dataset.tab;render();});
  app.querySelectorAll('.ai').forEach(b=> b.onclick=()=>aiReply(b.dataset.q));
}

/* tiny rule-based "AI coach" responses */
function aiReply(q){
  let msg='';
  if(q.includes('ядар')) msg='Зүгээр. Өнөөдөр хөнгөн өдөр болгоё: 15–20 мин сунгалт + хөнгөн алхалт. Маргааш эрчтэй эргэж ороорой.';
  else if(q.includes('Гэдэс')) msg='Гэдсийг "цэгцэлж" хасах боломжгүй — нийт өөх багасна. Калорийн дутагдал + Plank, Bicycle crunch, Mountain climber тогтмол хий.';
  else if(q.includes('20')) msg='20 минутын full-body: Squat, Push up, Glute bridge, Plank — тус бүр 3 set, амралт богино. Дасгалын сангаас сонгоорой.';
  else msg='Нуруунд ээлтэй: Glute bridge, Bird dog, Plank, Wall sit. Deadlift зэрэг ачаалал ихтэйг түр алгасаарай. Хурц өвдвөл эмчтэй уулз.';
  toast(msg);
}
