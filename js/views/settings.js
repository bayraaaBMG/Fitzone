/* ---------- SETTINGS / PROFILE ---------- */
function openSettings(){
  const sdraft = {...S.profile, equip:[...(S.profile.equip||[])]};
  const sheet = mkSheet();
  paintSettings(sheet, sdraft);
}

function paintSettings(sheet, sdraft){
  const showEquip = sdraft.place!=='home';
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:22px; margin-bottom:14px">Тохиргоо</h2>
    <div class="field"><label>Нэр</label><input class="txin" id="st_name" value="${esc(sdraft.name||'')}"></div>
    <div class="field"><label>Хүйс</label>${chips(sdraft,'sex',[{v:'m',n:'Эрэгтэй',e:'♂'},{v:'f',n:'Эмэгтэй',e:'♀'}])}</div>
    <div class="inrow">
      <div class="field" style="flex:1"><label>Нас</label><input class="txin" id="st_age" type="number" inputmode="numeric" value="${sdraft.age||''}"></div>
      <div class="field" style="flex:1"><label>Өндөр (см)</label><input class="txin" id="st_h" type="number" inputmode="numeric" value="${sdraft.height||''}"></div>
      <div class="field" style="flex:1"><label>Жин (кг)</label><input class="txin" id="st_w" type="number" inputmode="numeric" value="${sdraft.weight||''}"></div>
    </div>
    <div class="field"><label>Зорилго</label>${chips(sdraft,'goal',GOALS.map(g=>({v:g.id,n:g.n,e:g.e})))}</div>
    <div class="field"><label>Дасгалын түвшин</label>${chips(sdraft,'level',[{v:1,n:'Анхан'},{v:2,n:'Дунд'},{v:3,n:'Ахисан'}])}</div>
    <div class="field"><label>Хаана дасгал хийх вэ?</label>${chips(sdraft,'place',[{v:'home',n:'Гэртээ',e:'🏠'},{v:'gym',n:'Жиймд',e:'🏋️'},{v:'both',n:'Аль алинд',e:'🔁'}])}</div>
    <div class="field"><label>Долоо хоногт хэдэн өдөр?</label>${chips(sdraft,'days',[2,3,4,5,6].map(d=>({v:d,n:d+' өдөр'})))}</div>
    <div class="field"><label>Өдөрт хэдэн минут?</label>${chips(sdraft,'minutes',[10,20,30,45,60].map(m=>({v:m,n:m+' мин'})))}</div>
    ${showEquip?`<div class="field"><label>Боломжтой тоног төхөөрөмж</label>${chips(sdraft,'equip',[
      {v:'dumbbell',n:'Гантель'},{v:'barbell',n:'Barbell'},{v:'machine',n:'Machine'},{v:'cable',n:'Cable'}
    ],true)}</div>`:''}
    <button class="btn p" id="st_save" style="margin-top:6px">Хадгалаад хөтөлбөр шинэчлэх</button>
    <button class="btn g" id="st_reset" style="margin-top:10px">Бүх өгөгдлийг арилгаж дахин эхлэх</button>
  `;

  const syncInputs=()=>{
    sdraft.name=(sheet.querySelector('#st_name').value||'').trim()||sdraft.name;
    sdraft.age=+sheet.querySelector('#st_age').value || sdraft.age;
    sdraft.height=+sheet.querySelector('#st_h').value || sdraft.height;
    sdraft.weight=+sheet.querySelector('#st_w').value || sdraft.weight;
  };

  wireChips(sheet, sdraft, ()=>{ syncInputs(); paintSettings(sheet, sdraft); });

  sheet.querySelector('#st_save').onclick=()=>{
    syncInputs();
    if(sdraft.place==='home') sdraft.equip=[];
    S.profile = {...sdraft};
    S.plan = generatePlan(S.profile);
    save();
    closeSheet();
    render();
    toast('Тохиргоо хадгалагдлаа ✓');
  };

  sheet.querySelector('#st_reset').onclick=()=>{
    if(!confirm('Бүх өгөгдлийг устгаад эхнээс эхлэх үү?')) return;
    S.profile=null; S.plan=null; S.weights=[]; S.completed=[]; S.tab='home';
    save();
    closeSheet();
    render();
  };
}
