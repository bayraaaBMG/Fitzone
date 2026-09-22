/* ---------- LOGIN / SIGN UP GATE ---------- */
let authMode='login'; // 'login' | 'signup'
let authBusy=false;
let authErr='';
let authDraft={email:'', pass:'', pass2:''};
let authErrField=null; // 'email' | 'pass' | 'pass2' — the field an error is about (aria-invalid)
const AUTH_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function renderAuthLoading(){
  app.innerHTML = `<div class="view center" style="padding-top:120px">
    <div class="logo" style="justify-content:center;margin-bottom:16px"><img src="icons/logo-mark.svg" alt="MongolFit" style="height:32px"></div>
    <p class="mut sm">${t('auth_loading')}</p></div>`;
}

/* signed in, but the account's data couldn't be loaded and there is no local copy */
function renderCloudError(){
  app.innerHTML = `<div class="view center" style="padding-top:100px">
    <div class="logo" style="justify-content:center;margin-bottom:16px"><img src="icons/logo-mark.svg" alt="MongolFit" style="height:32px"></div>
    <p class="mut sm" role="alert">${t('cloud_load_failed')}</p>
    <button class="btn p" id="cl_retry" style="margin-top:16px">${t('cloud_retry')}</button>
    <button class="btn g" id="cl_logout" style="margin-top:10px">${t('logout')}</button>
  </div>`;
  document.getElementById('cl_retry').onclick = async ()=>{
    if(!authUser) return;
    renderAuthLoading();
    await loadCloudState(authUser.uid);
    render();
  };
  document.getElementById('cl_logout').onclick = ()=> logOut();
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
  app.classList.add('auth-wide');
  const errAttrs = f => authErr ? ` aria-describedby="au_err"${authErrField===f ? ' aria-invalid="true"' : ''}` : '';
  const pw = (id, label, placeholder, autocomplete, value) => `
      <div class="field"><label for="${id}">${label}</label>
        <div class="pw-wrap"><input class="txin" id="${id}" type="password" placeholder="${placeholder}" autocomplete="${autocomplete}" value="${esc(value)}"${errAttrs(id==='au_pass'?'pass':'pass2')}>
          <button type="button" class="pw-eye" data-for="${id}" aria-pressed="false" aria-label="${t('auth_show_pass')}"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>`;
  app.innerHTML = `
    <header class="top auth-top"><a class="logo" href="/" aria-label="MongolFit"><img src="icons/logo-mark.svg" alt="">Mongol<b>Fit</b></a></header>
    <div class="auth-page">
    <aside class="auth-side" aria-label="${t('auth_side_label')}">
      <a class="logo auth-brand" href="/"><img src="icons/logo-mark.svg" alt="">Mongol<b>Fit</b></a>
      <p class="eyebrow">${t('onb_intro_eyebrow')}</p>
      <h2 class="auth-side-title">${t('auth_side_title')}</h2>
      <ul class="auth-points">
        <li>${t('auth_side_p1')}</li><li>${t('auth_side_p2')}</li><li>${t('auth_side_p3')}</li>
      </ul>
      <img class="auth-shot" src="assets/screens/home.webp" width="600" height="1298" loading="lazy" decoding="async" alt="${t('auth_side_shot_alt')}">
    </aside>
    <main class="view auth-main">
      <div class="hero">
        <div class="eyebrow">${t('onb_intro_eyebrow')}</div>
        <h1>${authMode==='login' ? t('auth_login_title') : t('auth_signup_title')}</h1>
        <p>${t('auth_tagline')}</p>
      </div>
      <button class="btn g" id="au_google" style="margin-top:18px; display:flex; align-items:center; justify-content:center; gap:10px" ${authBusy?'disabled':''}>
        <svg width="18" height="18" viewBox="0 0 48 48" style="flex:none"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.1 8.1 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.6 5.4C39.9 37 44 31.1 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
        ${authBusy ? t('auth_wait') : t('auth_google')}
      </button>
      ${isInAppBrowser() ? `<p class="xs" role="note" style="color:var(--warn);margin:8px 0 0">${t('auth_inapp_hint')}</p>` : ''}
      <p class="xs mut center" style="margin:14px 0">${t('auth_or_email')}</p>
      <div class="field"><label for="au_email">${t('auth_email')}</label><input class="txin" id="au_email" type="email" inputmode="email" placeholder="tanii@mail.com" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(authDraft.email)}"${errAttrs('email')}></div>
      ${pw('au_pass', t('auth_pass'), t('auth_pass_placeholder'), authMode==='login'?'current-password':'new-password', authDraft.pass)}
      ${authMode==='signup' ? pw('au_pass2', t('auth_pass2'), t('auth_pass2_placeholder'), 'new-password', authDraft.pass2) : ''}
      ${authErr ? `<p class="sm" id="au_err" role="alert" style="color:var(--coral);margin:0 0 14px">${esc(authErr)}</p>` : ''}
      ${(authErr && FZ_DEBUG && authDiagLog.length) ? `<details style="margin:-8px 0 14px">
        <summary class="xs mut" style="cursor:pointer">Debug info</summary>
        <pre class="xs mut" style="white-space:pre-wrap;word-break:break-all;margin:6px 0 0">${esc(authDiagLog.join('\n'))}</pre>
      </details>` : ''}
      <button class="btn p" id="au_submit" ${authBusy?'disabled':''}>${authBusy ? t('auth_wait') : (authMode==='login' ? t('auth_login_btn') : t('auth_signup_btn'))}</button>
      <button class="btn g" id="au_switch" style="margin-top:10px">${authMode==='login' ? t('auth_switch_to_signup') : t('auth_switch_to_login')}</button>
      ${authMode==='login' ? `<button class="chip" id="au_forgot" style="margin-top:14px; min-height:44px">${t('auth_forgot')}</button>` : ''}
      <p class="xs mut center" style="margin-top:20px">${t('auth_privacy')}</p>
      <p class="xs center auth-links"><a href="/">${t('auth_back_home')}</a> · <a href="/privacy">${t('auth_link_privacy')}</a> · <a href="/terms">${t('auth_link_terms')}</a></p>
    </main>
    </div>`;

  // show / hide password — same input element, so password managers keep working
  app.querySelectorAll('.pw-eye').forEach(btn=>btn.onclick=()=>{
    const input = document.getElementById(btn.dataset.for);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? t('auth_hide_pass') : t('auth_show_pass'));
    btn.classList.toggle('on', show);
  });
  if(authErr && authErrField){
    const el = document.getElementById({email:'au_email', pass:'au_pass', pass2:'au_pass2'}[authErrField]);
    if(el) try{ el.focus({preventScroll:false}); }catch(e){}
  }

  const captureDraft=()=>{
    authDraft = {
      email: document.getElementById('au_email').value||'',
      pass: document.getElementById('au_pass').value||'',
      pass2: (document.getElementById('au_pass2')||{}).value||'',
    };
  };

  document.getElementById('au_switch').onclick=()=>{
    captureDraft(); authDraft.pass=''; authDraft.pass2='';
    authMode = authMode==='login' ? 'signup' : 'login'; authErr=''; authErrField=null;
    try{ history.replaceState(history.state, '', (authMode==='login' ? '/login' : '/register') + location.search); }catch(e){}
    renderAuthGate();
  };

  const forgot=document.getElementById('au_forgot');
  if(forgot) forgot.onclick=async()=>{
    captureDraft();
    const email=authDraft.email.trim();
    if(!email){ authErr=t('err_email_first'); authErrField='email'; renderAuthGate(); return; }
    if(!AUTH_EMAIL_RE.test(email)){ authErr=t('autherr_email_format'); authErrField='email'; renderAuthGate(); return; }
    try{ await resetPassword(email); toast(t('toast_reset_sent')); }
    catch(e){ authErr=authErrMsg(e.code); renderAuthGate(); }
  };

  const submit=async()=>{
    if(authBusy) return;
    captureDraft();
    const email=authDraft.email.trim();
    const pass=authDraft.pass;
    const fail = (msg, field) => { authErr=msg; authErrField=field; renderAuthGate(); };
    if(!email) return fail(t('err_fill_email_pass'), 'email');
    if(!AUTH_EMAIL_RE.test(email)) return fail(t('autherr_email_format'), 'email');
    if(!pass) return fail(t('err_fill_email_pass'), 'pass');
    if(authMode==='signup' && pass.length < 6) return fail(t('autherr_pass_short'), 'pass');
    if(authMode==='signup' && pass!==authDraft.pass2) return fail(t('err_pass_mismatch'), 'pass2');
    authBusy=true; authErr=''; authErrField=null; renderAuthGate();
    try{
      if(authMode==='login') await logIn(email, pass);
      else await signUp(email, pass);
      // амжилттай бол onAuthStateChanged сонсогч цаашдыг нь удирдана
    }catch(e){
      authBusy=false; authErr=authErrMsg(e.code);
      authErrField = /email/.test(e.code||'') ? 'email' : /password|credential/.test(e.code||'') ? 'pass' : null;
      renderAuthGate();
    }
  };
  document.getElementById('au_submit').onclick=submit;
  document.getElementById('au_google').onclick=async()=>{
    if(authBusy) return; // double taps while the popup is opening
    authBusy=true; authErr=''; renderAuthGate();
    // safety net: if the popup never reports back (some embedded browsers swallow it)
    // the button must not stay in the loading state forever
    const watchdog = setTimeout(()=>{ if(authBusy && !authUser){ authBusy=false; authErr=t('autherr_timeout'); renderAuthGate(); } }, 180000);
    try{
      await googleSignIn(); // success → onAuthStateChanged (app.js) takes over
    }catch(e){
      authBusy=false; authErr=authErrMsg(e.code); renderAuthGate();
    }finally{ clearTimeout(watchdog); }
  };
  ['au_email','au_pass','au_pass2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.onkeydown=e=>{ if(e.key==='Enter') submit(); };
  });
}
