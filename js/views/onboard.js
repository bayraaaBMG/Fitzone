/* ---------- ONBOARDING ----------
   Five steps, then a result screen that shows what the answers add up to
   before any plan is generated. The arithmetic lives in js/onboard-calc.js;
   this file only asks and renders.

   The draft survives a reload: a half-finished answer set is kept in
   sessionStorage, so a dropped connection or a stray refresh does not send
   somebody back to the first question. */
const ONB_STEPS = 5;
const ONB_DRAFT_KEY = 'mf_onboard_draft';
const ONB_DEFAULTS = {
  sex:'m', goal:'fatloss', level:1, place:'home', days:3, minutes:30, equip:[],
  health:[], diet:'mixed', activity:3, targetWeight:'', waist:'', sleep:'',
};
let draft = {...ONB_DEFAULTS};
let step = 0;

function saveDraft(){
  try{ sessionStorage.setItem(ONB_DRAFT_KEY, JSON.stringify({draft, step})); }catch(e){}
}
function loadDraft(){
  try{
    const raw = sessionStorage.getItem(ONB_DRAFT_KEY);
    if(!raw) return;
    const d = JSON.parse(raw);
    if(d && d.draft){ draft = {...ONB_DEFAULTS, ...d.draft}; step = Math.min(+d.step || 0, ONB_STEPS + 1); }
  }catch(e){}
}
function clearDraft(){ try{ sessionStorage.removeItem(ONB_DRAFT_KEY); }catch(e){} }
loadDraft();

