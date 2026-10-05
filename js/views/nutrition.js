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
  const acts=[[t('act_sedentary'),1.3],[t('act_moderate'),1.45],[t('act_active'),1.65],[t('act_very_active'),1.8]];
  const c=consumedToday();
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>${t('nut_title')}</h2></div>
      <p class="mut sm" style="margin:0 0 14px">${esc(p.name)} · ${p.weight}${t('unit_kg')} · ${goalName(p.goal)}</p>
      <p class="xs mut" style="margin:0 0 6px">${t('nut_activity')}</p>
      <div class="scrollrow" id="acts">
        ${acts.map(([nm,v])=>`<button class="chip ${Math.abs(actLevel-v)<.01?'on':''}" data-v="${v}">${nm}</button>`).join('')}
      </div>

      <div class="card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><span class="xs mut">${t('nut_today_eaten')}</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:var(--acc-ink);line-height:1">${c.kcal}</div>
            <span class="xs mut">/ ${n.cal} ${t('unit_kcal')} ${t('goal_word')} (${n.label})</span></div>
        </div>
        <hr class="sep">
        <div class="macro"><b style="color:var(--coral)">${c.protein}${t('unit_g')} / ${n.protein}${t('unit_g')}</b><div class="bar"><i style="width:${pct(c.protein,n.protein)}%;background:var(--coral)"></i></div><span class="sm mut" style="width:64px">${t('macro_protein')}</span></div>
        <div class="macro"><b style="color:var(--acc-ink)">${c.carb}${t('unit_g')} / ${n.carb}${t('unit_g')}</b><div class="bar"><i style="width:${pct(c.carb,n.carb)}%;background:var(--acc)"></i></div><span class="sm mut" style="width:64px">${t('macro_carb')}</span></div>
        <div class="macro"><b style="color:var(--warn)">${c.fat}${t('unit_g')} / ${n.fat}${t('unit_g')}</b><div class="bar"><i style="width:${pct(c.fat,n.fat)}%;background:var(--warn)"></i></div><span class="sm mut" style="width:64px">${t('macro_fat')}</span></div>
        <p class="xs mut" style="margin:10px 0 0">${refBadge('mifflin_stjeor','issn_protein','amdr_fat')}</p>
      </div>

      ${dayAdviceHTML()}

      <div class="secttl"><h2>${t('nut_diary')}</h2></div>
      <div id="diary"></div>

      <div class="secttl"><h2>${t('nut_bmi')}</h2></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><span class="xs mut">${t('your_reading')}</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:${cat.c};line-height:1">${b.toFixed(1)}</div>
            <span class="xs" style="color:${cat.c};font-weight:700">${cat.n}</span></div>
          <div class="xs mut" style="text-align:right">${p.height} ${t('unit_cm')}<br>${p.weight} ${t('unit_kg')}</div>
        </div>
        <div class="bmibar"><div class="marker" style="left:${bpos}%"></div></div>
        <div class="bmiscale"><span>${t('bmi_underweight')}</span><span>${t('bmi_normal')}</span><span>${t('bmi_overweight')}</span><span>${t('bmi_obese')}</span></div>
        <p class="xs mut" style="margin:10px 0 0">${refBadge('who_bmi')}</p>
      </div>

      <div class="secttl"><h2>${t('nut_pantry')}</h2></div>
      <p class="mut sm" style="margin:0 0 12px">${t('pantry_intro')}</p>
      <div id="pantry"></div>

      <div class="secttl"><h2>${t('fadv_pantry_title')}</h2></div>
      <div id="pantryPicks"></div>

      <div class="secttl"><h2>${t('nut_recipes')}</h2></div>
      <p class="mut sm" style="margin:0 0 10px">${t('recipes_intro')}</p>
      <div class="scrollrow" id="recipeF"></div>
      <div class="scrollrow" id="recipeCat" style="margin-top:6px"></div>
      <div id="recipelist" style="margin-top:12px"></div>

      <div class="secttl"><h2>${t('nut_mealplan')}</h2></div>
      <div class="chiprow" id="planDaysSel">
        <button class="chip ${planDays===7?'on':''}" data-d="7">7 ${t('unit_days_word')}</button>
        <button class="chip ${planDays===30?'on':''}" data-d="30">30 ${t('unit_days_word')}</button>
      </div>
      <div id="mealplan" style="margin-top:12px"></div>

      <p class="xs mut center" style="margin-top:16px">${t('nut_footer_note')}</p>
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
  drawPantryPicks();
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
        <button class="chip" data-slot="${slot}" data-add="1">+ ${t('add')}</button>
      </div>
      ${items.length? items.map((it,i)=>{
        const thumb = it.photo ? `<img class="foodthumb" data-photo="${esc(it.photo)}" src="${esc(it.photo)}" alt="">` : `<div class="e">🍽</div>`;
        return `<div class="foodrow">${thumb}<div style="flex:1"><b>${esc(it.n)}</b><div class="xs mut">${it.kcal} ${t('unit_kcal')} · ${t('abbr_p')}${it.protein||0} ${t('abbr_c')}${it.carb||0} ${t('abbr_f')}${it.fat||0}</div></div><button class="x" data-slot="${slot}" data-i="${i}" aria-label="${t('a11y_remove')}">✕</button></div>`;
      }).join('')
       : `<p class="xs mut" style="margin:10px 0 0">${t('no_entries')}</p>`}
    </div>`;
  }).join('');
  document.querySelectorAll('#diary [data-add]').forEach(b=>b.onclick=()=>openAddFood(b.dataset.slot));
  document.querySelectorAll('#diary .x').forEach(b=>b.onclick=()=>removeLogItem(b.dataset.slot, +b.dataset.i));
  document.querySelectorAll('#diary .foodthumb').forEach(img=>img.onclick=()=>{
    const sheet=mkSheet();
    sheet.querySelector('.inner').innerHTML = `<div class="grab"></div><img src="${esc(img.dataset.photo)}" style="width:100%;border-radius:12px;margin-top:8px" alt="">`;
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
/* one line under the macro bars: what today still needs */
function dayAdviceHTML(){
  const a = typeof dayAdvice === 'function' ? dayAdvice() : null;
  if(!a) return '';
  return `<div class="fadv day ${a.band}" style="margin-top:12px">
    <div class="fadv-head"><span class="fadv-dot ${a.band}"></span><b>${t(a.key, ...a.args)}</b></div>
  </div>`;
}

/* ---------- the verdict block the sheets share ---------- */
function foodVerdictHTML(item, opts){
  const o = opts || {};
  const v = typeof foodVerdict === 'function' ? foodVerdict(item, o) : null;
  if(!v) return '';
  const swaps = (o.swaps === false) ? [] : foodSwaps(item, {slot:o.slot, count:3});
  const swapHTML = (v.band === 'good' || !swaps.length) ? '' : `
    <div class="fadv-swaps">
      <div class="lab">${t('fadv_swap_title')}</div>
      ${swaps.map(s => `<button class="fadv-swap" data-recipe="${s.recipe.id}">
        <span class="thumb">${typeof exerciseThumbHTML === 'function' ? '' : ''}<span class="fadv-dot ${s.verdict.band}"></span></span>
        <span class="fadv-swapmain"><b>${esc(s.recipe.n)}</b>
          <small>${s.recipe.kcal} ${t('unit_kcal')} · ${t('macro_protein')} ${s.recipe.protein}${t('unit_g')}${s.haveAll ? ' · ' + t('fadv_have_all') : ''}</small></span>
        <span class="fadv-delta ${s.dKcal <= 0 ? 'down' : 'up'}">${s.dKcal > 0 ? '+' : ''}${s.dKcal} ${t('unit_kcal')}</span>
      </button>`).join('')}
    </div>`;
  return `<div class="fadv ${v.band}">
    <div class="fadv-head"><span class="fadv-dot ${v.band}"></span><b>${t(v.headline)}</b></div>
    <ul class="fadv-reasons">${v.reasons.map(r => `<li>${t(r.key, ...r.args)}</li>`).join('')}</ul>
    ${swapHTML}
    <p class="xs mut" style="margin:8px 0 0">${t('fadv_disclaimer')}</p>
  </div>`;
}
function wireFoodVerdict(root){
  root.querySelectorAll('.fadv-swap[data-recipe]').forEach(b => b.onclick = () => openRecipe(b.dataset.recipe));
}

function openAddFood(slot){
  const sheet=mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:20px">${MEAL_NAMES[slot]} — ${t('add_food')}</h2>
    <input class="txin" id="foodSearch" placeholder="${t('food_search_placeholder')}" aria-label="${t('food_search_placeholder')}"
      autocomplete="off" style="margin-top:12px">
    <div id="foodResults" style="margin-top:10px"></div>
    <div id="foodAdvice"></div>
    <hr class="sep">
    <details class="foodmore">
      <summary>${t('manual_entry')}</summary>
      <div class="askrow" style="margin-top:10px">
        <span class="sm mut" style="flex:1">${t('attach_meal_photo')}</span>
        <label class="iconbtn" for="diaryImg" aria-label="${t('attach_meal_photo')}">+</label>
        <input type="file" id="diaryImg" accept="image/*" hidden>
      </div>
      <div id="diaryImgPreview"></div>
      <input class="txin" id="mfName" placeholder="${t('food_name_placeholder')}" aria-label="${t('food_name_placeholder')}" style="margin:10px 0 8px">
      <div class="grid g2">
        <input class="txin" id="mfKcal" type="number" inputmode="numeric" placeholder="${t('unit_kcal')}" aria-label="${t('unit_kcal')}">
        <input class="txin" id="mfProtein" type="number" inputmode="numeric" placeholder="${t('macro_protein')} (${t('unit_g')})" aria-label="${t('macro_protein')}">
        <input class="txin" id="mfCarb" type="number" inputmode="numeric" placeholder="${t('macro_carb')} (${t('unit_g')})" aria-label="${t('macro_carb')}">
        <input class="txin" id="mfFat" type="number" inputmode="numeric" placeholder="${t('macro_fat')} (${t('unit_g')})" aria-label="${t('macro_fat')}">
      </div>
      <button class="btn p" id="mfAdd" style="margin-top:10px;width:100%">${t('add')}</button>
    </details>`;

  const results=sheet.querySelector('#foodResults');
  const search=sheet.querySelector('#foodSearch');
  const advice=sheet.querySelector('#foodAdvice');
  let chosen = null, portion = 1;

  sheet.querySelector('#diaryImg').onchange=e=>{
    const f=e.target.files[0];
    const prev=sheet.querySelector('#diaryImgPreview');
    if(!f){ prev.innerHTML=''; return; }
    prev.innerHTML=`<div class="askpreview"><img src="${URL.createObjectURL(f)}" alt=""><span class="xs">${t('photo_attached')}</span><button id="diaryImgX" aria-label="${t('a11y_remove')}">✕</button></div>`;
    sheet.querySelector('#diaryImgX').onclick=()=>{ e.target.value=''; prev.innerHTML=''; };
  };

  // the attached photo is preview only — it is never stored, only the numbers are
  function finishAdd(item){ addLogItem(slot, item); closeSheet(); }

  const row = (item, meta, attrs) => `
    <button class="foodpick" ${attrs || ''}>
      <span class="fp-main"><b>${esc(item.n)}</b><small>${item.kcal} ${t('unit_kcal')} · ${t('macro_protein')} ${item.protein||0}${t('unit_g')}${meta ? ' · ' + meta : ''}</small></span>
      <span class="fp-go" aria-hidden="true">+</span>
    </button>`;

  /* what to show before anything is typed: what you actually eat, then what
     the kitchen can make, then dishes that suit this meal */
  function drawSuggestions(){
    const recents = typeof recentFoods === 'function' ? recentFoods(4) : [];
    const usual = typeof frequentFoods === 'function' ? frequentFoods(3).filter(f => f.count > 1) : [];
    const picks = typeof pantryPicks === 'function' ? pantryPicks(3) : [];
    const forSlot = typeof foodSearch === 'function' ? foodSearch('', slot, 6) : [];
    const block = (title, html) => html ? `<div class="fp-group"><div class="fp-title">${title}</div>${html}</div>` : '';
    results.innerHTML =
      block(t('food_recent'), recents.map(r => row(r.item, r.count > 1 ? t('food_times', r.count) : '', `data-recent="${esc(r.item.n)}"`)).join('')) +
      block(t('food_usual'), usual.map(r => row(r.item, t('food_times', r.count), `data-recent="${esc(r.item.n)}"`)).join('')) +
      block(t('fadv_pantry_title'), picks.map(p => row(p.recipe, p.missing.length ? t('fadv_pantry_missing', p.missing.map(pantryItemName).join(', ')) : t('fadv_have_all'), `data-id="${p.recipe.id}"`)).join('')) +
      block(t('food_for_meal', MEAL_NAMES[slot]), forSlot.map(r => row(r, '', `data-id="${r.id}"`)).join(''));
    wireRows();
  }

  function drawResults(){
    const q = search.value.trim();
    if(!q){ drawSuggestions(); return; }
    const list = foodSearch(q, slot, 8);
    const recents = (typeof recentFoods === 'function' ? recentFoods(50) : [])
      .filter(r => r.item.n.toLowerCase().includes(q.toLowerCase())).slice(0, 3);
    results.innerHTML =
      (recents.length ? `<div class="fp-group"><div class="fp-title">${t('food_recent')}</div>${recents.map(r => row(r.item, '', `data-recent="${esc(r.item.n)}"`)).join('')}</div>` : '') +
      (list.length ? `<div class="fp-group">${list.map(r => row(r, '', `data-id="${r.id}"`)).join('')}</div>`
                   : `<p class="xs mut">${t('no_results')}</p>`);
    wireRows();
  }

  function wireRows(){
    results.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
      const r = RECIPES.find(x => x.id === b.dataset.id);
      if(r) choose({n:r.n, kcal:r.kcal, protein:r.protein, carb:r.carb, fat:r.fat, recipeId:r.id});
    });
    results.querySelectorAll('[data-recent]').forEach(b => b.onclick = () => {
      const all = recentFoods(200).find(r => r.item.n === b.dataset.recent);
      if(all) choose(all.item);
    });
  }

  /* one screen: portion, what it does to the day, and the button that logs it */
  function choose(item){
    chosen = item; portion = 1;
    drawChosen();
    advice.scrollIntoView({block:'nearest', behavior:'smooth'});
  }
  function drawChosen(){
    if(!chosen){ advice.innerHTML = ''; return; }
    const scaled = scalePortion(chosen, portion);
    advice.innerHTML = `
      <div class="fp-chosen">
        <div class="fp-chosenhead"><b>${esc(chosen.n)}</b>
          <button class="fp-clear" id="fpClear" aria-label="${t('a11y_remove')}">✕</button></div>
        <div class="fp-portions" role="group" aria-label="${esc(t('food_portion'))}">
          ${FOOD_PORTIONS.map(m => `<button class="chip ${m === portion ? 'on' : ''}" data-portion="${m}" aria-pressed="${m === portion}">${m === 1 ? t('food_portion_one') : '×' + m}</button>`).join('')}
        </div>
        <div class="fp-macros"><b>${scaled.kcal}</b> ${t('unit_kcal')} · ${t('abbr_p')}${scaled.protein} ${t('abbr_c')}${scaled.carb} ${t('abbr_f')}${scaled.fat}</div>
      </div>
      ${foodVerdictHTML(scaled, {slot})}
      <button class="btn p" id="fadvAdd" style="width:100%;margin-top:10px">${t('fadv_add_anyway', esc(scaled.n))}</button>`;
    wireFoodVerdict(advice);
    advice.querySelectorAll('[data-portion]').forEach(b => b.onclick = () => { portion = +b.dataset.portion; drawChosen(); });
    advice.querySelector('#fpClear').onclick = () => { chosen = null; drawChosen(); };
    advice.querySelector('#fadvAdd').onclick = () => finishAdd(scalePortion(chosen, portion));
  }

  drawSuggestions();
  search.oninput = drawResults;
  setTimeout(() => { try{ search.focus({preventScroll:true}); }catch(e){} }, 60);

  sheet.querySelector('#mfAdd').onclick=()=>{
    const nm=sheet.querySelector('#mfName').value.trim();
    if(!nm){ toast(t('err_enter_food_name')); return; }
    const manual = {
      n:nm,
      kcal:+sheet.querySelector('#mfKcal').value||0,
      protein:+sheet.querySelector('#mfProtein').value||0,
      carb:+sheet.querySelector('#mfCarb').value||0,
      fat:+sheet.querySelector('#mfFat').value||0,
    };
    if(manual.kcal > 0 && (!chosen || chosen.n !== manual.n)){ choose(manual); return; }
    finishAdd(manual);
  };
}

