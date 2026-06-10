/* ---------- NUTRITION ---------- */
let actLevel=1.45;
let planDays=7;
let recipeF='all';
let recipeCat='all';

function consumedToday(){
  const log=todayLog();
  const t={kcal:0,protein:0,carb:0,fat:0};
  ['breakfast','lunch','dinner','snack'].forEach(slot=>{
    (log[slot]||[]).forEach(it=>{
      t.kcal+=it.kcal||0; t.protein+=it.protein||0; t.carb+=it.carb||0; t.fat+=it.fat||0;
    });
  });
  return t;
}

function renderNutrition(){
  const p=S.profile;
  const n=nutrition(p, actLevel);
  const b=bmi(p.weight, p.height);
  const cat=bmiCategory(b);
  const bpos=Math.min(100,Math.max(0,(b-15)/(40-15)*100));
  const acts=[['Сууринтай',1.3],['Дунд зэрэг',1.45],['Идэвхтэй',1.65],['Маш идэвхтэй',1.8]];
  const c=consumedToday();
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
          <div><span class="xs mut">Өнөөдөр идсэн</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:var(--acc);line-height:1">${c.kcal}</div>
            <span class="xs mut">/ ${n.cal} ккал зорилго (${n.label})</span></div>
        </div>
        <hr class="sep">
        <div class="macro"><b style="color:var(--coral)">${c.protein}г / ${n.protein}г</b><div class="bar"><i style="width:${pct(c.protein,n.protein)}%;background:var(--coral)"></i></div><span class="sm mut" style="width:64px">Уураг</span></div>
        <div class="macro"><b style="color:var(--acc)">${c.carb}г / ${n.carb}г</b><div class="bar"><i style="width:${pct(c.carb,n.carb)}%;background:var(--acc)"></i></div><span class="sm mut" style="width:64px">Нүүрс ус</span></div>
        <div class="macro"><b style="color:var(--warn)">${c.fat}г / ${n.fat}г</b><div class="bar"><i style="width:${pct(c.fat,n.fat)}%;background:var(--warn)"></i></div><span class="sm mut" style="width:64px">Өөх тос</span></div>
      </div>

      <div class="secttl"><h2>Өнөөдрийн тэмдэглэл</h2></div>
      <div id="diary"></div>

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

      <div class="secttl"><h2>Гэрийн нөөц</h2></div>
      <p class="mut sm" style="margin:0 0 12px">Гэртээ байгаа бүтээгдэхүүнээ тэмдэглээрэй — тэдгээрт тулгуурлан хоолны санаа гаргана.</p>
      <div id="pantry"></div>

      <div class="secttl"><h2>Хоолны санаа</h2></div>
      <div class="scrollrow" id="recipeF"></div>
      <div class="scrollrow" id="recipeCat" style="margin-top:6px"></div>
      <div id="recipelist" style="margin-top:12px"></div>

      <div class="secttl"><h2>Хоолны төлөвлөгөө</h2></div>
      <div class="chiprow" id="planDaysSel">
        <button class="chip ${planDays===7?'on':''}" data-d="7">7 хоног</button>
        <button class="chip ${planDays===30?'on':''}" data-d="30">30 хоног</button>
      </div>
      <div id="mealplan" style="margin-top:12px"></div>

      <p class="xs mut center" style="margin-top:16px">Тооцоо нь ойролцоо. Эрүүл мэндийн онцгой нөхцөлд мэргэжлийн хүнтэй зөвлөл.</p>
    </div>`;
  topWire();
  app.querySelectorAll('#acts .chip').forEach(c=>c.onclick=()=>{actLevel=+c.dataset.v; renderNutrition();});
  app.querySelectorAll('#planDaysSel .chip').forEach(c=>c.onclick=()=>{
    planDays=+c.dataset.d;
    app.querySelectorAll('#planDaysSel .chip').forEach(x=>x.classList.toggle('on',x===c));
    drawMealPlan();
  });
  drawDiary();
  drawPantry();
  drawRecipeFilter();
  drawRecipeCatFilter();
  drawRecipeList();
  drawMealPlan();
}

/* ---------- food diary ---------- */
function drawDiary(){
  const log=todayLog();
  const slots=['breakfast','lunch','dinner','snack'];
  document.getElementById('diary').innerHTML = slots.map(slot=>{
    const items=log[slot]||[];
    return `<div class="card" style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b>${MEAL_NAMES[slot]}</b>
        <button class="chip" data-slot="${slot}" data-add="1">+ Нэмэх</button>
      </div>
      ${items.length? items.map((it,i)=>{
        const thumb = it.photo ? `<img class="foodthumb" data-photo="${esc(it.photo)}" src="${esc(it.photo)}" alt="">` : `<div class="e">🍽</div>`;
        return `<div class="foodrow">${thumb}<div style="flex:1"><b>${esc(it.n)}</b><div class="xs mut">${it.kcal} ккал · Б${it.protein||0} Н${it.carb||0} Ө${it.fat||0}</div></div><button class="x" data-slot="${slot}" data-i="${i}">✕</button></div>`;
      }).join('')
       : `<p class="xs mut" style="margin:10px 0 0">Бүртгэл алга</p>`}
    </div>`;
  }).join('');
  document.querySelectorAll('#diary [data-add]').forEach(b=>b.onclick=()=>openAddFood(b.dataset.slot));
  document.querySelectorAll('#diary .x').forEach(b=>b.onclick=()=>removeLogItem(b.dataset.slot, +b.dataset.i));
  document.querySelectorAll('#diary .foodthumb').forEach(img=>img.onclick=()=>{
    const sheet=mkSheet();
    sheet.querySelector('.inner').innerHTML = `<div class="grab"></div><img src="${img.dataset.photo}" style="width:100%;border-radius:12px;margin-top:8px" alt="">`;
  });
}
function addLogItem(slot, item){
  todayLog()[slot].push(item);
  save();
  renderNutrition();
}
function removeLogItem(slot, idx){
  todayLog()[slot].splice(idx,1);
  save();
  renderNutrition();
}
function openAddFood(slot){
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:20px">${MEAL_NAMES[slot]} — хоол нэмэх</h2>
    <div class="askrow" style="margin-top:12px">
      <span class="sm mut" style="flex:1">📷 Хийсэн хоолныхоо зургийг хавсаргах (заавал биш)</span>
      <label class="iconbtn" for="diaryImg">📷</label>
      <input type="file" id="diaryImg" accept="image/*" hidden>
    </div>
    <div id="diaryImgPreview"></div>
    <input class="txin" id="foodSearch" placeholder="Жорын нэрээр хайх..." style="margin-top:12px">
    <div id="foodResults" style="margin-top:6px"></div>
    <hr class="sep">
    <div class="block">
      <div class="lab">Гараар оруулах</div>
      <input class="txin" id="mfName" placeholder="Хоолны нэр" style="margin-bottom:8px">
      <div class="grid g2">
        <input class="txin" id="mfKcal" type="number" placeholder="Ккал">
        <input class="txin" id="mfProtein" type="number" placeholder="Уураг (г)">
        <input class="txin" id="mfCarb" type="number" placeholder="Нүүрс ус (г)">
        <input class="txin" id="mfFat" type="number" placeholder="Өөх тос (г)">
      </div>
      <button class="btn p" id="mfAdd" style="margin-top:10px;width:100%">Нэмэх</button>
    </div>`;
  const results=sheet.querySelector('#foodResults');
  const search=sheet.querySelector('#foodSearch');

  let attachedFile=null;
  sheet.querySelector('#diaryImg').onchange=e=>{
    const f=e.target.files[0];
    const prev=sheet.querySelector('#diaryImgPreview');
    attachedFile=f||null;
    if(!f){ prev.innerHTML=''; return; }
    prev.innerHTML=`<div class="askpreview"><img src="${URL.createObjectURL(f)}" alt=""><span class="xs">Зураг хавсаргасан</span><button id="diaryImgX">✕</button></div>`;
    sheet.querySelector('#diaryImgX').onclick=()=>{ e.target.value=''; attachedFile=null; prev.innerHTML=''; };
  };

  function finishAdd(item, btn){
    if(!attachedFile){ addLogItem(slot, item); closeSheet(); return; }
    if(btn){ btn.textContent='Хуулж байна…'; btn.disabled=true; }
    uploadMealPhoto(attachedFile)
      .then(url=>{ item.photo=url; })
      .catch(()=>{ toast('Зураг хадгалах боломжгүй байна, хоол хэвээр нэмэгдлээ'); })
      .then(()=>{ addLogItem(slot, item); closeSheet(); });
  }

  function drawResults(){
    const q=search.value.trim().toLowerCase();
    const list = q ? RECIPES.filter(r=>r.n.toLowerCase().includes(q)) : RECIPES.filter(r=>r.meal.includes(slot));
    results.innerHTML = list.slice(0,8).map(r=>`<div class="foodrow" data-id="${r.id}" style="cursor:pointer"><div class="e">${r.e}</div><div style="flex:1"><b>${r.n}</b><div class="xs mut">${r.kcal} ккал · Уураг ${r.protein}г</div></div></div>`).join('') || `<p class="xs mut">Илэрц алга</p>`;
    results.querySelectorAll('.foodrow').forEach(row=>row.onclick=()=>{
      const r=RECIPES.find(x=>x.id===row.dataset.id);
      finishAdd({n:r.n, kcal:r.kcal, protein:r.protein, carb:r.carb, fat:r.fat, recipeId:r.id});
    });
  }
  drawResults();
  search.oninput=drawResults;
  sheet.querySelector('#mfAdd').onclick=()=>{
    const nm=sheet.querySelector('#mfName').value.trim();
    if(!nm){ toast('Хоолны нэрээ оруулна уу'); return; }
    finishAdd({
      n:nm,
      kcal:+sheet.querySelector('#mfKcal').value||0,
      protein:+sheet.querySelector('#mfProtein').value||0,
      carb:+sheet.querySelector('#mfCarb').value||0,
      fat:+sheet.querySelector('#mfFat').value||0,
    }, sheet.querySelector('#mfAdd'));
  };
}

