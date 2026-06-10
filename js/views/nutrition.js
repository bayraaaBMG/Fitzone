/* ---------- NUTRITION ---------- */
let actLevel=1.45;
function renderNutrition(){
  const p=S.profile;
  const n=nutrition(p, actLevel);
  const b=bmi(p.weight, p.height);
  const cat=bmiCategory(b);
  const bpos=Math.min(100,Math.max(0,(b-15)/(40-15)*100));
  const acts=[['Сууринтай',1.3],['Дунд зэрэг',1.45],['Идэвхтэй',1.65],['Маш идэвхтэй',1.8]];
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>Хооллолт</h2></div>
      <p class="mut sm" style="margin:0 0 14px">${esc(p.name)} · ${p.weight}кг · ${goalName(p.goal)}</p>
      <p class="xs mut" style="margin:0 0 6px">ӨДРИЙН ИДЭВХ</p>
      <div class="scrollrow" id="acts">
        ${acts.map(([nm,v])=>`<button class="chip ${Math.abs(actLevel-v)<.01?'on':''}" data-v="${v}">${nm}</button>`).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><span class="xs mut">${n.label} калори</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:var(--acc);line-height:1">${n.cal}</div>
            <span class="xs mut">ккал / өдөр · хадгалах ${n.tdee}</span></div>
        </div>
        <hr class="sep">
        <div class="macro"><b style="color:var(--coral)">${n.protein}г</b><div class="bar"><i style="width:${pct(n.protein*4,n.cal)}%;background:var(--coral)"></i></div><span class="sm mut" style="width:64px">Уураг</span></div>
        <div class="macro"><b style="color:var(--acc)">${n.carb}г</b><div class="bar"><i style="width:${pct(n.carb*4,n.cal)}%;background:var(--acc)"></i></div><span class="sm mut" style="width:64px">Нүүрс ус</span></div>
        <div class="macro"><b style="color:var(--warn)">${n.fat}г</b><div class="bar"><i style="width:${pct(n.fat*9,n.cal)}%;background:var(--warn)"></i></div><span class="sm mut" style="width:64px">Өөх тос</span></div>
      </div>

      <div class="secttl"><h2>Биеийн жин (BMI)</h2></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><span class="xs mut">Таны үзүүлэлт</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:${cat.c};line-height:1">${b.toFixed(1)}</div>
            <span class="xs" style="color:${cat.c};font-weight:700">${cat.n}</span></div>
          <div class="xs mut" style="text-align:right">${p.height} см<br>${p.weight} кг</div>
        </div>
        <div class="bmibar"><div class="marker" style="left:${bpos}%"></div></div>
        <div class="bmiscale"><span>Дутуу</span><span>Хэвийн</span><span>Илүүдэл</span><span>Таргалалт</span></div>
      </div>

      <div class="secttl"><h2>Монгол хоолоо тохируул</h2></div>
      <div class="card">
        ${[
          ['🥟','Бууз','3–4 ширхэг + ногооны салат. Махан чанартай уураг сайн, гэхдээ гурил, тос ихтэй тул тоогоо барь.'],
          ['🍜','Цуйван','Хагас порц + илүү мах, ногоо нэмж гурилаа багасга. Уургаа өсгөнө.'],
          ['🥩','Шарсан мах','Уургийн гол эх үүсвэр. Тосыг нь халбагадаж, шарсан/чанасныг сонго.'],
          ['🥛','Тараг, аарц','Уураг, кальци өндөр. Чихэргүй цагаан тараг хамгийн зөв.'],
          ['🥚','Өндөг','Хямд, чанартай уураг. Өглөө 2–3 өндөг гайхалтай эхлэл.'],
          ['🌾','Овъёос','Удаан шингэдэг нүүрс ус. Өглөөний эрчим, удаан цатгана.'],
        ].map(([e,t,d])=>`<div class="foodrow"><div class="e">${e}</div><div><b>${t}</b><div class="xs mut" style="margin-top:2px">${d}</div></div></div>`).join('')}
      </div>
      <p class="xs mut center" style="margin-top:16px">Тооцоо нь ойролцоо. Эрүүл мэндийн онцгой нөхцөлд мэргэжлийн хүнтэй зөвлөл.</p>
    </div>`;
  topWire();
  app.querySelectorAll('#acts .chip').forEach(c=>c.onclick=()=>{actLevel=+c.dataset.v; renderNutrition();});
}