/* ---------- pantry ---------- */
function drawPantry(){
  document.getElementById('pantry').innerHTML = PANTRY_GROUPS.map(g=>`
    <p class="xs mut" style="margin:10px 0 6px">${g.cat.toUpperCase()}</p>
    <div class="scrollrow">
      ${g.items.map(it=>`<button class="chip ${S.pantry.includes(it.tag)?'on':''}" data-tag="${it.tag}">${it.e} ${it.n}</button>`).join('')}
    </div>`).join('') + `
    <p class="xs mut" style="margin:12px 0 6px">${t('or_type')}</p>
    <div class="askrow">
      <input class="txin" id="pantryText" placeholder="${t('pantry_text_placeholder')}" aria-label="${t('pantry_text_placeholder')}">
      <button class="iconbtn acc" id="pantryTextAdd" aria-label="${t('add')}">→</button>
    </div>`;
  document.querySelectorAll('#pantry .chip').forEach(c=>c.onclick=()=>{
    const tag=c.dataset.tag;
    if(S.pantry.includes(tag)) S.pantry=S.pantry.filter(t=>t!==tag);
    else S.pantry=[...S.pantry, tag];
    save();
    c.classList.toggle('on');
    drawMealPlan();
    drawRecipeList();
  });
  const addFromText=()=>{
    const inp=document.getElementById('pantryText');
    const val=(inp.value||'').trim();
    if(!val) return;
    const {matchedTags, matchedNames, unmatched} = matchPantryText(val);
    matchedTags.forEach(t=>{ if(!S.pantry.includes(t)) S.pantry.push(t); });
    if(matchedTags.length) save();
    let msg='';
    if(matchedNames.length) msg += `${t('added_colon')} ${matchedNames.join(', ')} ✓`;
    if(unmatched.length) msg += (msg?' | ':'') + `${t('not_recognized_colon')} ${unmatched.join(', ')}`;
    toast(msg || t('nothing_recognized'));
    inp.value='';
    drawPantry(); drawPantryPicks(); drawMealPlan(); drawRecipeList();
  };
  document.getElementById('pantryTextAdd').onclick=addFromText;
  document.getElementById('pantryText').onkeydown=e=>{ if(e.key==='Enter') addFromText(); };
}