function renderOnboard(){
  if(step === 0){
    app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div></div>
    <div class="view">
      <div class="hero">
        <div class="eyebrow">${t('onb_intro_eyebrow')}</div>
        <h1>${t('onb_intro_h1')}</h1>
        <p>${t('onb_intro_p')}</p>
        <div class="stats">
          <div><b>${EX.length}+</b><span>${t('onb_stat_exercises')}</span></div>
          <div><b>2–6</b><span>${t('onb_stat_days')}</span></div>
          <div><b>10–60</b><span>${t('onb_stat_minutes')}</span></div>
        </div>
      </div>
      <div style="margin-top:18px"><button class="btn p" id="start">${t('onb_start')}</button></div>
      <p class="xs mut center" style="margin:10px 0 0">${t('onb_intro_free')}</p>
      <div class="grid g2" style="margin-top:14px">
        <button class="tile intro"><div class="ic">🔢</div><h3>${t('onb_tile5_h')}</h3><p>${t('onb_tile5_p')}</p></button>
        <button class="tile intro"><div class="ic">🏠</div><h3>${t('onb_tile1_h')}</h3><p>${t('onb_tile1_p')}</p></button>
        <button class="tile intro"><div class="ic">📈</div><h3>${t('onb_tile3_h')}</h3><p>${t('onb_tile3_p')}</p></button>
        <button class="tile acc intro"><div class="ic">🍳</div><h3>${t('onb_tile4_h')}</h3><p>${t('onb_tile4_p')}</p></button>
      </div>
      <p class="xs mut center" style="margin-top:20px">${t('disclaimer')}</p>
    </div>`;
    const goStart = () => { step = 1; saveDraft(); renderOnboard(); };
    document.getElementById('start').onclick = goStart;
    app.querySelectorAll('.tile.intro').forEach(x => x.onclick = goStart);
    return;
  }

  if(step > ONB_STEPS){ renderOnboardResult(); return; }

  const steps = [renderS1, renderS2, renderS3, renderS4, renderS5];
  app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div>
      <button class="chip" id="back" style="margin-left:auto">‹ ${t('back')}</button></div>
    <div class="view">
      <div class="onbprog">
        <div class="seg">${Array.from({length:ONB_STEPS}, (_, i) => `<div class="step ${i < step ? 'on' : ''}"></div>`).join('')}</div>
        <p class="xs mut" style="margin:8px 0 18px">${t('onb_step_of', step, ONB_STEPS)}</p>
      </div>
      <div id="formbody"></div>
    </div>`;
  // whatever is typed on this step is kept before leaving it, so stepping
  // back and forward never costs an answer
  document.getElementById('back').onclick = () => { onboardKeepTyped(); step--; if(step < 0) step = 0; saveDraft(); renderOnboard(); };
  steps[step - 1]();
}

/* keep what has been typed before a re-render caused by a chip */
function onboardKeepTyped(){
  const get = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
  const map = {f_name:'name', f_age:'age', f_h:'height', f_w:'weight',
               f_target:'targetWeight', f_waist:'waist', f_sleep:'sleep'};
  for(const id in map){ const v = get(id); if(v !== undefined) draft[map[id]] = v; }
}
function onboardChipChange(){
  onboardKeepTyped();
  saveDraft();
  const cur = step; renderOnboard(); step = cur;
}

/* a number the person typed, only if it is actually plausible */
function onbNum(id, lo, hi){
  const el = document.getElementById(id);
  const v = el ? +el.value : NaN;
  return (isFinite(v) && v >= lo && v <= hi) ? v : null;
}
function onbError(msg){
  const box = document.getElementById('onberr');
  if(!box) return;
  box.textContent = msg;
  box.hidden = !msg;
  if(msg) box.scrollIntoView({block:'nearest'});
}

/* ---- 1. the basics ---- */
function renderS1(){
  const email = (typeof authUser !== 'undefined' && authUser && authUser.email) || '';
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s1_h')}</h2>
    <p class="mut sm" style="margin:0 0 22px">${t('onb_s1_p')}</p>
    <div class="field"><label for="f_name">${t('onb_name')}</label>
      <input class="txin" id="f_name" placeholder="${t('onb_name_placeholder')}" value="${esc(draft.name || '')}"></div>
    ${email ? `<div class="field"><label for="f_email">${t('onb_email')}</label>
      <input class="txin" id="f_email" type="email" value="${esc(email)}" readonly aria-readonly="true">
      <p class="xs mut" style="margin:7px 0 0">${t('onb_email_hint')}</p></div>` : ''}
    <div class="field"><label>${t('onb_sex')}</label>${chips(draft, 'sex', [{v:'m', n:t('onb_male'), e:'♂'}, {v:'f', n:t('onb_female'), e:'♀'}])}</div>
    <div class="inrow">
      <div class="field" style="flex:1"><label for="f_age">${t('onb_age')}</label><input class="txin" id="f_age" type="number" inputmode="numeric" placeholder="22" value="${draft.age || ''}"></div>
      <div class="field" style="flex:1"><label for="f_h">${t('onb_height')}</label><input class="txin" id="f_h" type="number" inputmode="numeric" placeholder="175" value="${draft.height || ''}"></div>
      <div class="field" style="flex:1"><label for="f_w">${t('onb_weight')}</label><input class="txin" id="f_w" type="number" inputmode="numeric" placeholder="82" value="${draft.weight || ''}"></div>
    </div>
    <div class="field"><label>${t('onb_goal')}</label>${chips(draft, 'goal', GOALS.map(g => ({v:g.id, n:g.n, e:g.e})))}</div>
    <p class="note warn" id="onberr" hidden></p>
    <button class="btn p" id="next1">${t('continue')}</button>`;
  wireChips(app, draft, onboardChipChange);
  document.getElementById('next1').onclick = () => {
    const age = onbNum('f_age', 10, 100), h = onbNum('f_h', 100, 250), w = onbNum('f_w', 25, 300);
    if(age === null) return onbError(t('onb_err_age'));
    if(h === null) return onbError(t('onb_err_height'));
    if(w === null) return onbError(t('onb_err_weight'));
    onbError('');
    draft.name = (document.getElementById('f_name').value || '').trim() || t('default_user_name');
    draft.age = age; draft.height = h; draft.weight = w;
    step = 2; saveDraft(); renderOnboard();
  };
}

/* ---- 2. health ---- */
function renderS2(){
  const opts = HEALTH_FLAGS.map(f => ({v:f, n:t('onb_health_' + f), e:t('onb_health_e_' + f)}));
  const none = (draft.health || []).length === 0;
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s2_h')}</h2>
    <p class="mut sm" style="margin:0 0 18px">${t('onb_s2_p')}</p>
    <div class="field"><label>${t('onb_health_label')}</label>
      ${chips(draft, 'health', opts, true)}
      <button class="chip ${none ? 'on' : ''}" id="h_none" style="margin-top:8px">${t('onb_health_none')}</button>
    </div>
    <p class="note warn">${t('onb_health_warn')} ${refBadge('aha_warning')}</p>
    <button class="btn p" id="next2">${t('continue')}</button>`;
  wireChips(app, draft, () => { onboardChipChange(); });
  document.getElementById('h_none').onclick = () => { draft.health = []; onboardChipChange(); };
  document.getElementById('next2').onclick = () => { step = 3; saveDraft(); renderOnboard(); };
}

/* ---- 3. how they eat ---- */
function renderS3(){
  const cards = DIET_HABITS.map(d => `
    <button class="tile diet ${draft.diet === d ? 'on' : ''}" data-diet="${d}">
      <div class="ic">${t('onb_diet_e_' + d)}</div>
      <h3>${t('onb_diet_' + d)}</h3><p>${t('onb_diet_p_' + d)}</p>
    </button>`).join('');
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s3_h')}</h2>
    <p class="mut sm" style="margin:0 0 18px">${t('onb_s3_p')}</p>
    <div class="grid" style="gap:10px">${cards}</div>
    <p class="xs mut" style="margin:14px 0 18px">${t('onb_diet_hint')}</p>
    <button class="btn p" id="next3">${t('continue')}</button>`;
  app.querySelectorAll('.tile.diet').forEach(b => b.onclick = () => { draft.diet = b.dataset.diet; onboardChipChange(); });
  document.getElementById('next3').onclick = () => { step = 4; saveDraft(); renderOnboard(); };
}

/* ---- 4. activity and training ---- */
function renderS4(){
  const showEquip = draft.place !== 'home';
  const scale = [1, 2, 3, 4, 5].map(v => `
    <button class="actopt ${+draft.activity === v ? 'on' : ''}" data-act="${v}" aria-pressed="${+draft.activity === v}">
      <span class="actbars">${[1,2,3,4,5].map(i => `<i class="${i <= v ? 'f' : ''}"></i>`).join('')}</span>
      <span class="acttxt"><b>${t('onb_act_' + v)}</b><span class="sm">${t('onb_act_p_' + v)}</span></span>
    </button>`).join('');
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s4_h')}</h2>
    <p class="mut sm" style="margin:0 0 18px">${t('onb_s4_p')}</p>
    <div class="field"><label>${t('onb_act_label')}</label><div class="actscale">${scale}</div></div>
    <div class="field"><label>${t('onb_level')}</label>${chips(draft, 'level', [{v:1, n:t('onb_lvl1')}, {v:2, n:t('onb_lvl2')}, {v:3, n:t('onb_lvl3')}])}</div>
    <div class="field"><label>${t('onb_place')}</label>${chips(draft, 'place', [{v:'home', n:t('onb_home'), e:'🏠'}, {v:'gym', n:t('onb_gym'), e:'🏋️'}, {v:'both', n:t('onb_both'), e:'🔁'}])}</div>
    <div class="field"><label>${t('onb_days')}</label>${chips(draft, 'days', [2,3,4,5,6].map(d => ({v:d, n:d + ' ' + t('unit_days')})))}</div>
    <div class="field"><label>${t('onb_minutes')}</label>${chips(draft, 'minutes', [10,20,30,45,60].map(m => ({v:m, n:m + ' ' + t('unit_min')})))}</div>
    ${showEquip ? `<div class="field"><label>${t('onb_equip')}</label>${chips(draft, 'equip', [
      {v:'dumbbell', n:t('equip_dumbbell')}, {v:'barbell', n:'Barbell'}, {v:'machine', n:'Machine'}, {v:'cable', n:'Cable'}
    ], true)}<p class="xs mut" style="margin-top:8px">${t('onb_equip_hint')}</p></div>` : ''}
    <button class="btn p" id="next4">${t('continue')}</button>`;
  wireChips(app, draft, onboardChipChange);
  app.querySelectorAll('.actopt').forEach(b => b.onclick = () => { draft.activity = +b.dataset.act; onboardChipChange(); });
  document.getElementById('next4').onclick = () => { step = 5; saveDraft(); renderOnboard(); };
}

/* ---- 5. the optional extras ---- */
function renderS5(){
  document.getElementById('formbody').innerHTML = `
    <h2 class="disp" style="font-size:24px; margin-bottom:6px">${t('onb_s5_h')}</h2>
    <p class="mut sm" style="margin:0 0 22px">${t('onb_s5_p')}</p>
    <div class="field"><label for="f_target">${t('onb_target_weight')}</label>
      <input class="txin" id="f_target" type="number" inputmode="decimal" placeholder="${draft.weight || 70}" value="${draft.targetWeight || ''}">
      <p class="xs mut" style="margin:7px 0 0">${t('onb_target_hint')}</p></div>
    <div class="field"><label for="f_waist">${t('onb_waist')}</label>
      <input class="txin" id="f_waist" type="number" inputmode="numeric" placeholder="84" value="${draft.waist || ''}">
      <p class="xs mut" style="margin:7px 0 0">${t('onb_waist_hint')}</p></div>
    <div class="field"><label for="f_sleep">${t('onb_sleep')}</label>
      <input class="txin" id="f_sleep" type="number" inputmode="decimal" placeholder="7" value="${draft.sleep || ''}"></div>
    <p class="note warn" id="onberr" hidden></p>
    <button class="btn p" id="next5">${t('onb_see_result')}</button>
    <button class="btn g" id="skip5" style="margin-top:10px">${t('onb_skip')}</button>`;
  const take = () => {
    const tw = document.getElementById('f_target').value;
    const wa = document.getElementById('f_waist').value;
    const sl = document.getElementById('f_sleep').value;
    if(tw !== '' && onbNum('f_target', 25, 300) === null) return onbError(t('onb_err_target'));
    if(wa !== '' && onbNum('f_waist', 40, 200) === null) return onbError(t('onb_err_waist'));
    if(sl !== '' && onbNum('f_sleep', 3, 14) === null) return onbError(t('onb_err_sleep'));
    draft.targetWeight = tw === '' ? '' : +tw;
    draft.waist = wa === '' ? '' : +wa;
    draft.sleep = sl === '' ? '' : +sl;
    onbError('');
    step = ONB_STEPS + 1; saveDraft(); renderOnboard();
    return true;
  };
  document.getElementById('next5').onclick = take;
  document.getElementById('skip5').onclick = () => {
    draft.targetWeight = ''; draft.waist = ''; draft.sleep = '';
    step = ONB_STEPS + 1; saveDraft(); renderOnboard();
  };
}

/* ---- the result ---- */
function onbProfileFromDraft(){
  return {
    name: draft.name, sex: draft.sex, age: +draft.age, height: +draft.height, weight: +draft.weight,
    goal: draft.goal, level: +draft.level, place: draft.place, days: +draft.days, minutes: +draft.minutes,
    equip: draft.equip || [], activity: +draft.activity, health: draft.health || [], diet: draft.diet,
    targetWeight: draft.targetWeight === '' ? null : +draft.targetWeight,
    waist: draft.waist === '' ? null : +draft.waist,
    sleep: draft.sleep === '' ? null : +draft.sleep,
  };
}

function renderOnboardResult(){
  const p = onbProfileFromDraft();
  const s = onboardSummary(p);
  if(!s){ step = 1; renderOnboard(); return; }
  const bpos = Math.min(100, Math.max(0, (s.bmi - 15) / (40 - 15) * 100));
  const aim = s.aimKg;
  const aimWord = aim < -0.05 ? t('onb_res_lose') : aim > 0.05 ? t('onb_res_gain') : t('onb_res_hold');

  app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div>
      <button class="chip" id="back" style="margin-left:auto">‹ ${t('back')}</button></div>
    <div class="view">
      <div class="hero" style="padding-bottom:18px">
        <div class="eyebrow">${t('onb_res_eyebrow')}</div>
        <h1 style="font-size:26px">${t('onb_res_h1', esc(p.name))}</h1>
        <p>${t('onb_res_free')}</p>
      </div>

      <div class="secttl"><h2>${t('onb_res_bmi')}</h2></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><span class="xs mut">${t('your_reading')}</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:${s.cat.c};line-height:1">${s.bmi.toFixed(1)}</div>
            <span class="xs" style="color:${s.cat.c};font-weight:700">${s.cat.n}</span></div>
          <div class="xs mut" style="text-align:right">${p.height} ${t('unit_cm')}<br>${p.weight} ${t('unit_kg')}</div>
        </div>
        <div class="bmibar"><div class="marker" style="left:${bpos}%"></div></div>
        <div class="bmiscale"><span>${t('bmi_underweight')}</span><span>${t('bmi_normal')}</span><span>${t('bmi_overweight')}</span><span>${t('bmi_obese')}</span></div>
        ${s.range ? `<p class="sm" style="margin:12px 0 0">${t('onb_res_range', s.range.lo, s.range.hi)}</p>` : ''}
        <p class="xs mut" style="margin:8px 0 0">${refBadge('who_bmi')}</p>
      </div>

      <div class="secttl"><h2>${t('onb_res_weight')}</h2></div>
      <div class="card">
        <div class="statbig" style="margin:0">
          <div class="s"><b>${p.weight}</b><span>${t('onb_res_now')}</span></div>
          <div class="s acc"><b>${s.goal ? s.goal.target : (s.delta ? s.delta.target : p.weight)}</b><span>${s.goal ? t('onb_res_your_target') : t('onb_res_healthy_target')}</span></div>
        </div>
        <p class="sm" style="margin:12px 0 0"><b>${aimWord}</b>${Math.abs(aim) >= 0.05 ? ` · ${Math.abs(aim)} ${t('unit_kg')}` : ''}</p>
        ${s.weeks ? `<p class="xs mut" style="margin:6px 0 0">${t('onb_res_weeks', s.weeks.fast, s.weeks.slow)} ${refBadge('nih_weightloss')}</p>` : ''}
        ${s.goal && s.goal.belowHealthy ? `<p class="note warn" style="margin-top:12px">${t('onb_res_target_low')}</p>` : ''}
      </div>

      <div class="secttl"><h2>${t('onb_res_calories')}</h2></div>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div><span class="xs mut">${t('onb_res_daily')}</span>
            <div style="font-family:Archivo;font-weight:900;font-size:34px;color:var(--acc-ink);line-height:1">${s.nut.cal}</div>
            <span class="xs mut">${t('unit_kcal')} · ${s.nut.label}</span></div>
          <div class="xs mut" style="text-align:right">${t('onb_res_tdee')}<br><b>${s.tdee}</b> ${t('unit_kcal')}</div>
        </div>
        <hr class="sep">
        <div class="macro"><b style="color:var(--coral)">${s.nut.protein}${t('unit_g')}</b><div class="bar"><i style="width:${pct(s.nut.protein * 4, s.nut.cal)}%;background:var(--coral)"></i></div><span class="sm mut" style="width:64px">${t('macro_protein')}</span></div>
        <div class="macro"><b style="color:var(--acc-ink)">${s.nut.carb}${t('unit_g')}</b><div class="bar"><i style="width:${pct(s.nut.carb * 4, s.nut.cal)}%;background:var(--acc)"></i></div><span class="sm mut" style="width:64px">${t('macro_carb')}</span></div>
        <div class="macro"><b style="color:var(--warn)">${s.nut.fat}${t('unit_g')}</b><div class="bar"><i style="width:${pct(s.nut.fat * 9, s.nut.cal)}%;background:var(--warn)"></i></div><span class="sm mut" style="width:64px">${t('macro_fat')}</span></div>
        ${s.softened === 'pregnant' ? `<p class="note warn" style="margin-top:12px">${t('onb_res_pregnant')}</p>` : ''}
        ${s.softened === 'care' ? `<p class="note warn" style="margin-top:12px">${t('onb_res_softened')}</p>` : ''}
        <p class="xs mut" style="margin:10px 0 0">${refBadge('mifflin_stjeor', 'issn_protein', 'amdr_fat')}</p>
      </div>

      ${s.care.length || s.injury ? `<p class="note warn" style="margin-top:16px">${t('onb_res_care_note')} ${refBadge('aha_warning')}</p>` : ''}

      <div style="margin-top:20px"><button class="btn p" id="onbGo">${t('onb_res_cta')}</button></div>
      <button class="btn g" id="onbEdit" style="margin-top:10px">${t('onb_res_edit')}</button>
      <p class="xs mut center" style="margin-top:18px">${t('disclaimer')}</p>
    </div>`;

  const back = () => { step = ONB_STEPS; saveDraft(); renderOnboard(); };
  document.getElementById('back').onclick = back;
  document.getElementById('onbEdit').onclick = () => { step = 1; saveDraft(); renderOnboard(); };
  document.getElementById('onbGo').onclick = () => {
    S.profile = {...p, joinedAt: today()};
    S.plan = generatePlan(S.profile);
    S.tab = 'plan';
    clearDraft();
    save(); render();
    toast(t('toast_program_ready'));
  };
}