/* ---------- pantry ---------- */
function drawPantry(){
  document.getElementById('pantry').innerHTML = PANTRY_GROUPS.map(g=>`
    <p class="xs mut" style="margin:10px 0 6px">${g.cat.toUpperCase()}</p>
    <div class="scrollrow">
      ${g.items.map(it=>`<button class="chip ${S.pantry.includes(it.tag)?'on':''}" data-tag="${it.tag}">${it.e} ${it.n}</button>`).join('')}
    </div>`).join('');
  document.querySelectorAll('#pantry .chip').forEach(c=>c.onclick=()=>{
    const tag=c.dataset.tag;
    if(S.pantry.includes(tag)) S.pantry=S.pantry.filter(t=>t!==tag);
    else S.pantry=[...S.pantry, tag];
    save();
    c.classList.toggle('on');
    drawMealPlan();
  });
}

/* ---------- recipe browser ---------- */
function drawRecipeFilter(){
  const opts=[['all','Бүгд'],['breakfast','Өглөө'],['lunch','Өдөр'],['dinner','Орой'],['snack','Зууш']];
  document.getElementById('recipeF').innerHTML = opts.map(([v,nm])=>`<button class="chip ${recipeF===v?'on':''}" data-v="${v}">${nm}</button>`).join('');
  document.querySelectorAll('#recipeF .chip').forEach(c=>c.onclick=()=>{
    recipeF=c.dataset.v;
    document.querySelectorAll('#recipeF .chip').forEach(x=>x.classList.toggle('on',x===c));
    drawRecipeList();
  });
}
function drawRecipeCatFilter(){
  const opts=[['all','Бүгд'], ...Object.entries(RECIPE_CATS)];
  document.getElementById('recipeCat').innerHTML = opts.map(([v,nm])=>`<button class="chip ${recipeCat===v?'on':''}" data-v="${v}">${nm}</button>`).join('');
  document.querySelectorAll('#recipeCat .chip').forEach(c=>c.onclick=()=>{
    recipeCat=c.dataset.v;
    document.querySelectorAll('#recipeCat .chip').forEach(x=>x.classList.toggle('on',x===c));
    drawRecipeList();
  });
}
function drawRecipeList(){
  const list = RECIPES.filter(r=>(recipeF==='all' || r.meal.includes(recipeF)) && (recipeCat==='all' || r.tags.includes(recipeCat)));
  document.getElementById('recipelist').innerHTML = list.map(r=>`
    <button class="excard" data-id="${r.id}">
      <div class="thumb">${r.e}</div>
      <div class="info">
        <b>${r.n}</b>
        <div class="tags">
          <span class="vtag">⏱ ${r.time} мин</span>
          <span class="vtag">${LVL_NAMES[r.lvl]}</span>
        </div>
        <span class="sr2">${r.kcal} ккал</span>
      </div>
      <div class="chev">›</div>
    </button>`).join('');
  document.querySelectorAll('#recipelist .excard').forEach(b=>b.onclick=()=>openRecipe(b.dataset.id));
}