/* what the kitchen can make right now, best fit for the goal first */
function drawPantryPicks(){
  const host = document.getElementById('pantryPicks');
  if(!host) return;
  const picks = typeof pantryPicks === 'function' ? pantryPicks(3) : [];
  if(!picks.length){
    host.innerHTML = `<div class="card"><p class="sm mut" style="margin:0">${t('fadv_pantry_none')}</p></div>`;
    return;
  }
  host.innerHTML = `<div class="card suglist">
    ${picks.map(p => `<button class="exrow sugrow" data-recipe="${p.recipe.id}">
      <div class="thumb" style="display:grid;place-items:center"><span class="fadv-dot ${p.verdict ? p.verdict.band : 'good'}"></span></div>
      <div class="info"><b>${esc(p.recipe.n)}</b>
        <span>${p.recipe.kcal} ${t('unit_kcal')} · ${t('macro_protein')} ${p.recipe.protein}${t('unit_g')}${
          p.missing.length ? ' · ' + t('fadv_pantry_missing', p.missing.map(pantryItemName).join(', ')) : ' · ' + t('fadv_have_all')}</span></div>
      <div class="sr ${p.verdict ? p.verdict.band : ''}">${p.have}/${(p.recipe.needs||[]).length}<small>${t('ingredients')}</small></div>
    </button>`).join('')}
  </div>`;
  host.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => openRecipe(b.dataset.recipe));
}

