/* ---------- LIBRARY ---------- */
let libF={loc:'all', m:'all', lvl:'all', goal:'all'};
function renderLibrary(){
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>Дасгалын сан</h2></div>
      <p class="mut sm" style="margin:0 0 14px">${EX.length} дасгал. Шүүж сонгоод дэлгэрэнгүйг нь үз.</p>
      <p class="xs mut" style="margin:0 0 6px">БАЙРШИЛ</p>
      <div class="scrollrow" id="fLoc"></div>
      <p class="xs mut" style="margin:10px 0 6px">ТҮВШИН</p>
      <div class="scrollrow" id="fLvl"></div>
      <p class="xs mut" style="margin:10px 0 6px">ЗОРИЛГО</p>
      <div class="scrollrow" id="fGoal"></div>
      <p class="xs mut" style="margin:10px 0 6px">БУЛЧИН</p>
      <div class="scrollrow" id="fM"></div>
      <div id="exlist" style="margin-top:16px"></div>
    </div>`;
  topWire();
  const locs=[['all','Бүгд'],['home','🏠 Гэр'],['gym','🏋️ Жийм']];
  const lvls=[['all','Бүгд'],[1,'Анхан'],[2,'Дунд'],[3,'Ахисан']];
  const goals=[['all','Бүгд'],['fatloss','🔥 Турах'],['muscle','💪 Булчин нэмэх'],['tone','✨ Галбиржих']];
  const ms=[['all','Бүгд'],...Object.keys(M_NAMES).map(k=>[k,M_NAMES[k]])];
  const fLoc=document.getElementById('fLoc'), fLvl=document.getElementById('fLvl'),
    fGoal=document.getElementById('fGoal'), fM=document.getElementById('fM');
  fLoc.innerHTML=locs.map(([v,n])=>`<button class="chip ${libF.loc===v?'on':''}" data-v="${v}">${n}</button>`).join('');
  fLvl.innerHTML=lvls.map(([v,n])=>`<button class="chip ${String(libF.lvl)===String(v)?'on':''}" data-v="${v}">${n}</button>`).join('');
  fGoal.innerHTML=goals.map(([v,n])=>`<button class="chip ${libF.goal===v?'on':''}" data-v="${v}">${n}</button>`).join('');
  fM.innerHTML=ms.map(([v,n])=>`<button class="chip ${libF.m===v?'on':''}" data-v="${v}">${n}</button>`).join('');
  fLoc.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{libF.loc=c.dataset.v; drawLib();});
  fLvl.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{libF.lvl=c.dataset.v==='all'?'all':+c.dataset.v; drawLib();});
  fGoal.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{libF.goal=c.dataset.v; drawLib();});
  fM.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{libF.m=c.dataset.v; drawLib();});
  drawLib();
}
function drawLib(){
  // refresh chip states
  app.querySelectorAll('#fLoc .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===libF.loc));
  app.querySelectorAll('#fLvl .chip').forEach(c=>c.classList.toggle('on',String(libF.lvl)===c.dataset.v));
  app.querySelectorAll('#fGoal .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===libF.goal));
  app.querySelectorAll('#fM .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===libF.m));
  const list=EX.filter(x=>
    (libF.loc==='all'||x.loc===libF.loc) &&
    (libF.m==='all'||x.m===libF.m) &&
    (libF.lvl==='all'||x.lvl===libF.lvl) &&
    (libF.goal==='all'||x.goals.includes(libF.goal))
  );
  const el=document.getElementById('exlist');
  if(!list.length){ el.innerHTML=`<div class="empty"><div class="e">🔍</div>Энэ шүүлтэд тохирох дасгал алга. Өөр сонголт хийгээрэй.</div>`; return; }
  // suggested set/reps/rest based on chosen goal (or профайл) + level
  const goal = libF.goal==='all' ? (S.profile?S.profile.goal:'tone') : libF.goal;
  const lvl = libF.lvl==='all' ? (S.profile?S.profile.level:2) : libF.lvl;
  const sch = repScheme(goal, lvl);
  el.innerHTML = list.map(x=>`
    <button class="excard" data-ex="${x.id}">
      <div class="thumb">${x.e}</div>
      <div class="info">
        <b>${x.n}</b>
        <div class="tags">
          <span class="vtag">${x.loc==='home'?'🏠 Гэр':'🏋️ Жийм'}</span>
          <span class="vtag">${M_NAMES[x.m]}</span>
          <span class="vtag">${LVL_NAMES[x.lvl]}</span>
        </div>
        <span class="sr2">${sch.sets}×${sch.reps} · амралт ${sch.rest}с</span>
      </div>
      <div class="chev">›</div>
    </button>`).join('');
  el.querySelectorAll('.excard').forEach(r=>r.onclick=()=>openExercise(r.dataset.ex));
}
