/* ---------- EXERCISE DETAIL ---------- */
function openExercise(id){
  const x=ex(id);
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <div class="bigthumb">${x.e}</div>
    <h2 class="disp" style="font-size:23px">${x.n}</h2>
    <div style="margin-top:8px"><span class="vtag">${x.loc==='home'?'🏠 Гэр':'🏋️ Жийм'}</span><span class="vtag">${M_NAMES[x.m]}</span><span class="vtag">${x.lvl===1?'Анхан':x.lvl===2?'Дунд':'Ахисан'}</span></div>
    <div class="kv">
      <div class="k"><b>~${x.kcal}</b><span>ккал/мин</span></div>
      <div class="k"><b>${x.eq==='none'?'—':x.eq}</b><span>Тоног</span></div>
      <div class="k"><b>${M_NAMES[x.m]}</b><span>Гол булчин</span></div>
    </div>
    <div class="block"><div class="lab">🎯 Ажиллах булчин</div><div class="note">${x.tgt}</div></div>
    <div class="block"><div class="lab">📐 Зөв техник</div><div class="note">${x.tech}</div></div>
    <div class="block"><div class="lab">⚠ Түгээмэл алдаа</div><div class="note warn">${x.err}</div></div>
    <div class="block"><div class="lab">🔁 Хувилбар</div>
      <div class="note">Хөнгөн: <b>${x.easy}</b><br>Хүнд: <b>${x.hard}</b></div></div>`;
}
