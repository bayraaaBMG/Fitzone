/* ---------- LOGIN / SIGN UP GATE ---------- */
let authMode='login'; // 'login' | 'signup'
let authBusy=false;
let authErr='';
let authDraft={email:'', pass:'', pass2:''};

function renderAuthLoading(){
  app.innerHTML = `<div class="view center" style="padding-top:120px">
    <div class="logo" style="justify-content:center;margin-bottom:16px"><img src="icons/logo-mark.svg" alt="MongolFit" style="height:32px"></div>
    <p class="mut sm">${t('auth_loading')}</p></div>`;
}

function renderAuthGate(){
  if(authInitError){
    app.innerHTML = `<div class="view center" style="padding-top:100px">
      <div class="logo" style="justify-content:center;margin-bottom:16px"><img src="icons/logo-mark.svg" alt="MongolFit" style="height:32px"></div>
      <p class="mut sm">${t('conn_error')}</p>
      <button class="btn p" id="au_retry" style="margin-top:16px">${t('reload')}</button>
    </div>`;
    document.getElementById('au_retry').onclick=()=>location.reload();
    return;
  }
  app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div></div>
    <div class="view">
      <div class="hero">
        <div class="eyebrow">${t('onb_intro_eyebrow')}</div>
        <h1>${authMode==='login' ? t('auth_login_title') : t('auth_signup_title')}</h1>
        <p>${t('auth_tagline')}</p>
      </div>
      <button class="btn g" id="au_google" style="margin-top:18px; display:flex; align-items:center; justify-content:center; gap:10px" ${authBusy?'disabled':''}>
        <svg width="18" height="18" viewBox="0 0 48 48" style="flex:none"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.4C39.9 37 44 31.1 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
        ${authBusy ? t('auth_wait') : t('auth_google')}
      </button>
      <p class="xs mut center" style="margin:14px 0">${t('auth_or_email')}</p>
      <div class="field"><label>${t('auth_email')}</label><input class="txin" id="au_email" type="email" placeholder="tanii@mail.com" autocomplete="email" value="${esc(authDraft.email)}"></div>
      <div class="field"><label>${t('auth_pass')}</label><input class="txin" id="au_pass" type="password" placeholder="${t('auth_pass_placeholder')}" autocomplete="${authMode==='login'?'current-password':'new-password'}" value="${esc(authDraft.pass)}"></div>
      ${authMode==='signup' ? `<div class="field"><label>${t('auth_pass2')}</label><input class="txin" id="au_pass2" type="password" placeholder="${t('auth_pass2_placeholder')}" value="${esc(authDraft.pass2)}"></div>` : ''}
      ${authErr ? `<p class="sm" style="color:var(--coral);margin:0 0 6px">${esc(authErr)}</p>` : ''}
      ${(authErr && authDiagLog.length) ? `<details style="margin:0 0 14px">
        <summary class="xs mut" style="cursor:pointer">Debug info</summary>
        <pre class="xs mut" style="white-space:pre-wrap;word-break:break-all;margin:6px 0 0">${esc(authDiagLog.join('\n'))}</pre>
      </details>` : ''}
      <button class="btn p" id="au_submit" ${authBusy?'disabled':''}>${authBusy ? t('auth_wait') : (authMode==='login' ? t('auth_login_btn') : t('auth_signup_btn'))}</button>
      <button class="btn g" id="au_switch" style="margin-top:10px">${authMode==='login' ? t('auth_switch_to_signup') : t('auth_switch_to_login')}</button>
      ${authMode==='login' ? `<button class="chip" id="au_forgot" style="margin-top:14px">${t('auth_forgot')}</button>` : ''}
      <p class="xs mut center" style="margin-top:20px">${t('auth_privacy')}</p>
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
    if(!email){ authErr=t('err_email_first'); renderAuthGate(); return; }
    try{ await resetPassword(email); toast(t('toast_reset_sent')); }
    catch(e){ authErr=authErrMsg(e.code); renderAuthGate(); }
  };

  const submit=async()=>{
    captureDraft();
    const email=authDraft.email.trim();
    const pass=authDraft.pass;
    if(!email || !pass){ authErr=t('err_fill_email_pass'); renderAuthGate(); return; }
    if(authMode==='signup' && pass!==authDraft.pass2){ authErr=t('err_pass_mismatch'); renderAuthGate(); return; }
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
  document.getElementById('au_google').onclick=async()=>{
    authBusy=true; authErr=''; renderAuthGate();
    try{
      await googleSignIn();
      // амжилттай popup бол onAuthStateChanged цаашдыг нь удирдана;
      // redirect бол хуудас энд шилжинэ, доорх катч дуудагдахгvй
    }catch(e){
      authBusy=false; authErr=authErrMsg(e.code); renderAuthGate();
    }
  };
  ['au_email','au_pass','au_pass2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.onkeydown=e=>{ if(e.key==='Enter') submit(); };
  });
}