/* ---------- meal plan ---------- */
function drawMealPlan(){
  const plan=generateMealPlan(S.pantry, planDays);
  const slots=['breakfast','lunch','dinner','snack'];
  document.getElementById('mealplan').innerHTML = plan.map((day,i)=>`
    <div class="card daycard" style="margin-top:10px">
      <b>${i+1}-р өдөр</b>
      <div class="daymeals">
        ${slots.map(slot=>{const r=day[slot]; return `<button class="dmeal" data-id="${r.id}"><span class="e">${r.e}</span><span class="n">${MEAL_NAMES[slot]}: ${r.n}</span><span class="k">${r.kcal} ккал</span></button>`;}).join('')}
      </div>
    </div>`).join('');
  document.querySelectorAll('#mealplan .dmeal').forEach(b=>b.onclick=()=>openRecipe(b.dataset.id));
}

/* ---------- recipe detail ---------- */
function openRecipe(id){
  const r=RECIPES.find(x=>x.id===id);
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <div class="bigthumb" style="display:grid;place-items:center;font-size:64px">${r.e}</div>
    <h2 class="disp" style="font-size:23px">${r.n}</h2>
    <div style="margin-top:8px">
      <span class="vtag">⏱ ${r.time} мин</span><span class="vtag">${LVL_NAMES[r.lvl]}</span>
      ${r.meal.map(m=>`<span class="vtag">${MEAL_NAMES[m]}</span>`).join('')}
      ${(r.tags||[]).map(t=>`<span class="vtag">${RECIPE_CATS[t]}</span>`).join('')}
    </div>
    <div class="kv">
      <div class="k"><b>${r.kcal}</b><span>Ккал</span></div>
      <div class="k"><b>${r.protein}г</b><span>Уураг</span></div>
      <div class="k"><b>${r.carb}г</b><span>Нүүрс ус</span></div>
      <div class="k"><b>${r.fat}г</b><span>Өөх тос</span></div>
    </div>
    <div class="block"><div class="lab">🛒 Орц</div><div class="note">${r.ingredients.map(esc).join('<br>')}</div></div>
    <div class="block"><div class="lab">📋 Хийх заавар</div><div class="note">${esc(r.steps)}</div></div>
    <a class="btn g" style="margin-top:14px;width:100%" href="${youtubeSearchUrl(r.n)}" target="_blank" rel="noopener">▶ YouTube-с заавар хайх</a>
    <div class="block"><div class="lab">➕ Тэмдэглэлд нэмэх</div>
      <div class="chiprow">
        ${r.meal.map(m=>`<button class="chip" data-slot="${m}">${MEAL_NAMES[m]}</button>`).join('')}
      </div>
    </div>`;
  sheet.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
    addLogItem(b.dataset.slot, {n:r.n, kcal:r.kcal, protein:r.protein, carb:r.carb, fat:r.fat, recipeId:r.id});
    closeSheet();
    toast('Тэмдэглэлд нэмлээ ✅');
  });
}