/* ---------- recipe browser ---------- */
function drawRecipeFilter(){
  const opts=[['all',t('all')],['breakfast',MEAL_NAMES.breakfast],['lunch',MEAL_NAMES.lunch],['dinner',MEAL_NAMES.dinner],['snack',MEAL_NAMES.snack]];
  document.getElementById('recipeF').innerHTML = opts.map(([v,nm])=>`<button class="chip ${recipeF===v?'on':''}" data-v="${v}">${nm}</button>`).join('');
  document.querySelectorAll('#recipeF .chip').forEach(c=>c.onclick=()=>{
    recipeF=c.dataset.v;
    document.querySelectorAll('#recipeF .chip').forEach(x=>x.classList.toggle('on',x===c));
    drawRecipeList();
  });
}
function drawRecipeCatFilter(){
  const opts=[['all',t('all')], ...Object.entries(RECIPE_CATS)];
  document.getElementById('recipeCat').innerHTML = opts.map(([v,nm])=>`<button class="chip ${recipeCat===v?'on':''}" data-v="${v}">${nm}</button>`).join('');
  document.querySelectorAll('#recipeCat .chip').forEach(c=>c.onclick=()=>{
    recipeCat=c.dataset.v;
    document.querySelectorAll('#recipeCat .chip').forEach(x=>x.classList.toggle('on',x===c));
    drawRecipeList();
  });
}
function drawRecipeList(){
  const list = RECIPES.filter(r=>(recipeF==='all' || r.meal.includes(recipeF)) && (recipeCat==='all' || r.tags.includes(recipeCat)));
  list.sort((a,b)=> recipeScore(b,S.pantry) - recipeScore(a,S.pantry));
  document.getElementById('recipelist').innerHTML = list.map(r=>{
    const canMake = S.pantry.length && r.needs.length && recipeScore(r,S.pantry)===1;
    return `
    <button class="excard" data-id="${r.id}">
      <div class="thumb">${r.e}</div>
      <div class="info">
        <b>${r.n}</b>
        <div class="tags">
          ${canMake?`<span class="vtag" style="color:var(--ok);border-color:var(--ok)">✓ ${t('can_make_now')}</span>`:''}
          <span class="vtag">⏱ ${r.time} ${t('unit_min')}</span>
          <span class="vtag">${LVL_NAMES[r.lvl]}</span>
        </div>
        <span class="sr2">${r.kcal} ${t('unit_kcal')}</span>
      </div>
      <div class="chev">›</div>
    </button>`;}).join('');
  document.querySelectorAll('#recipelist .excard').forEach(b=>b.onclick=()=>openRecipe(b.dataset.id));
}

