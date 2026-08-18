/* ---------- ONBOARDING ---------- */
let draft = {sex:'m', goal:'fatloss', level:1, place:'home', days:3, minutes:30, equip:[]};
let step = 0;
function renderOnboard(){
  if(step===0){
    app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div></div>
    <div class="view">
      <div class="hero">
        <div class="eyebrow">${t('onb_intro_eyebrow')}</div>
        <h1>${t('onb_intro_h1')}</h1>
        <p>${t('onb_intro_p')}</p>
        <div class="stats">
          <div><b>${EX.length}+</b><span>Дасгал</span></div>
          <div><b>2–6</b><span>Өдөр/долоо хоног</span></div>
          <div><b>10–60</b><span>Минут</span></div>
        </div>
      </div>
      <div style="margin-top:18px"><button class="btn p" id="start">${t('onb_start')}</button></div>
      <div class="grid g2" style="margin-top:14px">
        <button class="tile intro"><div class="ic">🏠</div><h3>Гэрийн дасгал</h3><p>Тоног төхөөрөмжгүй ч болно</p></button>
        <button class="tile intro"><div class="ic">🏋️</div><h3>Жийм хөтөлбөр</h3><p>PPL, Upper/Lower, Full body</p></button>
        <button class="tile intro"><div class="ic">📈</div><h3>Ахиц хянах</h3><p>Жин, streak, график</p></button>
        <button class="tile acc intro"><div class="ic">🍳</div><h3>Монгол хоол</h3><p>Бууз, цуйван, тарагаа тохируул</p></button>
      </div>
      <p class="xs mut center" style="margin-top:20px">Эмчилгээний зөвлөгөө биш. Гэмтэл, өвчтэй бол эмчтэйгээ зөвлөл.</p>
    </div>`;
    const goStart=()=>{ step=1; renderOnboard(); };
    document.getElementById('start').onclick=goStart;
    app.querySelectorAll('.tile.intro').forEach(t=> t.onclick=goStart);
    return;
  }
  // multi-step form
  const steps = [renderS1, renderS2, renderS3];
  app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div>
      <button class="chip" id="back" style="margin-left:auto">‹ Буцах</button></div>
    <div class="view">
      <div class="seg" style="margin-bottom:22px">
        ${[1,2,3].map(i=>`<div class="step ${i<=step?'on':''}"></div>`).join('')}
      </div>
      <div id="formbody"></div>
    </div>`;
  document.getElementById('back').onclick=()=>{ step--; if(step<1){step=0;} renderOnboard(); };
  steps[step-1]();
}

function onboardChipChange(){
  // keep typed text/number fields before re-rendering (e.g. equipment visibility)
  const name=document.getElementById('f_name'); if(name) draft.name=name.value;
  const age=document.getElementById('f_age'); if(age) draft.age=age.value;
  const h=document.getElementById('f_h'); if(h) draft.height=h.value;
  const w=document.getElementById('f_w'); if(w) draft.weight=w.value;
  const cur=step; renderOnboard(); step=cur;
}

function renderS1(){
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s1_h')}</h2>
    <p class="mut sm" style="margin:0 0 22px">${t('onb_s1_p')}</p>
    <div class="field"><label>${t('onb_name')}</label><input class="txin" id="f_name" placeholder="Жишээ: Бат" value="${draft.name||''}"></div>
    <div class="field"><label>${t('onb_sex')}</label>${chips(draft,'sex',[{v:'m',n:t('onb_male'),e:'♂'},{v:'f',n:t('onb_female'),e:'♀'}])}</div>
    <div class="inrow">
      <div class="field" style="flex:1"><label>${t('onb_age')}</label><input class="txin" id="f_age" type="number" inputmode="numeric" placeholder="22" value="${draft.age||''}"></div>
      <div class="field" style="flex:1"><label>${t('onb_height')}</label><input class="txin" id="f_h" type="number" inputmode="numeric" placeholder="175" value="${draft.height||''}"></div>
      <div class="field" style="flex:1"><label>${t('onb_weight')}</label><input class="txin" id="f_w" type="number" inputmode="numeric" placeholder="82" value="${draft.weight||''}"></div>
    </div>
    <button class="btn p" id="next1">${t('continue')}</button>`;
  wireChips(app, draft, onboardChipChange);
  document.getElementById('next1').onclick=()=>{
    draft.name=(document.getElementById('f_name').value||'').trim()||'Хэрэглэгч';
    draft.age=+document.getElementById('f_age').value||25;
    draft.height=+document.getElementById('f_h').value||172;
    draft.weight=+document.getElementById('f_w').value||75;
    step=2; renderOnboard();
  };
}
function renderS2(){
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s2_h')}</h2>
    <p class="mut sm" style="margin:0 0 22px">${t('onb_s2_p')}</p>
    <div class="field"><label>${t('onb_goal')}</label>${chips(draft,'goal',GOALS.map(g=>({v:g.id,n:g.n,e:g.e})))}</div>
    <div class="field"><label>${t('onb_level')}</label>${chips(draft,'level',[{v:1,n:t('onb_lvl1')},{v:2,n:t('onb_lvl2')},{v:3,n:t('onb_lvl3')}])}</div>
    <div class="field"><label>${t('onb_place')}</label>${chips(draft,'place',[{v:'home',n:t('onb_home'),e:'🏠'},{v:'gym',n:t('onb_gym'),e:'🏋️'},{v:'both',n:t('onb_both'),e:'🔁'}])}</div>
    <button class="btn p" id="next2">${t('continue')}</button>`;
  wireChips(app, draft, onboardChipChange);
  document.getElementById('next2').onclick=()=>{ step=3; renderOnboard(); };
}
function renderS3(){
  const showEquip = draft.place!=='home';
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s3_h')}</h2>
    <p class="mut sm" style="margin:0 0 22px">${t('onb_s3_p')}</p>
    <div class="field"><label>${t('onb_days')}</label>${chips(draft,'days',[2,3,4,5,6].map(d=>({v:d,n:d+' өдөр'})))}</div>
    <div class="field"><label>${t('onb_minutes')}</label>${chips(draft,'minutes',[10,20,30,45,60].map(m=>({v:m,n:m+' мин'})))}</div>
    ${showEquip?`<div class="field"><label>${t('onb_equip')}</label>${chips(draft,'equip',[
      {v:'dumbbell',n:'Гантель'},{v:'barbell',n:'Barbell'},{v:'machine',n:'Machine'},{v:'cable',n:'Cable'}
    ],true)}<p class="xs mut" style="margin-top:8px">Юу ч сонгохгүй бол суурь хувилбараар төлөвлөнө.</p></div>`:''}
    <button class="btn p" id="finish">${t('onb_finish')}</button>`;
  wireChips(app, draft, onboardChipChange);
  document.getElementById('finish').onclick=()=>{
    S.profile = {...draft, joinedAt: today()};
    S.plan = generatePlan(S.profile);
    S.tab='plan';
    save(); render();
    toast('Хувийн хөтөлбөр бэлэн боллоо 🎉');
  };
}
