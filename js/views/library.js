/* ---------- LIBRARY ---------- */
let libF={loc:'all', m:'all', lvl:'all'};
function renderLibrary(){
  app.innerHTML = `
    ${topBar()}
    <div class="view">
      <div class="secttl" style="margin-top:4px"><h2>Дасгалын сан</h2></div>
      <p class="mut sm" style="margin:0 0 14px">${EX.length} дасгал. Шүүж сонгоод дэлгэрэнгүйг нь үз.</p>
      <p class="xs mut" style="margin:0 0 6px">БАЙРШИЛ</p>
      <div class="scrollrow" id="fLoc"></div>
      <p class="xs mut" style="margin:10px 0 6px">БУЛЧИН</p>
      <div class="scrollrow" id="fM"></div>
      <div id="exlist" style="margin-top:16px"></div>
    </div>`;
  topWire();
  const locs=[['all','Бүгд'],['home','🏠 Гэр'],['gym','🏋️ Жийм']];
  const ms=[['all','Бүгд'],...Object.keys(M_NAMES).map(k=>[k,M_NAMES[k]])];
  const fLoc=document.getElementById('fLoc'), fM=document.getElementById('fM');
  fLoc.innerHTML=locs.map(([v,n])=>`<button class="chip ${libF.loc===v?'on':''}" data-v="${v}">${n}</button>`).join('');
  fM.innerHTML=ms.map(([v,n])=>`<button class="chip ${libF.m===v?'on':''}" data-v="${v}">${n}</button>`).join('');
  fLoc.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{libF.loc=c.dataset.v; drawLib();});
  fM.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{libF.m=c.dataset.v; drawLib();});
  drawLib();
}
function drawLib(){
  // refresh chip states
  app.querySelectorAll('#fLoc .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===libF.loc));
  app.querySelectorAll('#fM .chip').forEach(c=>c.classList.toggle('on',c.dataset.v===libF.m));
  const list=EX.filter(x=>(libF.loc==='all'||x.loc===libF.loc)&&(libF.m==='all'||x.m===libF.m));
  const el=document.getElementById('exlist');
  if(!list.length){ el.innerHTML=`<div class="empty"><div class="e">🔍</div>Энэ шүүлтэд тохирох дасгал алга. Өөр сонголт хийгээрэй.</div>`; return; }
  el.innerHTML = list.map(x=>`
    <div class="exrow" data-ex="${x.id}" style="cursor:pointer">
      <div class="thumb">${x.e}</div>
      <div class="info"><b>${x.n}</b><span>${x.loc==='home'?'🏠':'🏋️'} ${M_NAMES[x.m]} · ${x.lvl===1?'Анхан':x.lvl===2?'Дунд':'Ахисан'}</span></div>
      <div class="sr" style="color:var(--mut2);font-size:20px">›</div>
    </div>`).join('');
  el.querySelectorAll('.exrow').forEach(r=>r.onclick=()=>openExercise(r.dataset.ex));
}