/* ---------- meal plan ---------- */
function drawMealPlan(){
  const plan=generateMealPlan(S.pantry, planDays);
  const slots=['breakfast','lunch','dinner','snack'];
  document.getElementById('mealplan').innerHTML = plan.map((day,i)=>`
    <div class="card daycard" style="margin-top:10px">
      <b>${t('day_number', i+1)}</b>
      <div class="daymeals">
        ${slots.map(slot=>{const r=day[slot]; return `<button class="dmeal" data-id="${r.id}"><span class="e">${r.e}</span><span class="n">${MEAL_NAMES[slot]}: ${r.n}</span><span class="k">${r.kcal} ${t('unit_kcal')}</span></button>`;}).join('')}
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
      <span class="vtag">⏱ ${r.time} ${t('unit_min')}</span><span class="vtag">${LVL_NAMES[r.lvl]}</span>
      ${r.meal.map(m=>`<span class="vtag">${MEAL_NAMES[m]}</span>`).join('')}
      ${(r.tags||[]).map(t=>`<span class="vtag">${RECIPE_CATS[t]}</span>`).join('')}
    </div>
    <div class="kv">
      <div class="k"><b>${r.kcal}</b><span>${t('unit_kcal')}</span></div>
      <div class="k"><b>${r.protein}${t('unit_g')}</b><span>${t('macro_protein')}</span></div>
      <div class="k"><b>${r.carb}${t('unit_g')}</b><span>${t('macro_carb')}</span></div>
      <div class="k"><b>${r.fat}${t('unit_g')}</b><span>${t('macro_fat')}</span></div>
    </div>
    <div class="block"><div class="lab">🛒 ${t('ingredients')}</div><div class="note">${r.ingredients.map(esc).join('<br>')}</div></div>
    <div class="block"><div class="lab">📋 ${t('instructions')}</div><div class="note">${esc(r.steps)}</div></div>
    ${foodVerdictHTML({n:r.n, kcal:r.kcal, protein:r.protein, carb:r.carb, fat:r.fat, recipeId:r.id}, {slot:(r.meal||[])[0]})}
    <a class="btn g" style="margin-top:14px;width:100%" href="${youtubeSearchUrl(r.n)}" target="_blank" rel="noopener">▶ ${t('find_on_youtube')}</a>
    <div class="block"><div class="lab">➕ ${t('add_to_log')}</div>
      <div class="chiprow">
        ${r.meal.map(m=>`<button class="chip" data-slot="${m}">${MEAL_NAMES[m]}</button>`).join('')}
      </div>
    </div>`;
  wireFoodVerdict(sheet);
  sheet.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{
    addLogItem(b.dataset.slot, {n:r.n, kcal:r.kcal, protein:r.protein, carb:r.carb, fat:r.fat, recipeId:r.id});
    closeSheet();
    toast(t('toast_added_to_log'));
  });
}
