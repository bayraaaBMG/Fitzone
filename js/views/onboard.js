/* ---------- ONBOARDING ---------- */
let draft = {sex:'m', goal:'fatloss', level:1, place:'home', days:3, minutes:30, equip:[]};
let step = 0;
function renderOnboard(){
  if(step===0){
    app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div></div>
    <div class="view">
      <div class="hero">
        <div class="eyebrow">Гэр &amp; Жийм · Монгол</div>
        <h1>Гэртээ ч, жиймд ч <span class="y">өөрт тохирсон</span> дасгалаа эхлүүл</h1>
        <p>Зорилго, түвшин, цагаа хэлээд хувийн долоо хоногийн хөтөлбөрөө аваарай. Монгол хоол, Монгол нөхцөлд тааруулсан.</p>
        <div class="stats">
          <div><b>${EX.length}+</b><span>Дасгал</span></div>
          <div><b>2–6</b><span>Өдөр/долоо хоног</span></div>
          <div><b>10–60</b><span>Минут</span></div>
        </div>
      </div>
      <div style="margin-top:18px"><button class="btn p" id="start">Эхлэх — 1 минут ⚡</button></div>
      <div class="grid g2" style="margin-top:14px">
        <div class="tile"><div class="ic">🏠</div><h3>Гэрийн дасгал</h3><p>Тоног төхөөрөмжгүй ч болно</p></div>
        <div class="tile"><div class="ic">🏋️</div><h3>Жийм хөтөлбөр</h3><p>PPL, Upper/Lower, Full body</p></div>
        <div class="tile"><div class="ic">📈</div><h3>Ахиц хянах</h3><p>Жин, streak, график</p></div>
        <div class="tile acc"><div class="ic">🍳</div><h3>Монгол хоол</h3><p>Бууз, цуйван, тарагаа тохируул</p></div>
      </div>
      <p class="xs mut center" style="margin-top:20px">Эмчилгээний зөвлөгөө биш. Гэмтэл, өвчтэй бол эмчтэйгээ зөвлөл.</p>
    </div>`;
    document.getElementById('start').onclick=()=>{ step=1; renderOnboard(); };
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
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">Чиний тухай</h2>
    <p class="mut sm" style="margin:0 0 22px">Калори, ачааллыг зөв тооцоход хэрэгтэй.</p>
    <div class="field"><label>Нэр</label><input class="txin" id="f_name" placeholder="Жишээ: Бат" value="${draft.name||''}"></div>
    <div class="field"><label>Хүйс</label>${chips(draft,'sex',[{v:'m',n:'Эрэгтэй',e:'♂'},{v:'f',n:'Эмэгтэй',e:'♀'}])}</div>
    <div class="inrow">
      <div class="field" style="flex:1"><label>Нас</label><input class="txin" id="f_age" type="number" inputmode="numeric" placeholder="22" value="${draft.age||''}"></div>
      <div class="field" style="flex:1"><label>Өндөр (см)</label><input class="txin" id="f_h" type="number" inputmode="numeric" placeholder="175" value="${draft.height||''}"></div>
      <div class="field" style="flex:1"><label>Жин (кг)</label><input class="txin" id="f_w" type="number" inputmode="numeric" placeholder="82" value="${draft.weight||''}"></div>
    </div>
    <button class="btn p" id="next1">Үргэлжлүүлэх</button>`;
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
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">Зорилго &amp; түвшин</h2>
    <p class="mut sm" style="margin:0 0 22px">Хөтөлбөрийн set, reps, амралтыг үүгээр тааруулна.</p>
    <div class="field"><label>Зорилго</label>${chips(draft,'goal',GOALS.map(g=>({v:g.id,n:g.n,e:g.e})))}</div>
    <div class="field"><label>Дасгалын түвшин</label>${chips(draft,'level',[{v:1,n:'Анхан'},{v:2,n:'Дунд'},{v:3,n:'Ахисан'}])}</div>
    <div class="field"><label>Хаана дасгал хийх вэ?</label>${chips(draft,'place',[{v:'home',n:'Гэртээ',e:'🏠'},{v:'gym',n:'Жиймд',e:'🏋️'},{v:'both',n:'Аль алинд',e:'🔁'}])}</div>
    <button class="btn p" id="next2">Үргэлжлүүлэх</button>`;
  wireChips(app, draft, onboardChipChange);
  document.getElementById('next2').onclick=()=>{ step=3; renderOnboard(); };
}
function renderS3(){
  const showEquip = draft.place!=='home';
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">Хуваарь &amp; тоног</h2>
    <p class="mut sm" style="margin:0 0 22px">Боломжит цаг, төхөөрөмждөө тааруулъя.</p>
    <div class="field"><label>Долоо хоногт хэдэн өдөр?</label>${chips(draft,'days',[2,3,4,5,6].map(d=>({v:d,n:d+' өдөр'})))}</div>
    <div class="field"><label>Өдөрт хэдэн минут?</label>${chips(draft,'minutes',[10,20,30,45,60].map(m=>({v:m,n:m+' мин'})))}</div>
    ${showEquip?`<div class="field"><label>Боломжтой тоног төхөөрөмж</label>${chips(draft,'equip',[
      {v:'dumbbell',n:'Гантель'},{v:'barbell',n:'Barbell'},{v:'machine',n:'Machine'},{v:'cable',n:'Cable'}
    ],true)}<p class="xs mut" style="margin-top:8px">Юу ч сонгохгүй бол суурь хувилбараар төлөвлөнө.</p></div>`:''}
    <button class="btn p" id="finish">Хөтөлбөрөө гаргах 🚀</button>`;
  wireChips(app, draft, onboardChipChange);
  document.getElementById('finish').onclick=()=>{
    S.profile = {...draft};
    S.plan = generatePlan(S.profile);
    S.tab='plan';
    save(); render();
    toast('Хувийн хөтөлбөр бэлэн боллоо 🎉');
  };
}
