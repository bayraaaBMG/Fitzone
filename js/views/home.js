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

      <div class="secttl"><h2>Эмчийн зөвлөгөө 🩺</h2></div>
      <div class="card">
        <p class="sm mut" style="margin:0 0 12px">Юу өвдөж, эвгүй байгаагаа бичээрэй — тохирсон зөвлөмж өгье. Хүсвэл зураг хавсаргаж болно.</p>
        <div class="scrollrow" style="margin:0 0 12px; padding-bottom:0">
          ${['Өнөөдөр ядарч байна','Гэдэс багасгах','20 минутын дасгал','Өвдөг өвдөж байна','Нуруу өвдөж байна','Мөр өвдөж байна'].map(q=>
            `<button class="chip ai" data-q="${esc(q)}">💬 ${q}</button>`).join('')}
        </div>
        <div class="askrow">
          <input class="txin" id="askInput" placeholder="Жишээ: Өвдөг өвдөж байна, squat хийж болох уу?">
          <label class="iconbtn" for="askImg" title="Зураг хавсаргах">📷</label>
          <input type="file" id="askImg" accept="image/*" hidden>
          <button class="iconbtn acc" id="askBtn" aria-label="Илгээх">→</button>
        </div>
        <div id="askPreview"></div>
        <div id="askResult"></div>
      </div>
      <p class="xs mut center" style="margin-top:20px">Эмчилгээний зөвлөгөө биш. Гэмтэл, өвчтэй бол эмчтэйгээ зөвлөл.</p>
    </div>`;
  topWire();
  document.getElementById('goNext').onclick=()=>openDay(nIdx);
  document.getElementById('goHomeWO').onclick=()=>{ libF.loc='home'; S.tab='library'; render(); };
  document.getElementById('goGymWO').onclick=()=>{ libF.loc='gym'; S.tab='library'; render(); };
  app.querySelectorAll('.goTab').forEach(a=>a.onclick=()=>{S.tab=a.dataset.tab;render();});
  app.querySelectorAll('.ai').forEach(b=> b.onclick=()=>{ document.getElementById('askInput').value=b.dataset.q; askDoctor(); });
  document.getElementById('askBtn').onclick=askDoctor;
  document.getElementById('askInput').onkeydown=e=>{ if(e.key==='Enter') askDoctor(); };
  document.getElementById('askImg').onchange=e=>{
    const f=e.target.files[0];
    const prev=document.getElementById('askPreview');
    if(!f){ prev.innerHTML=''; return; }
    prev.innerHTML=`<div class="askpreview"><img src="${URL.createObjectURL(f)}" alt=""><span class="xs">Зураг хавсаргасан</span><button id="askImgX">✕</button></div>`;
    document.getElementById('askImgX').onclick=()=>{ e.target.value=''; prev.innerHTML=''; };
  };
}

/* rule-based "doctor" advice — keyword matching, no real diagnosis */
function askDoctor(){
  const q=(document.getElementById('askInput').value||'').trim();
  const file=document.getElementById('askImg').files[0];
  let msg=healthAdvice(q);
  let imgHtml='';
  if(file){
    imgHtml=`<img src="${URL.createObjectURL(file)}" alt="">`;
    msg += ' Хавсаргасан зургийг автоматаар шинжлэх боломжгүй ч энэ нь эмчид үзүүлэхэд тань хэрэг болно.';
  }
  document.getElementById('askResult').innerHTML = `<div class="askresp">${imgHtml}<p>${esc(msg)}</p>
    <p class="xs mut" style="margin-top:10px">⚠️ Энэ бол ерөнхий зөвлөмж — оношлогоо биш. Шинж тэмдэг үргэлжилбэл/хүндэрвэл эмчид заавал үзүүлээрэй.</p></div>`;
}

function healthAdvice(q){
  const t=(q||'').toLowerCase();
  const has=(...ws)=>ws.some(w=>t.includes(w));
  if(!t) return 'Юу өвдөж байгаа эсвэл ямар асуулт байгаагаа дээрх талбарт бичнэ үү.';
  if(has('ядар')) return 'Зүгээр. Өнөөдөр хөнгөн өдөр болгоё: 15–20 мин сунгалт + хөнгөн алхалт. Маргааш эрчтэй эргэж ороорой.';
  if(has('гэдэс')) return 'Гэдсийг "цэгцэлж" хасах боломжгүй — нийт өөх багасна. Калорийн дутагдал + Plank, Bicycle crunch, Mountain climber тогтмол хий.';
  if(has('20')) return '20 минутын full-body: Squat, Push up, Glute bridge, Plank — тус бүр 3 set, амралт богино. Дасгалын сангаас сонгоорой.';
  if(has('цээж','амьсгаад','зүрх')) return '⚠️ Дасгал хийж байхдаа цээжээр огцом өвдөх, амьсгаадах мэдрэмж гарвал шууд зогсоож амраарай — энэ нь зүрхтэй холбоотой байж болзошгүй тул яаралтай эмчид хандаарай.';
  if(has('өвдөг','овдог')) return 'Өвдөгний эвгүйцэлтэй үед Squat, Lunge, үсрэлттэй дасгалуудыг түр алгасаарай. Glute bridge, хөнгөн Wall sit, сунгалт хий. Хөл шулуун дээр өвдвөл ачаалал/гүнзгийрэлтийг бууруул.';
  if(has('нуруу','бэлхүүс','бэлхуус')) return 'Нурууны эвгүйцэлтэй үед Deadlift, жинтэй Squat, Sit up зэргийг алгасаж Glute bridge, Bird dog, Plank, зөөлөн сунгалт хий. Нуруугаа дугуйлахгүй, тэгш байлгаарай.';
  if(has('мөр','мөрөн')) return 'Мөрний эвгүйцэлтэй үед Overhead press, Push up, Pike push up зэргийг түр алгасаж, өвдөлгүй хүрээнд хөнгөн сунгалт, Band дасгал хий.';
  if(has('гартаа','гарын','бугуй','тохой','мутар')) return 'Гар/бугуй/тохойн эвгүйцэлтэй үед Push up, Curl, Pushdown зэргийг алгасаж доод биеийн дасгал (Squat, Lunge, Glute bridge, Plank-аа fist дээр) руу шилжээрэй.';
  if(has('хөл','шилбэ','өсгий','осгий','шагай')) return 'Хөл/шагайн эвгүйцэлтэй үед Lunge, Jump, Calf raise, Burpee зэргийг алгасаж сууж/хэвтэж хийдэг дасгал (Glute bridge, Plank, Bird dog, дээд биеийн дасгал) руу шилжээрэй.';
  if(has('хүзүү','хузуу')) return 'Хүзүүний эвгүйцэлтэй үед Crunch, хүнд Overhead дасгал хийхдээ хүзүүгээ чангалахгүй, толгойгоо төв байрлалд барь. Эвгүйцэл тогтмол үргэлжилбэл эмчид үзүүлээрэй.';
  return 'Зорилго, дасгал эсвэл өвдөж буй хэсгээ дэлгэрэнгүй бичвэл тохирсон зөвлөмж өгье. Жишээ нь: "Өвдөг өвдөж байна, squat хийж болох уу?"';
}
