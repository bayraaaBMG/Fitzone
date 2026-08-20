/* ---------- HOME ---------- */
function waterGoalMl(p){ return Math.round(p.weight*35/50)*50; } // ~35ml/kg, rounded to nearest 50ml
function todayWaterMl(){ return S.waterLog[today()] || 0; }

function nextActionFor(todayDay, consumed, nutGoal, waterMl, waterGoal){
  if(todayDay && !todayDay.done) return {label:t('na_start_workout', planDayTitle(todayDay)), action:'workout'};
  if(consumed.kcal < nutGoal.cal*0.4) return {label:'🍽 '+t('na_log_food'), action:'nutrition'};
  if(waterMl < waterGoal*0.5) return {label:'💧 '+t('na_drink_water'), action:'water'};
  if(!S.weights.some(w=>w.d===today())) return {label:'⚖ '+t('na_log_weight'), action:'progress'};
  return {label:t('na_all_done'), action:null};
}

function renderHome(){
  const p=S.profile;
  const next = S.plan.find(d=>!d.done) || S.plan[0];
  const nIdx = S.plan.indexOf(next);
  const doneCount = S.plan.filter(d=>d.done).length;
  const nut = nutrition(p, 1.45);

  const sched = weekSchedule(p.days);
  const todayIdx = (new Date().getDay()+6)%7; // Mon=0
  const todayPlanIdx = sched[todayIdx];
  const todayDay = todayPlanIdx>=0 ? S.plan[todayPlanIdx] : null;

  const consumed = consumedToday();
  const waterGoal = waterGoalMl(p);
  const waterMl = todayWaterMl();
  const streak = calcStreak();
  const na = nextActionFor(todayDay, consumed, nut, waterMl, waterGoal);

  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="hero" style="padding:24px 20px">
        <div class="eyebrow">${t('home_today')}</div>
        <h1 style="font-size:28px">${t('home_welcome')},<br><span class="y">${esc(p.name)}</span></h1>
        <p>${goalName(p.goal)} · ${p.place==='home'?t('onb_home'):p.place==='gym'?t('onb_gym'):t('home_both_places')} · ${t('home_days_per_week', p.days)}</p>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="grid g2">
          <div>
            <span class="xs mut">${t('home_today_workout')}</span>
            <div style="font-weight:700;font-size:15px;margin-top:4px">${todayDay ? planDayTitle(todayDay) : t('home_rest_day')}</div>
            ${todayDay?`<span class="xs mut">${t('home_today_duration')}: ~${planEstMin(todayDay)} ${t('unit_min')} ${todayDay.done?'· ✓':''}</span>`:''}
          </div>
          <div>
            <span class="xs mut">${t('home_today_food')}</span>
            <div style="font-weight:700;font-size:15px;margin-top:4px">${consumed.kcal} / ${nut.cal} ${t('unit_kcal')}</div>
            <span class="xs mut">${t('home_today_calorie_goal')}</span>
          </div>
        </div>
        <hr class="sep" style="margin:14px 0">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><span class="xs mut">${t('home_today_water_goal')}</span>
            <div style="font-weight:700;font-size:15px;margin-top:4px">${(waterMl/1000).toFixed(2)} / ${(waterGoal/1000).toFixed(1)} ${t('unit_liter')}</div>
            ${refBadge('efsa_water')}</div>
          <button class="btn g sm" id="addWater">+250${t('unit_ml')}</button>
        </div>
        <hr class="sep" style="margin:14px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span class="xs mut">${t('profile_streak')}: ${streak}🔥 · ${doneCount}/${p.days} ${t('profile_week_progress').toLowerCase()}</span>
        </div>
        <button class="btn p" id="nextActionBtn" ${na.action?'':'disabled'}>${na.label}</button>
      </div>

      ${installCardHTML()}

      <div class="secttl"><h2>${t('home_workout_section')}</h2></div>
      <div class="grid g2">
        <button class="tile acc" id="goHomeWO"><div class="ic">🏠</div><h3>${t('home_home_workout')}</h3><p>${t('home_home_workout_p')}</p></button>
        <button class="tile" id="goGymWO"><div class="ic">🏋️</div><h3>${t('home_gym_workout')}</h3><p>${t('home_gym_workout_p')}</p></button>
      </div>

      <div class="secttl"><h2>${t('home_next_workout')}</h2><a data-tab="plan" class="goTab">${t('home_all')}</a></div>
      <div class="card">
        <div class="dayhead" style="margin:0 0 12px;background:transparent;border:none;padding:0">
          <div class="n">${nIdx+1}</div>
          <div class="meta"><b>${planDayTitle(next)}</b><span>${next.ex.length} ${t('unit_exercises')} · ~${planEstMin(next)} ${t('unit_min')}</span></div>
        </div>
        ${next.ex.slice(0,3).map(e=>{const x=ex(e.id);return `
          <div class="exrow"><div class="thumb">${x.e}</div>
            <div class="info"><b>${x.n}</b><span>${M_NAMES[x.m]||''}</span></div>
            <div class="sr">${e.sets}×${e.reps}<small>set · reps</small></div></div>`;}).join('')}
        ${next.ex.length>3?`<p class="xs mut center" style="margin:10px 0 0">+${next.ex.length-3} ${t('unit_exercises')}</p>`:''}
      </div>

      <div class="secttl"><h2>${t('home_doctor')}</h2></div>
      <div class="card">
        <p class="sm mut" style="margin:0 0 12px">${t('doctor_intro')}</p>
        <div class="scrollrow" style="margin:0 0 12px; padding-bottom:0">
          ${['q_tired','q_shrink_belly','q_20min','q_knee','q_back','q_shoulder'].map(k=>
            `<button class="chip ai" data-q="${esc(t(k))}">💬 ${t(k)}</button>`).join('')}
        </div>
        <div class="askrow">
          <input class="txin" id="askInput" placeholder="${t('doctor_placeholder')}">
          <label class="iconbtn" for="askImg" title="${t('attach_photo')}">📷</label>
          <input type="file" id="askImg" accept="image/*" hidden>
          <button class="iconbtn acc" id="askBtn" aria-label="${t('send')}">→</button>
        </div>
        <div id="askPreview"></div>
        <div id="askResult"></div>
      </div>
      <p class="xs mut center" style="margin-top:20px">${t('disclaimer')}</p>
    </div>`;
  topWire();
  wireInstallCard(app);
  document.getElementById('goHomeWO').onclick=()=>{ libF.loc='home'; S.tab='library'; render(); };
  document.getElementById('goGymWO').onclick=()=>{ libF.loc='gym'; S.tab='library'; render(); };
  app.querySelectorAll('.goTab').forEach(a=>a.onclick=()=>{S.tab=a.dataset.tab;render();});

  document.getElementById('addWater').onclick=()=>{
    const d=today();
    S.waterLog[d]=(S.waterLog[d]||0)+250;
    save(); render();
  };
  const naBtn=document.getElementById('nextActionBtn');
  if(na.action) naBtn.onclick=()=>{
    if(na.action==='workout') openDay(todayPlanIdx);
    else if(na.action==='nutrition'){ S.tab='nutrition'; render(); }
    else if(na.action==='progress'){ S.tab='progress'; render(); }
    else if(na.action==='water'){ const d=today(); S.waterLog[d]=(S.waterLog[d]||0)+250; save(); render(); }
  };

  app.querySelectorAll('.ai').forEach(b=> b.onclick=()=>{ document.getElementById('askInput').value=b.dataset.q; askDoctor(); });
  document.getElementById('askBtn').onclick=askDoctor;
  document.getElementById('askInput').onkeydown=e=>{ if(e.key==='Enter') askDoctor(); };
  document.getElementById('askImg').onchange=e=>{
    const f=e.target.files[0];
    const prev=document.getElementById('askPreview');
    if(!f){ prev.innerHTML=''; return; }
    prev.innerHTML=`<div class="askpreview"><img src="${URL.createObjectURL(f)}" alt=""><span class="xs">${t('photo_attached')}</span><button id="askImgX">✕</button></div>`;
    document.getElementById('askImgX').onclick=()=>{ e.target.value=''; prev.innerHTML=''; };
  };
}

/* rule-based "doctor" advice — keyword matching, no real diagnosis */
function askDoctor(){
  const q=(document.getElementById('askInput').value||'').trim();
  const file=document.getElementById('askImg').files[0];
  let {text, ref} = S.lang==='en' ? healthAdviceEN(q) : healthAdviceMN(q);
  let imgHtml='';
  if(file){
    imgHtml=`<img src="${URL.createObjectURL(file)}" alt="">`;
    text += ' ' + t('doctor_photo_note');
  }
  document.getElementById('askResult').innerHTML = `<div class="askresp">${imgHtml}<p>${esc(text)}</p>
    <p class="xs mut" style="margin-top:10px">${t('doctor_disclaimer')} ${ref?refBadge(ref):''}</p></div>`;
}

function healthAdviceMN(q){
  const s=(q||'').toLowerCase();
  const has=(...ws)=>ws.some(w=>s.includes(w));
  if(!s) return {text:'Юу өвдөж байгаа эсвэл ямар асуулт байгаагаа дээрх талбарт бичнэ үү.'};
  if(has('ядар')) return {text:'Зүгээр. Өнөөдөр хөнгөн өдөр болгоё: 15–20 мин сунгалт + хөнгөн алхалт. Маргааш эрчтэй эргэж ороорой.'};
  if(has('гэдэс')) return {text:'Гэдсийг "цэгцэлж" хасах боломжгүй — нийт өөх багасна. Калорийн дутагдал + Plank, Bicycle crunch, Mountain climber тогтмол хий.', ref:'spot_reduction'};
  if(has('20')) return {text:'20 минутын full-body: Squat, Push up, Glute bridge, Plank — тус бүр 3 set, амралт богино. Дасгалын сангаас сонгоорой.'};
  if(has('цээж','амьсгаад','зүрх')) return {text:'⚠️ Дасгал хийж байхдаа цээжээр огцом өвдөх, амьсгаадах мэдрэмж гарвал шууд зогсоож амраарай — энэ нь зүрхтэй холбоотой байж болзошгүй тул яаралтай эмчид хандаарай.', ref:'aha_warning'};
  if(has('өвдөг','овдог')) return {text:'Өвдөгний эвгүйцэлтэй үед Squat, Lunge, үсрэлттэй дасгалуудыг түр алгасаарай. Glute bridge, хөнгөн Wall sit, сунгалт хий. Хөл шулуун дээр өвдвөл ачаалал/гүнзгийрэлтийг бууруул.'};
  if(has('нуруу','бэлхүүс','бэлхуус')) return {text:'Нурууны эвгүйцэлтэй үед Deadlift, жинтэй Squat, Sit up зэргийг алгасаж Glute bridge, Bird dog, Plank, зөөлөн сунгалт хий. Нуруугаа дугуйлахгүй, тэгш байлгаарай.'};
  if(has('мөр','мөрөн')) return {text:'Мөрний эвгүйцэлтэй үед Overhead press, Push up, Pike push up зэргийг түр алгасаж, өвдөлгүй хүрээнд хөнгөн сунгалт, Band дасгал хий.'};
  if(has('гартаа','гарын','бугуй','тохой','мутар')) return {text:'Гар/бугуй/тохойн эвгүйцэлтэй үед Push up, Curl, Pushdown зэргийг алгасаж доод биеийн дасгал (Squat, Lunge, Glute bridge, Plank-аа fist дээр) руу шилжээрэй.'};
  if(has('хөл','шилбэ','өсгий','осгий','шагай')) return {text:'Хөл/шагайн эвгүйцэлтэй үед Lunge, Jump, Calf raise, Burpee зэргийг алгасаж сууж/хэвтэж хийдэг дасгал (Glute bridge, Plank, Bird dog, дээд биеийн дасгал) руу шилжээрэй.'};
  if(has('хүзүү','хузуу')) return {text:'Хүзүүний эвгүйцэлтэй үед Crunch, хүнд Overhead дасгал хийхдээ хүзүүгээ чангалахгүй, толгойгоо төв байрлалд барь. Эвгүйцэл тогтмол үргэлжилбэл эмчид үзүүлээрэй.'};
  return {text:'Зорилго, дасгал эсвэл өвдөж буй хэсгээ дэлгэрэнгүй бичвэл тохирсон зөвлөмж өгье. Жишээ нь: "Өвдөг өвдөж байна, squat хийж болох уу?"'};
}

function healthAdviceEN(q){
  const s=(q||'').toLowerCase();
  const has=(...ws)=>ws.some(w=>s.includes(w));
  if(!s) return {text:'Tell me what hurts, or what your question is, in the field above.'};
  if(has('tired','exhaust','fatigue')) return {text:"That's fine. Let's make today light: 15–20 min of stretching + a light walk. Come back strong tomorrow."};
  if(has('belly','stomach','fat loss','gut')) return {text:'You can\'t "spot reduce" belly fat — overall body fat drops instead. Combine a calorie deficit with consistent Plank, Bicycle crunch, and Mountain climber.', ref:'spot_reduction'};
  if(has('20 min','20min','quick workout')) return {text:'20-minute full-body: Squat, Push up, Glute bridge, Plank — 3 sets each, short rests. Pick more from the exercise library.'};
  if(has('chest pain',"can't breathe",'heart','breathless')) return {text:"⚠️ If you feel sudden chest pain or breathlessness while training, stop and rest immediately — this could be heart-related, so seek urgent medical care.", ref:'aha_warning'};
  if(has('knee')) return {text:'With knee discomfort, skip Squat, Lunge, and jumping moves for now. Do Glute bridge, a light Wall sit, and stretching. Reduce load/depth if it hurts on a straight leg.'};
  if(has('back','lower back','spine')) return {text:'With back discomfort, skip Deadlift, loaded Squat, and Sit ups — do Glute bridge, Bird dog, Plank, and gentle stretching instead. Keep your back neutral, never rounded.'};
  if(has('shoulder')) return {text:'With shoulder discomfort, skip Overhead press, Push up, and Pike push up for now — stick to pain-free light stretching and band work.'};
  if(has('wrist','elbow','arm','hand')) return {text:'With wrist/elbow/arm discomfort, skip Push up, Curl, and Pushdown — switch to lower-body work (Squat, Lunge, Glute bridge, Plank on fists).'};
  if(has('ankle','calf','foot','shin')) return {text:'With ankle/foot discomfort, skip Lunge, jumps, Calf raise, and Burpee — switch to seated/lying moves (Glute bridge, Plank, Bird dog, upper-body work).'};
  if(has('neck')) return {text:"With neck discomfort, don't strain your neck during Crunches or heavy Overhead moves — keep your head neutral. See a doctor if it persists."};
  return {text:'Describe your goal, exercise, or what hurts in more detail and I\'ll suggest something. Example: "My knee hurts, can I still squat?"'};
}
