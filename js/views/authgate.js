/* ---------- LOGIN / SIGN UP GATE ---------- */
let authMode='login'; // 'login' | 'signup'
let authBusy=false;
let authErr='';
let authDraft={email:'', pass:'', pass2:''};

function renderAuthLoading(){
  app.innerHTML = `<div class="view center" style="padding-top:120px">
    <div class="logo" style="justify-content:center;margin-bottom:16px"><img src="icons/logo-mark.svg" alt="MongolFit" style="height:32px"></div>
    <p class="mut sm">Ачааллаж байна…</p></div>`;
}

function renderAuthGate(){
  if(authInitError){
    app.innerHTML = `<div class="view center" style="padding-top:100px">
      <div class="logo" style="justify-content:center;margin-bottom:16px"><img src="icons/logo-mark.svg" alt="MongolFit" style="height:32px"></div>
      <p class="mut sm">Холболтын алдаа гарлаа. Интернэтээ шалгаад хуудсаа дахин ачаалаарай.</p>
      <button class="btn p" id="au_retry" style="margin-top:16px">Дахин ачаалах</button>
    </div>`;
    document.getElementById('au_retry').onclick=()=>location.reload();
    return;
  }
  app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div></div>
    <div class="view">
      <div class="hero">
        <div class="eyebrow">Гэр &amp; Жийм · Монгол</div>
        <h1>${authMode==='login' ? 'Нэвтэрч <span class="y">үргэлжлүүл</span>' : 'Бүртгэл <span class="y">үүсгэ</span>'}</h1>
        <p>Дансаараа бүх төхөөрөмж дээрээ хөтөлбөр, ахиц, хоолны тэмдэглэлээ хадгалж, хаанаас ч үргэлжлүүл.</p>
      </div>
      <div class="field" style="margin-top:18px"><label>Имэйл</label><input class="txin" id="au_email" type="email" placeholder="tanii@mail.com" autocomplete="email" value="${esc(authDraft.email)}"></div>
      <div class="field"><label>Нууц үг</label><input class="txin" id="au_pass" type="password" placeholder="Хамгийн багадаа 6 тэмдэгт" autocomplete="${authMode==='login'?'current-password':'new-password'}" value="${esc(authDraft.pass)}"></div>
      ${authMode==='signup' ? `<div class="field"><label>Нууц үг давтах</label><input class="txin" id="au_pass2" type="password" placeholder="Дахин оруулна уу" value="${esc(authDraft.pass2)}"></div>` : ''}
      ${authErr ? `<p class="sm" style="color:var(--coral);margin:0 0 14px">${esc(authErr)}</p>` : ''}
      <button class="btn p" id="au_submit" ${authBusy?'disabled':''}>${authBusy ? 'Түр хүлээнэ үү…' : (authMode==='login' ? 'Нэвтрэх' : 'Бүртгүүлэх')}</button>
      <button class="btn g" id="au_switch" style="margin-top:10px">${authMode==='login' ? 'Шинэ хэрэглэгч үү? Бүртгүүлэх' : 'Бүртгэлтэй юу? Нэвтрэх'}</button>
      ${authMode==='login' ? `<button class="chip" id="au_forgot" style="margin-top:14px">Нууц үг мартсан?</button>` : ''}
      <p class="xs mut center" style="margin-top:20px">Таны мэдээлэл зөвхөн танд харагдана.</p>
    </div>`;

  const captureDraft=()=>{
    authDraft = {
      email: document.getElementById('au_email').value||'',
      pass: document.getElementById('au_pass').value||'',
      pass2: (document.getElementById('au_pass2')||{}).value||'',
    };
  };

  document.getElementById('au_switch').onclick=()=>{
    captureDraft(); authDraft.pass=''; authDraft.pass2='';
    authMode = authMode==='login' ? 'signup' : 'login'; authErr=''; renderAuthGate();
  };

  const forgot=document.getElementById('au_forgot');
  if(forgot) forgot.onclick=async()=>{
    captureDraft();
    const email=authDraft.email.trim();
    if(!email){ authErr='Имэйлээ эхлээд бичнэ үү.'; renderAuthGate(); return; }
    try{ await resetPassword(email); toast('Нууц үг сэргээх холбоос имэйл рүү илгээгдлээ 📩'); }
    catch(e){ authErr=authErrMsg(e.code); renderAuthGate(); }
  };

  const submit=async()=>{
    captureDraft();
    const email=authDraft.email.trim();
    const pass=authDraft.pass;
    if(!email || !pass){ authErr='Имэйл, нууц үгээ бөглөнө үү.'; renderAuthGate(); return; }
    if(authMode==='signup' && pass!==authDraft.pass2){ authErr='Нууц үг таарахгүй байна.'; renderAuthGate(); return; }
    authBusy=true; authErr=''; renderAuthGate();
    try{
      if(authMode==='login') await logIn(email, pass);
      else await signUp(email, pass);
      // амжилттай бол onAuthStateChanged сонсогч цаашдыг нь удирдана
    }catch(e){
      authBusy=false; authErr=authErrMsg(e.code); renderAuthGate();
    }
  };
  document.getElementById('au_submit').onclick=submit;
  ['au_email','au_pass','au_pass2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.onkeydown=e=>{ if(e.key==='Enter') submit(); };
  });
}
