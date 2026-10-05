/* ---------- MongolFit public pages (landing, privacy, terms, 404) ----------
   Deliberately small. Loads nothing from the app: no Firebase, no camera, no
   MediaPipe, no ML runtime. Mongolian is the static HTML (crawlable); English
   comes from the app's own i18n (js/i18n.js + js/i18n-public.js), which is only
   fetched when a visitor actually chooses English. */
(function(){
  'use strict';
  const root = document.documentElement;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const store = {
    get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} },
  };

  /* ---------- year ---------- */
  $$('#year').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- signed-in visitors get "Open app" instead of sign-up ----------
     The app sets mf_signed_in on login and clears it on logout. It is only a
     hint for which button to show — the app itself still checks the session. */
  const signedIn = store.get('mf_signed_in') === '1';
  if(signedIn){
    $$('.when-out').forEach(el => { el.hidden = true; });
    $$('.when-in').forEach(el => { el.hidden = false; });
    // an installed app launched onto "/" (old shortcut) goes straight into the app
    const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    if(standalone && location.pathname === '/') { location.replace('/app'); return; }
  }

  /* ---------- language ---------- */
  let lang = store.get('mf_lang') === 'en' ? 'en' : 'mn';
  const langBtn = $('#langBtn');
  function loadScript(src){
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  let i18nReady = null;
  function loadI18n(){
    if(!i18nReady){
      window.S = window.S || {};
      window.S.lang = 'en';
      i18nReady = loadScript('/js/i18n.js').then(() => loadScript('/js/i18n-public.js'));
    }
    return i18nReady;
  }
  function applyEnglish(){
    const tr = k => (typeof t === 'function' ? t(k) : k);
    $$('[data-i18n]').forEach(el => { const v = tr(el.dataset.i18n); if(v && v !== el.dataset.i18n) el.textContent = v; });
    $$('[data-i18n-html]').forEach(el => { const v = tr(el.dataset.i18nHtml); if(v && v !== el.dataset.i18nHtml) el.innerHTML = v; });
    $$('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, key] = pair.split(':');
        const v = tr(key);
        if(attr && v && v !== key) el.setAttribute(attr.trim(), v);
      });
    });
    root.lang = 'en';
    if(langBtn){ langBtn.textContent = 'MN'; langBtn.setAttribute('aria-label', 'Монгол хэл рүү шилжих'); }
    renderExercises();
  }
  if(lang === 'en') loadI18n().then(applyEnglish).catch(() => { lang = 'mn'; });
  if(langBtn) langBtn.addEventListener('click', () => {
    if(lang === 'mn'){
      lang = 'en'; store.set('mf_lang', 'en');
      loadI18n().then(applyEnglish).catch(() => { lang = 'mn'; store.set('mf_lang', 'mn'); });
    } else {
      // the Mongolian page is the static HTML: reloading restores it exactly
      store.set('mf_lang', 'mn');
      location.reload();
    }
  });

  /* ---------- mobile menu ---------- */
  const menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
  function setMenu(open, returnFocus){
    if(!menu || !menuBtn) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? (lang === 'en' ? 'Close menu' : 'Цэс хаах') : (lang === 'en' ? 'Open menu' : 'Цэс нээх'));
    if(open){ const first = menu.querySelector('a'); if(first) first.focus(); }
    else if(returnFocus) menuBtn.focus();
  }
  if(menuBtn && menu){
    menuBtn.addEventListener('click', () => setMenu(menu.hidden));
    menu.addEventListener('click', e => { if(e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
    document.addEventListener('click', e => { if(!menu.hidden && !e.target.closest('#mobileMenu, #menuBtn')) setMenu(false); });
    window.addEventListener('resize', () => { if(window.innerWidth > 860 && !menu.hidden) setMenu(false); });
  }

  /* ---------- sticky mobile CTA + back to top ---------- */
  const sticky = $('#stickyCta'), hero = $('.hero'), final = $('.final'), toTop = $('#toTop');
  if(sticky && hero && 'IntersectionObserver' in window){
    let heroVisible = true, finalVisible = false;
    const update = () => {
      const show = !heroVisible && !finalVisible;
      sticky.hidden = !show;
      document.body.classList.toggle('has-sticky', show);
    };
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(hero);
    if(final) new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; update(); }).observe(final);
  }
  if(toTop){
    const onScroll = () => { toTop.hidden = window.scrollY < 900; };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ---------- exercise preview (static data, loaded on demand) ---------- */
  const exList = $('#exList');
  let exLoc = 'all', exData = null, exLoading = null;
  const LBL = {
    mn:{home:'Гэртээ', gym:'Жиймд', lvl:['', 'Анхан', 'Дунд', 'Ахисан'], cam:'Камераар тоолно', man:'Гараар тоолно'},
    en:{home:'Home', gym:'Gym', lvl:['', 'Beginner', 'Intermediate', 'Advanced'], cam:'Camera counts reps', man:'Manual count'},
  };
  /* the same line-art marks the rest of the page uses */
  const ICON = {
    home: '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
    gym: '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></svg>',
    cam: '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h3L9 5h6l1.5 2h3A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="3.2"/></svg>',
    man: '<svg class="ic-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0 0V4.5a1.5 1.5 0 0 1 3 0V11m0 0V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L5 14.4a1.6 1.6 0 0 1 2.6-1.8L9 14.5V11z"/></svg>',
  };
  /* a neutral stand-in for the few exercises with no photograph — a figure,
     never an emoji */
  const EX_PLACEHOLDER = '<svg class="ex-ph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.6" r="2.1"/><path d="M12 7v6M12 9.5 8.3 11M12 9.5l3.7 1.5M12 13l-2.6 6M12 13l2.6 6"/></svg>';
  function loadExercises(){
    if(!exLoading){
      // js/data.js + js/coach-data.js are plain data files (no app code, no network)
      exLoading = loadScript('/js/data.js')
        .then(() => loadScript('/js/coach-data.js'))
        .then(() => loadScript('/js/ex-photos.js').catch(() => {}))
        .then(() => {
          exData = (typeof EX !== 'undefined' ? EX : []).map(x => ({
            id:x.id, n:x.n, loc:x.loc, lvl:x.lvl,
            photo: !!(typeof EX_PHOTOS !== 'undefined' && EX_PHOTOS[x.id]),
            cam: !!(typeof COACH !== 'undefined' && COACH[x.id] && COACH[x.id].pose),
          }));
        });
    }
    return exLoading;
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function renderExercises(){
    if(!exList || !exData) return;
    const L = LBL[lang];
    const items = exData.filter(x => exLoc === 'all' || x.loc === exLoc);
    exList.innerHTML = items.map(x => `
      <div class="ex-item">
        <span class="ex-thumb">${x.photo
          ? `<img src="/assets/ex/${esc(x.id)}-0.webp" alt="" width="400" height="267" loading="lazy" decoding="async">`
          : EX_PLACEHOLDER}</span>
        <div><b>${esc(x.n)}</b>
          <div class="ex-meta"><small>${x.loc === 'gym' ? ICON.gym : ICON.home} ${esc(L[x.loc] || x.loc)} · ${esc(L.lvl[x.lvl] || '')}</small>
            <span class="tag ${x.cam ? 'cam' : 'man'}">${x.cam ? ICON.cam : ICON.man} ${esc(x.cam ? L.cam : L.man)}</span></div></div></div>`).join('');
  }
  function showExercises(){
    const btn = $('#exLoad');
    if(btn){ btn.disabled = true; }
    loadExercises().then(renderExercises).catch(() => { if(btn) btn.disabled = false; });
  }
  if(exList){
    const btn = $('#exLoad');
    if(btn) btn.addEventListener('click', showExercises);
    // Loaded on request only: growing the list while the page scrolls past it
    // would shift every anchor below it (#pricing, #faq) mid-scroll.
    $$('a[href$="#exercises"]').forEach(a => a.addEventListener('click', () => { if(!exData) showExercises(); }));
    $$('.chips .chip').forEach(chip => chip.addEventListener('click', () => {
      exLoc = chip.dataset.loc;
      $$('.chips .chip').forEach(c => { const on = c === chip; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
      if(exData) renderExercises(); else showExercises();
    }));
  }
})();
