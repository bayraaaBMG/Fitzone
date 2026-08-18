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
    <h2 class="disp" style="font-size:22px; margin-bottom:2px">${t('st_title')}</h2>
    <p class="xs mut" style="margin:0 0 14px">${esc(authUser?authUser.email:'')}</p>
    <button class="btn g" id="st_profile" style="margin-bottom:18px">👤 ${t('st_profile_link')}</button>
    <div class="field"><label>${t('onb_name')}</label><input class="txin" id="st_name" value="${esc(sdraft.name||'')}"></div>
    <div class="field"><label>${t('onb_sex')}</label>${chips(sdraft,'sex',[{v:'m',n:t('onb_male'),e:'♂'},{v:'f',n:t('onb_female'),e:'♀'}])}</div>
    <div class="inrow">
      <div class="field" style="flex:1"><label>${t('onb_age')}</label><input class="txin" id="st_age" type="number" inputmode="numeric" value="${sdraft.age||''}"></div>
      <div class="field" style="flex:1"><label>${t('onb_height')}</label><input class="txin" id="st_h" type="number" inputmode="numeric" value="${sdraft.height||''}"></div>
      <div class="field" style="flex:1"><label>${t('onb_weight')}</label><input class="txin" id="st_w" type="number" inputmode="numeric" value="${sdraft.weight||''}"></div>
    </div>
    <div class="field"><label>${t('onb_goal')}</label>${chips(sdraft,'goal',GOALS.map(g=>({v:g.id,n:g.n,e:g.e})))}</div>
    <div class="field"><label>${t('onb_level')}</label>${chips(sdraft,'level',[{v:1,n:t('onb_lvl1')},{v:2,n:t('onb_lvl2')},{v:3,n:t('onb_lvl3')}])}</div>
    <div class="field"><label>${t('onb_place')}</label>${chips(sdraft,'place',[{v:'home',n:t('onb_home'),e:'🏠'},{v:'gym',n:t('onb_gym'),e:'🏋️'},{v:'both',n:t('onb_both'),e:'🔁'}])}</div>
    <div class="field"><label>${t('onb_days')}</label>${chips(sdraft,'days',[2,3,4,5,6].map(d=>({v:d,n:d+' өдөр'})))}</div>
    <div class="field"><label>${t('onb_minutes')}</label>${chips(sdraft,'minutes',[10,20,30,45,60].map(m=>({v:m,n:m+' мин'})))}</div>
    ${showEquip?`<div class="field"><label>${t('onb_equip')}</label>${chips(sdraft,'equip',[
      {v:'dumbbell',n:'Гантель'},{v:'barbell',n:'Barbell'},{v:'machine',n:'Machine'},{v:'cable',n:'Cable'}
    ],true)}</div>`:''}
    <button class="btn p" id="st_save" style="margin-top:6px">${t('st_program_save')}</button>

    <div class="field" style="margin-top:20px"><label>${t('st_lang')}</label>
      <div class="chiprow" id="langRow">
        <button class="chip ${S.lang==='mn'?'on':''}" data-v="mn">${t('st_lang_mn')}</button>
        <button class="chip ${S.lang==='en'?'on':''}" data-v="en">${t('st_lang_en')}</button>
      </div>
    </div>
    <div class="field"><label>${t('st_theme')}</label>
      <div class="chiprow" id="themeRow">
        <button class="chip ${S.theme==='system'?'on':''}" data-v="system">${t('st_theme_system')}</button>
        <button class="chip ${S.theme==='light'?'on':''}" data-v="light">${t('st_theme_light')}</button>
        <button class="chip ${S.theme==='dark'?'on':''}" data-v="dark">${t('st_theme_dark')}</button>
      </div>
    </div>

    <div class="field" style="margin-top:6px"><label>${t('st_install')}</label>${installBoxHTML()}</div>
    <button class="btn g" id="st_logout" style="margin-top:10px">🚪 ${t('logout')}</button>
    <button class="btn g" id="st_reset" style="margin-top:10px">${t('st_reset')}</button>
  `;
  wireInstallBox(sheet);

  const syncInputs=()=>{
    sdraft.name=(sheet.querySelector('#st_name').value||'').trim()||sdraft.name;
    sdraft.age=+sheet.querySelector('#st_age').value || sdraft.age;
    sdraft.height=+sheet.querySelector('#st_h').value || sdraft.height;
    sdraft.weight=+sheet.querySelector('#st_w').value || sdraft.weight;
  };

  // wireChips() attaches to every .chiprow in the sheet, including the
  // lang/theme rows below — wire those two explicitly *after* so their
  // dedicated handlers (immediate apply, not tied to the profile-save flow)
  // are the ones left in place
  wireChips(sheet, sdraft, ()=>{ syncInputs(); paintSettings(sheet, sdraft); });

  sheet.querySelector('#st_profile').onclick=()=>{
    closeSheet();
    S.tab='profile';
    render();
  };

  sheet.querySelector('#langRow').querySelectorAll('.chip').forEach(c=> c.onclick=()=>{
    S.lang = c.dataset.v;
    applyLangLabels();
    save();
    paintSettings(sheet, sdraft);
    render();
  });
  sheet.querySelector('#themeRow').querySelectorAll('.chip').forEach(c=> c.onclick=()=>{
    S.theme = c.dataset.v;
    applyTheme(S.theme);
    save();
    paintSettings(sheet, sdraft);
  });

  sheet.querySelector('#st_logout').onclick=async()=>{
    closeSheet();
    await logOut();
  };

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
    resetLocalState();
    save();
    closeSheet();
    render();
  };
}
