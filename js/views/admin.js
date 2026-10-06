/* ============================================================
   ADMIN DASHBOARD — /admin, staff only.
   Loaded on demand by js/roles.js (renderAdminRoute), never for normal
   accounts. What each section shows follows authRole; what each write is
   allowed to do is decided by firestore.rules, so a section that is
   revealed by editing this file in the browser still cannot change data.

     overview   moderator+  counts at a glance
     users      moderator+  directory, one account's details, its 30-day
                            challenge (edit/reset/end) and battle results;
                            the owner also grants/revokes roles here
     exercises  admin+      add / edit / hide / delete library exercises
     config     admin+      Home announcement, calorie algorithm numbers,
                            the text of every app screen (config/pages), and
                            the privacy policy and terms (config/legal)
     staff      admin+      who holds a role (the owner can revoke)
     log        admin+      append-only audit trail
   ============================================================ */

const ADMIN_I18N = {
  mn: {
    adm_title:'Админ самбар', adm_back:'Апп руу буцах',
    adm_role_owner:'Эзэмшигч', adm_role_admin:'Админ', adm_role_moderator:'Модератор', adm_role_none:'Энгийн',
    adm_sec_overview:'Тойм', adm_sec_users:'Хэрэглэгч', adm_sec_exercises:'Дасгал', adm_sec_config:'Тохиргоо',
    adm_sec_staff:'Эрх', adm_sec_log:'Түүх',
    adm_loading:'Ачааллаж байна…', adm_load_failed:'Ачаалж чадсангүй. Эрх эсвэл сүлжээгээ шалгана уу.',
    adm_denied_write:'Эрх хүрэлцэхгүй байна (Firestore rules татгалзлаа).',
    adm_saved:'Хадгаллаа', adm_deleted:'Устгалаа', adm_retry:'Дахин ачаалах',
    adm_stat_ex:'Нийт дасгал', adm_stat_custom:'Шинээр нэмсэн', adm_stat_edited:'Засварласан', adm_stat_hidden:'Нуусан',
    adm_stat_users:'Хэрэглэгч (directory)', adm_stat_active7:'Сүүлийн 7 хоногт', adm_stat_staff:'Ажилтан', adm_stat_announce:'Мэдэгдэл',
    adm_on:'Идэвхтэй', adm_off:'Унтраалттай',
    adm_dir_note:'Хэрэглэгч аппаа дараагийн удаа нээх үед энд гарч ирнэ.',
    adm_search:'Хайх (нэр, имэйл, id)…', adm_none_found:'Илэрц олдсонгүй',
    adm_last_seen:'Сүүлд', adm_joined:'Бүртгүүлсэн', adm_uid:'UID',
    adm_workouts:'Хийсэн дасгал', adm_weights:'Жингийн бичлэг',
    adm_challenge:'30 хоногийн сорилт', adm_ch_none:'Идэвхтэй сорилт алга.',
    adm_ch_start:'Эхэлсэн', adm_ch_done:'{0}/30 өдөр', adm_ch_setstart:'Эхлэх огноо',
    adm_ch_save:'Огноог хадгалах', adm_ch_reset:'Явцыг тэглэх', adm_ch_restart:'Өнөөдрөөс дахин эхлүүлэх', adm_ch_end:'Сорилтыг дуусгах',
    adm_ch_begin:'Сорилт эхлүүлэх',
    adm_ch_hint:'Хэрэглэгч апп нь нээлттэй байвал өөрийн хадгалалтаар энэ өөрчлөлтийг дарж бичиж болно.',
    adm_battles:'Сүүлийн тулаан (PvP / AI)', adm_no_battles:'Тулааны үр дүн алга.',
    adm_won:'Ялсан', adm_lost:'Ялагдсан',
    adm_role:'Эрх', adm_role_owner_fixed:'Эзэмшигчийн эрх firestore.rules дотор тогтмол — өөрчлөх боломжгүй.',
    adm_role_only_owner:'Эрх олгох, цуцлахыг зөвхөн эзэмшигч хийнэ.',
    adm_role_set:'Эрх шинэчлэгдлээ', adm_confirm_role:'{0}-д "{1}" эрх тохируулах уу?', adm_revoke:'Цуцлах',
    adm_new_ex:'+ Шинэ дасгал', adm_f_all:'Бүгд', adm_f_custom:'Шинэ', adm_f_edited:'Засварласан', adm_f_hidden:'Нуусан',
    adm_badge_custom:'шинэ', adm_badge_edited:'засварласан', adm_badge_hidden:'нуусан',
    adm_ex_edit:'Дасгал засах', adm_ex_new:'Шинэ дасгал',
    adm_ex_id:'ID (латин жижиг үсэг, тоо, - _)', adm_ex_emoji:'Эможи', adm_ex_name:'Нэр (Монгол)', adm_ex_name_en:'Нэр (English)',
    adm_ex_loc:'Байршил', adm_ex_m:'Булчингийн бүлэг', adm_ex_lvl:'Түвшин', adm_ex_eq:'Тоног төхөөрөмж', adm_ex_goals:'Зорилго',
    adm_ex_kcal:'ккал / минут', adm_ex_video:'Видео / GIF',
    adm_ex_video_hint:'YouTube видео ID (11 тэмдэгт) эсвэл https://…/.mp4, .webm, .gif холбоос.',
    adm_ex_tgt:'Ажиллах булчин', adm_ex_tech:'Гүйцэтгэх заавар', adm_ex_err:'Түгээмэл алдаа', adm_ex_easy:'Хөнгөвчилсөн хувилбар', adm_ex_hard:'Хүндрүүлсэн хувилбар',
    adm_ex_en:'English орчуулга (заавал биш)', adm_ex_hidden:'Номын сан болон хөтөлбөрөөс нуух',
    adm_ex_restore:'Анхны хувилбарт буцаах', adm_ex_delete:'Устгах',
    adm_ex_confirm_delete:'"{0}" дасгалыг бүр мөсөн устгах уу? Хуучин хөтөлбөрт байгаа бол "нуух" нь илүү аюулгүй.',
    adm_ex_confirm_restore:'"{0}"-ийн засварыг устгаж анхны хувилбарт буцаах уу?',
    adm_err_id:'ID буруу эсвэл давхацсан байна.', adm_err_name:'Нэр оруулна уу.', adm_err_video:'Видео холбоос буруу байна.',
    adm_err_markup:'< ба > тэмдэгт ашиглах боломжгүй.',
    adm_ex_nocoach:'Шинэ дасгалд камерын тоолуур, булчингийн зураглал байхгүй — номын сан, хөтөлбөрт гарна.',
    adm_cfg_announce:'Нүүр хуудасны мэдэгдэл', adm_cfg_announce_on:'Мэдэгдэл харуулах',
    adm_cfg_mn:'Монгол текст', adm_cfg_en:'English текст',
    adm_cfg_calc:'Илчлэгийн алгоритм',
    adm_cfg_calc_hint:'Mifflin-St Jeor томьёоны дараах коэффициентууд. Утгууд серверт хүрээгээр шалгагдана.',
    adm_cfg_activity:'Идэвхийн коэффициент (1–5)', adm_cfg_deficit:'Жин хасах (× TDEE)', adm_cfg_surplus:'Булчин нэмэх (× TDEE)',
    adm_cfg_protein:'Уураг (г / кг)', adm_cfg_fat:'Өөхний хувь (0.15–0.45)', adm_cfg_care:'Эрүүл мэндийн доод хязгаар (× TDEE)',
    adm_cfg_floor_m:'Доод илчлэг — эрэгтэй', adm_cfg_floor_f:'Доод илчлэг — эмэгтэй',
    adm_cfg_preview:'Жишээ: 30 настай эрэгтэй, 175 см, 80 кг, жин хасах → {0} ккал, уураг {1} г',
    adm_cfg_defaults:'Анхны утгууд', adm_cfg_save:'Тохиргоо хадгалах',
    adm_staff_hint:'Эрх олгохдоо "Хэрэглэгч" хэсгээс хүнээ сонгоно.', adm_granted:'Олгосон',
    adm_log_empty:'Бичлэг алга.',
    adm_cfg_tab_general:'Ерөнхий', adm_cfg_tab_pages:'Хуудасны текст', adm_cfg_tab_legal:'Нууцлал & Нөхцөл',
    adm_pg_hint:'Апп доторх аливаа бичвэрийг хуудсаар нь сонгож засна. Хоосон үлдээвэл анхны бичвэр сэргэнэ. {0} гэх мэт орлуулагчийг хадгална уу. Тодруулга (bold, өнгө) энгийн текст болж хадгалагдана.',
    adm_pg_g_home:'Нүүр', adm_pg_g_nutrition:'Хооллолт', adm_pg_g_library:'Номын сан & Хөтөлбөр', adm_pg_g_workout:'Дасгал хийх',
    adm_pg_g_onboard:'Асуумж & Нэвтрэх', adm_pg_g_profile:'Ахиц & Профайл', adm_pg_g_other:'Бусад',
    adm_pg_edited_only:'Зөвхөн засварласан', adm_pg_reset:'Анхныхаар', adm_pg_default:'Анхны бичвэр:',
    adm_pg_changes:'{0} хадгалаагүй өөрчлөлт', adm_pg_no_changes:'Өөрчлөлт алга', adm_pg_more:'…дахиад {0}. Хайлтаа нарийсгана уу.',
    adm_pg_err_markup:'{0}: < > " тэмдэгт ашиглах боломжгүй.', adm_pg_err_ph:'{0}: {1} орлуулагч дутуу байна.',
    adm_lg_privacy:'Нууцлалын бодлого', adm_lg_terms:'Үйлчилгээний нөхцөл', adm_lg_view:'Хуудсыг нээх ↗',
    adm_lg_hint:'Нийтийн хуудсанд шууд харагдана (нэвтрэх шаардлагагүй). Хадгалахад "Шинэчилсэн" огноо өнөөдрөөр солигдоно.',
  },
  en: {
    adm_title:'Admin panel', adm_back:'Back to app',
    adm_role_owner:'Owner', adm_role_admin:'Admin', adm_role_moderator:'Moderator', adm_role_none:'User',
    adm_sec_overview:'Overview', adm_sec_users:'Users', adm_sec_exercises:'Exercises', adm_sec_config:'Settings',
    adm_sec_staff:'Roles', adm_sec_log:'Log',
    adm_loading:'Loading…', adm_load_failed:'Could not load. Check your role or connection.',
    adm_denied_write:'Not allowed (rejected by Firestore rules).',
    adm_saved:'Saved', adm_deleted:'Deleted', adm_retry:'Reload',
    adm_stat_ex:'Exercises', adm_stat_custom:'Added', adm_stat_edited:'Edited', adm_stat_hidden:'Hidden',
    adm_stat_users:'Users (directory)', adm_stat_active7:'Active in 7 days', adm_stat_staff:'Staff', adm_stat_announce:'Announcement',
    adm_on:'On', adm_off:'Off',
    adm_dir_note:'A user appears here the next time they open the app.',
    adm_search:'Search (name, email, id)…', adm_none_found:'Nothing found',
    adm_last_seen:'Last seen', adm_joined:'Joined', adm_uid:'UID',
    adm_workouts:'Workouts done', adm_weights:'Weight entries',
    adm_challenge:'30-day challenge', adm_ch_none:'No active challenge.',
    adm_ch_start:'Started', adm_ch_done:'{0}/30 days', adm_ch_setstart:'Start date',
    adm_ch_save:'Save date', adm_ch_reset:'Reset progress', adm_ch_restart:'Restart from today', adm_ch_end:'End challenge',
    adm_ch_begin:'Start a challenge',
    adm_ch_hint:'If the user has the app open, their own next save can overwrite this change.',
    adm_battles:'Recent battles (PvP / AI)', adm_no_battles:'No battle results.',
    adm_won:'Won', adm_lost:'Lost',
    adm_role:'Role', adm_role_owner_fixed:'The owner role is fixed in firestore.rules and cannot be changed.',
    adm_role_only_owner:'Only the owner grants or revokes roles.',
    adm_role_set:'Role updated', adm_confirm_role:'Set the "{1}" role for {0}?', adm_revoke:'Revoke',
    adm_new_ex:'+ New exercise', adm_f_all:'All', adm_f_custom:'New', adm_f_edited:'Edited', adm_f_hidden:'Hidden',
    adm_badge_custom:'new', adm_badge_edited:'edited', adm_badge_hidden:'hidden',
    adm_ex_edit:'Edit exercise', adm_ex_new:'New exercise',
    adm_ex_id:'ID (lowercase latin, digits, - _)', adm_ex_emoji:'Emoji', adm_ex_name:'Name (Mongolian)', adm_ex_name_en:'Name (English)',
    adm_ex_loc:'Location', adm_ex_m:'Muscle group', adm_ex_lvl:'Level', adm_ex_eq:'Equipment', adm_ex_goals:'Goals',
    adm_ex_kcal:'kcal / minute', adm_ex_video:'Video / GIF',
    adm_ex_video_hint:'A YouTube video id (11 characters) or an https://… link to .mp4, .webm or .gif.',
    adm_ex_tgt:'Muscles worked', adm_ex_tech:'Technique', adm_ex_err:'Common mistakes', adm_ex_easy:'Easier version', adm_ex_hard:'Harder version',
    adm_ex_en:'English translation (optional)', adm_ex_hidden:'Hide from the library and plans',
    adm_ex_restore:'Restore the original', adm_ex_delete:'Delete',
    adm_ex_confirm_delete:'Delete "{0}" for good? If it is in old plans, hiding it is safer.',
    adm_ex_confirm_restore:'Drop the edits to "{0}" and restore the original?',
    adm_err_id:'The id is invalid or already taken.', adm_err_name:'Enter a name.', adm_err_video:'The video link is not valid.',
    adm_err_markup:'The < and > characters are not allowed.',
    adm_ex_nocoach:'A new exercise has no camera counter or muscle map — it appears in the library and plans.',
    adm_cfg_announce:'Home announcement', adm_cfg_announce_on:'Show the announcement',
    adm_cfg_mn:'Mongolian text', adm_cfg_en:'English text',
    adm_cfg_calc:'Calorie algorithm',
    adm_cfg_calc_hint:'Factors applied after the Mifflin-St Jeor formula. The server checks every value against its range.',
    adm_cfg_activity:'Activity multiplier (1–5)', adm_cfg_deficit:'Fat loss (× TDEE)', adm_cfg_surplus:'Muscle gain (× TDEE)',
    adm_cfg_protein:'Protein (g / kg)', adm_cfg_fat:'Fat share (0.15–0.45)', adm_cfg_care:'Health-condition floor (× TDEE)',
    adm_cfg_floor_m:'Minimum calories — male', adm_cfg_floor_f:'Minimum calories — female',
    adm_cfg_preview:'Example: male, 30, 175 cm, 80 kg, fat loss → {0} kcal, protein {1} g',
    adm_cfg_defaults:'Defaults', adm_cfg_save:'Save settings',
    adm_staff_hint:'To grant a role, pick the person in the Users section.', adm_granted:'Granted',
    adm_log_empty:'No entries.',
    adm_cfg_tab_general:'General', adm_cfg_tab_pages:'Page text', adm_cfg_tab_legal:'Privacy & Terms',
    adm_pg_hint:'Pick a page and edit any of its text. Leaving a field empty restores the original. Keep placeholders such as {0}. Emphasis (bold, colour) is saved as plain text.',
    adm_pg_g_home:'Home', adm_pg_g_nutrition:'Nutrition', adm_pg_g_library:'Library & plan', adm_pg_g_workout:'Workout',
    adm_pg_g_onboard:'Onboarding & sign-in', adm_pg_g_profile:'Progress & profile', adm_pg_g_other:'Other',
    adm_pg_edited_only:'Edited only', adm_pg_reset:'Restore', adm_pg_default:'Original:',
    adm_pg_changes:'{0} unsaved changes', adm_pg_no_changes:'No changes', adm_pg_more:'…{0} more. Narrow the search.',
    adm_pg_err_markup:'{0}: the < > " characters are not allowed.', adm_pg_err_ph:'{0}: missing placeholder {1}.',
    adm_lg_privacy:'Privacy policy', adm_lg_terms:'Terms of service', adm_lg_view:'Open the page ↗',
    adm_lg_hint:'Shown on the public page straight away (no sign-in needed). Saving sets its "Updated" date to today.',
  },
};
Object.assign(I18N.mn, ADMIN_I18N.mn);
Object.assign(I18N.en, ADMIN_I18N.en);

const ADM_SECTIONS = [
  ['overview', '📊', 'moderator'],
  ['users', '👥', 'moderator'],
  ['exercises', '🏋️', 'admin'],
  ['config', '⚙️', 'admin'],
  ['staff', '🛡', 'admin'],
  ['log', '📜', 'admin'],
];
const AD = {sec: 'overview', userQ: '', exQ: '', exF: 'all', dir: null, roles: null, log: null,
  cfgTab: 'general', pg: {group: 'home', lang: 'mn', q: '', edited: false}, pgDraft: null,
  lg: {page: 'privacy', lang: 'mn'}, lgDefaults: null, lgSaved: null, lgDraft: null};

const admDb = () => firebase.firestore();
const admTime = ms => ms ? new Date(ms).toLocaleString(S.lang === 'en' ? 'en-GB' : 'mn-MN', {dateStyle: 'short', timeStyle: 'short'}) : '—';
const roleName = r => t('adm_role_' + (r || 'none'));
function admErr(e){
  toast(e && e.code === 'permission-denied' ? t('adm_denied_write') : t('toast_save_failed'));
}
function hasMarkup(...vals){ return vals.some(v => typeof v === 'string' && /[<>]/.test(v)); }

/* ---------- shell ---------- */
function renderAdmin(){
  const secs = ADM_SECTIONS.filter(s => hasRole(s[2]));
  if(!secs.some(s => s[0] === AD.sec)) AD.sec = secs[0][0];
  app.innerHTML = `
    <div class="top"><div class="logo"><img src="icons/logo-mark.svg" alt="MongolFit">Mongol<b>Fit</b></div>
      <span class="adm-badge adm-${authRole}">${roleName(authRole)}</span>
      <button class="iconbtn" id="admExit" aria-label="${t('adm_back')}">✕</button></div>
    <div class="view adm">
      <div class="secttl" style="margin-top:4px"><h2>🛡 ${t('adm_title')}</h2></div>
      <p class="xs mut" style="margin:-6px 2px 12px">${esc(authUser ? authUser.email : '')}</p>
      <div class="scrollrow" id="admSecs" role="tablist">${secs.map(([id, ic]) =>
        `<button class="chip ${AD.sec === id ? 'on' : ''}" role="tab" aria-selected="${AD.sec === id}" data-sec="${id}">${ic} ${t('adm_sec_' + id)}</button>`).join('')}</div>
      <div id="admBody" style="margin-top:16px"></div>
    </div>`;
  app.querySelector('#admExit').onclick = () => { S.tab = 'home'; render(); };
  app.querySelectorAll('#admSecs .chip').forEach(b => b.onclick = () => { AD.sec = b.dataset.sec; renderAdmin(); });
  drawAdminSection();
}
function drawAdminSection(){
  const body = document.getElementById('admBody');
  if(!body) return;
  ({overview: admOverview, users: admUsers, exercises: admExercises, config: admConfig, staff: admStaff, log: admLogView})[AD.sec](body);
}
function admLoading(body){ body.innerHTML = `<p class="mut sm center" style="padding:30px 0">${t('adm_loading')}</p>`; }
function admFailed(body, retry){
  body.innerHTML = `<div class="empty"><div class="e">⚠️</div>${t('adm_load_failed')}<br><button class="btn g sm" id="admRetry" style="margin-top:12px">${t('adm_retry')}</button></div>`;
  body.querySelector('#admRetry').onclick = retry;
}

/* ---------- shared loaders ---------- */
async function admLoadDirectory(force){
  if(AD.dir && !force) return AD.dir;
  const snap = await admDb().collection('directory').orderBy('lastSeen', 'desc').limit(500).get();
  AD.dir = snap.docs.map(d => ({uid: d.id, ...d.data()}));
  return AD.dir;
}
async function admLoadRoles(force){
  if(AD.roles && !force) return AD.roles;
  const snap = await admDb().collection('roles').get();
  AD.roles = {};
  snap.forEach(d => { AD.roles[d.id] = d.data(); });
  return AD.roles;
}
function roleOfEntry(u){
  if(String(u.email || '').toLowerCase() === OWNER_EMAIL) return 'owner';
  const r = AD.roles && AD.roles[u.uid];
  return r ? r.role : null;
}

/* ---------- overview ---------- */
async function admOverview(body){
  const docs = Object.values(EX_DOCS);
  const tiles = [
    [t('adm_stat_ex'), liveExercises().length],
    [t('adm_stat_custom'), docs.filter(d => !EX_BUILTIN_IDS.has(d.id)).length],
    [t('adm_stat_edited'), docs.filter(d => EX_BUILTIN_IDS.has(d.id)).length],
    [t('adm_stat_hidden'), docs.filter(d => d.hidden).length],
  ];
  const paint = extra => {
    body.innerHTML = `<div class="adm-tiles">${tiles.concat(extra || []).map(([l, v]) =>
      `<div class="card adm-tile"><b>${v}</b><span class="xs mut">${l}</span></div>`).join('')}</div>
      <p class="xs mut" style="margin-top:12px">${t('adm_dir_note')}</p>`;
  };
  const ann = announceText() ? t('adm_on') : t('adm_off');
  paint([[t('adm_stat_announce'), ann]]);
  try{
    const [dir, roles] = await Promise.all([admLoadDirectory(), admLoadRoles()]);
    const week = Date.now() - 7 * 864e5;
    if(AD.sec !== 'overview') return;
    paint([
      [t('adm_stat_users'), dir.length],
      [t('adm_stat_active7'), dir.filter(u => (u.lastSeen || 0) > week).length],
      [t('adm_stat_staff'), Object.keys(roles).length + 1],
      [t('adm_stat_announce'), ann],
    ]);
  }catch(e){ /* the exercise tiles still stand on their own */ }
}

/* ---------- users ---------- */
async function admUsers(body, force){
  admLoading(body);
  try{ await Promise.all([admLoadDirectory(force), admLoadRoles(force)]); }
  catch(e){ admFailed(body, () => admUsers(body, true)); return; }
  if(AD.sec !== 'users') return;
  body.innerHTML = `
    <input class="txin" id="admUserQ" type="search" placeholder="${t('adm_search')}" value="${esc(AD.userQ)}">
    <p class="xs mut" style="margin:8px 2px 12px">${AD.dir.length} · ${t('adm_dir_note')}</p>
    <div id="admUserList"></div>`;
  const q = body.querySelector('#admUserQ');
  q.oninput = () => { AD.userQ = q.value; drawUserList(); };
  drawUserList();
}
function drawUserList(){
  const el = document.getElementById('admUserList');
  if(!el) return;
  const q = AD.userQ.trim().toLowerCase();
  const list = AD.dir.filter(u => !q || [u.name, u.email, u.uid].some(v => String(v || '').toLowerCase().includes(q)));
  if(!list.length){ el.innerHTML = `<div class="empty">${t('adm_none_found')}</div>`; return; }
  el.innerHTML = list.slice(0, 200).map(u => {
    const r = roleOfEntry(u);
    return `<button class="excard" data-uid="${esc(u.uid)}">
      <div class="thumb">👤</div>
      <div class="info"><b>${esc(u.name || '—')}</b>
        <span class="sr2">${esc(u.email || '')}</span>
        <div class="tags">${r ? `<span class="adm-badge adm-${r}">${roleName(r)}</span>` : ''}
          <span class="vtag">${t('adm_last_seen')}: ${admTime(u.lastSeen)}</span></div></div>
      <div class="chev">›</div></button>`;
  }).join('');
  el.querySelectorAll('.excard').forEach(b => b.onclick = () => openAdminUser(b.dataset.uid));
}

async function openAdminUser(uid){
  const entry = (AD.dir || []).find(u => u.uid === uid) || {uid};
  const sheet = mkSheet();
  const inner = sheet.querySelector('.inner');
  inner.innerHTML = `<div class="grab"></div><p class="mut center" style="padding:30px 0">${t('adm_loading')}</p>`;
  let data;
  try{
    const snap = await usersDoc(uid).get();
    data = snap.exists ? (snap.data() || {}) : {};
  }catch(e){ inner.innerHTML = `<div class="grab"></div><p class="mut center">${t('adm_load_failed')}</p>`; return; }
  if(document.getElementById('sheet') !== sheet) return;
  paintAdminUser(sheet, entry, data);
}
function paintAdminUser(sheet, u, data){
  const p = (data.profile && typeof data.profile === 'object') ? data.profile : {};
  const ch = (data.challenge && typeof data.challenge.start === 'string') ? data.challenge : null;
  const done = ch && Array.isArray(ch.done) ? ch.done.length : 0;
  const role = roleOfEntry(u);
  const battles = (Array.isArray(data.workoutResults) ? data.workoutResults : [])
    .filter(r => r && r.opponent && typeof r.opponent === 'object').slice(0, 10);
  const isSelf = authUser && authUser.uid === u.uid;
  const roleCtl = role === 'owner'
    ? `<p class="xs mut">${t('adm_role_owner_fixed')}</p>`
    : hasRole('owner') && !isSelf
      ? `<div class="chiprow" id="admRoleRow">${[null, 'moderator', 'admin'].map(r =>
          `<button class="chip ${role === r ? 'on' : ''}" data-r="${r || ''}">${roleName(r)}</button>`).join('')}</div>`
      : `<p class="xs mut">${roleName(role)} · ${t('adm_role_only_owner')}</p>`;

  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:22px;margin-bottom:2px">${esc(p.name || u.name || '—')}</h2>
    <p class="xs mut" style="margin:0 0 12px;word-break:break-all">${esc(u.email || '')}<br>${t('adm_uid')}: ${esc(u.uid)}</p>
    <div class="kv">
      <div class="k"><b>${esc(goalName(p.goal) || '—')}</b><span>${t('onb_goal')}</span></div>
      <div class="k"><b>${esc(LVL_NAMES[p.level] || '—')}</b><span>${t('onb_level')}</span></div>
      <div class="k"><b>${Array.isArray(data.completed) ? data.completed.length : 0}</b><span>${t('adm_workouts')}</span></div>
    </div>
    <p class="xs mut">${t('adm_joined')}: ${esc(p.joinedAt || '—')} · ${t('adm_last_seen')}: ${admTime(data.updatedAt || u.lastSeen)}
      · ${t('adm_weights')}: ${Array.isArray(data.weights) ? data.weights.length : 0}</p>

    <div class="field" style="margin-top:18px"><label>${t('adm_role')}</label>${roleCtl}</div>

    <div class="field"><label>${t('adm_challenge')}</label>
      ${ch ? `<div class="card">
          <b>${t('adm_ch_done', done)}</b>
          <div class="xs mut" style="margin-top:2px">${t('adm_ch_start')}: ${esc(ch.start)}</div>
          <div class="inrow" style="margin-top:12px;align-items:flex-end">
            <div class="field" style="flex:1;margin:0"><label for="admChStart">${t('adm_ch_setstart')}</label>
              <input class="txin" id="admChStart" type="date" value="${esc(ch.start)}"></div>
            <button class="btn g sm" id="admChSave">${t('adm_ch_save')}</button>
          </div>
          <div class="adm-btns">
            <button class="btn g sm" id="admChReset">${t('adm_ch_reset')}</button>
            <button class="btn g sm" id="admChRestart">${t('adm_ch_restart')}</button>
            <button class="btn coral sm" id="admChEnd">${t('adm_ch_end')}</button>
          </div></div>`
        : `<p class="xs mut" style="margin:0 0 8px">${t('adm_ch_none')}</p>
           <button class="btn g sm" id="admChRestart">${t('adm_ch_begin')}</button>`}
      <p class="xs mut" style="margin-top:8px">${t('adm_ch_hint')}</p>
    </div>

    <div class="field"><label>${t('adm_battles')}</label>
      ${battles.length ? `<table class="adm-table"><tbody>${battles.map(r => {
        const x = ex(r.exerciseId);
        const amt = r.mode === 'time' ? `${+r.heldSec || 0}${t('unit_sec')}` : `${+r.reps || 0}×`;
        return `<tr><td>${esc(x ? x.n : String(r.exerciseId || ''))}<div class="xs mut">${admTime(r.completedAt)} · ${esc(String(r.opponent.type || ''))}</div></td>
          <td>${amt} / ${+r.opponent.target || 0}</td>
          <td class="${r.won ? 'ok' : 'bad'}">${r.won ? t('adm_won') : t('adm_lost')}</td></tr>`;
      }).join('')}</tbody></table>` : `<p class="xs mut">${t('adm_no_battles')}</p>`}
    </div>`;

  const setChallenge = async (next, action) => {
    try{
      await usersDoc(u.uid).update({challenge: next, updatedAt: Date.now()});
      adminLog(action, u.uid, next ? `start=${next.start} done=${next.done.length}` : '');
      data.challenge = next; data.updatedAt = Date.now();
      toast(t('adm_saved'));
      paintAdminUser(sheet, u, data);
    }catch(e){ admErr(e); }
  };
  const q = s => sheet.querySelector(s);
  if(q('#admChSave')) q('#admChSave').onclick = () => {
    const v = q('#admChStart').value;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    setChallenge({start: v, done: (ch.done || []).filter(d => typeof d === 'string' && d >= v)}, 'challenge.start');
  };
  if(q('#admChReset')) q('#admChReset').onclick = () => setChallenge({start: ch.start, done: []}, 'challenge.reset');
  if(q('#admChRestart')) q('#admChRestart').onclick = () => setChallenge({start: today(), done: []}, 'challenge.restart');
  if(q('#admChEnd')) q('#admChEnd').onclick = () => { if(confirm(t('adm_ch_end') + '?')) setChallenge(null, 'challenge.end'); };

  sheet.querySelectorAll('#admRoleRow .chip').forEach(c => c.onclick = async () => {
    const next = c.dataset.r || null;
    if(next === role) return;
    if(!confirm(t('adm_confirm_role', u.email || u.uid, roleName(next)))) return;
    const ref = admDb().collection('roles').doc(u.uid);
    try{
      if(next) await ref.set({role: next, email: String(u.email || '').slice(0, 200), name: String(u.name || '').replace(/[<>]/g, '').slice(0, 60),
        grantedBy: authUser.uid, grantedAt: Date.now()});
      else await ref.delete();
      adminLog(next ? 'role.grant' : 'role.revoke', u.uid, `${u.email || ''} ${next || ''}`.trim());
      if(next) AD.roles[u.uid] = {role: next, email: u.email, name: u.name, grantedAt: Date.now()};
      else delete AD.roles[u.uid];
      toast(t('adm_role_set'));
      paintAdminUser(sheet, u, data);
      drawUserList();
    }catch(e){ admErr(e); }
  });
}

/* ---------- exercises ---------- */
function exStatus(x){
  const d = EX_DOCS[x.id];
  if(!d) return null;
  if(d.hidden) return 'hidden';
  return EX_BUILTIN_IDS.has(x.id) ? 'edited' : 'custom';
}
function admExercises(body){
  body.innerHTML = `
    <button class="btn p" id="admNewEx">${t('adm_new_ex')}</button>
    <input class="txin" id="admExQ" type="search" placeholder="${t('adm_search')}" value="${esc(AD.exQ)}" style="margin-top:12px">
    <div class="scrollrow" id="admExF" style="margin-top:10px">${['all', 'custom', 'edited', 'hidden'].map(f =>
      `<button class="chip ${AD.exF === f ? 'on' : ''}" data-f="${f}">${t('adm_f_' + f)}</button>`).join('')}</div>
    <div id="admExList" style="margin-top:12px"></div>`;
  body.querySelector('#admNewEx').onclick = () => openExerciseEditor(null);
  const q = body.querySelector('#admExQ');
  q.oninput = () => { AD.exQ = q.value; drawExList(); };
  body.querySelectorAll('#admExF .chip').forEach(c => c.onclick = () => {
    AD.exF = c.dataset.f;
    body.querySelectorAll('#admExF .chip').forEach(o => o.classList.toggle('on', o === c));
    drawExList();
  });
  drawExList();
}
function drawExList(){
  const el = document.getElementById('admExList');
  if(!el) return;
  const q = AD.exQ.trim().toLowerCase();
  const list = EX.filter(x => {
    const st = exStatus(x);
    if(AD.exF !== 'all' && st !== AD.exF && !(AD.exF === 'hidden' && x.hidden)) return false;
    return !q || [x.id, x.n, (EX_DOCS[x.id] || {}).n].some(v => String(v || '').toLowerCase().includes(q));
  });
  el.innerHTML = list.length ? `<p class="xs mut" style="margin:0 2px 8px">${list.length}</p>` + list.map(x => {
    const st = exStatus(x);
    return `<button class="excard${x.hidden ? ' adm-dim' : ''}" data-ex="${esc(x.id)}">
      <div class="thumb">${typeof exerciseThumbHTML === 'function' && !x.custom ? exerciseThumbHTML(x.id) : esc(x.e || '🏋️')}</div>
      <div class="info"><b>${esc(x.n)}</b>
        <div class="tags"><span class="vtag">${esc(x.id)}</span><span class="vtag">${M_NAMES[x.m] || ''}</span><span class="vtag">${LVL_NAMES[x.lvl] || ''}</span>
          ${st ? `<span class="adm-badge adm-st-${st}">${t('adm_badge_' + st)}</span>` : ''}</div></div>
      <div class="chev">›</div></button>`;
  }).join('') : `<div class="empty">${t('adm_none_found')}</div>`;
  el.querySelectorAll('.excard').forEach(b => b.onclick = () => openExerciseEditor(b.dataset.ex));
}

/* the Mongolian source values of an exercise (EX itself may currently hold
   the English ones) plus its English overrides */
function exerciseSource(id){
  const base = EX_BUILTIN.find(x => x.id === id);
  const doc = EX_DOCS[id];
  const mn = doc ? {...(base || {}), ...doc} : {...base};
  const en = {...(EX_EN_BUILTIN[id] || {}), ...((doc && doc.en) || {})};
  return {mn, en, builtin: !!base, doc: !!doc};
}

function openExerciseEditor(id){
  const isNew = !id;
  const src = isNew
    ? {mn: {id: '', e: '🏋️', n: '', loc: 'home', m: 'abs', lvl: 1, eq: 'none', kcal: 6, video: '', goals: [], tgt: '', tech: '', err: '', easy: '', hard: '', hidden: false}, en: {}, builtin: false, doc: false}
    : exerciseSource(id);
  const f = {...src.mn, goals: (src.mn.goals || []).slice(), hidden: !!src.mn.hidden, en: {...src.en}};
  const sheet = mkSheet();
  paintExerciseEditor(sheet, f, src, isNew);
}
function paintExerciseEditor(sheet, f, src, isNew){
  const txtField = (k, label, rows, val, en) => {
    const idp = (en ? 'admEn_' : 'admEx_') + k;
    return rows
      ? `<div class="field"><label for="${idp}">${label}</label><textarea class="txin" id="${idp}" rows="${rows}" maxlength="${EX_TEXT_MAX[k]}">${esc(val || '')}</textarea></div>`
      : `<div class="field"><label for="${idp}">${label}</label><input class="txin" id="${idp}" maxlength="${EX_TEXT_MAX[k]}" value="${esc(val || '')}"></div>`;
  };
  const texts = [['tgt', 'adm_ex_tgt', 0], ['tech', 'adm_ex_tech', 4], ['err', 'adm_ex_err', 2], ['easy', 'adm_ex_easy', 0], ['hard', 'adm_ex_hard', 0]];
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:22px;margin-bottom:14px">${isNew ? t('adm_ex_new') : t('adm_ex_edit')}</h2>
    <div class="inrow">
      <div class="field" style="flex:2"><label for="admEx_id">${t('adm_ex_id')}</label>
        <input class="txin" id="admEx_id" value="${esc(f.id)}" ${isNew ? '' : 'disabled'} autocapitalize="off" spellcheck="false" maxlength="40"></div>
      <div class="field" style="flex:1"><label for="admEx_e">${t('adm_ex_emoji')}</label><input class="txin" id="admEx_e" value="${esc(f.e || '')}" maxlength="16"></div>
    </div>
    ${txtField('n', t('adm_ex_name'), 0, f.n)}
    <div class="field"><label>${t('adm_ex_loc')}</label>${chips(f, 'loc', [{v: 'home', n: t('onb_home'), e: '🏠'}, {v: 'gym', n: t('onb_gym'), e: '🏋️'}])}</div>
    <div class="field"><label>${t('adm_ex_m')}</label>${chips(f, 'm', EX_MUSCLE_KEYS.map(k => ({v: k, n: M_NAMES[k]})))}</div>
    <div class="field"><label>${t('adm_ex_lvl')}</label>${chips(f, 'lvl', [1, 2, 3].map(k => ({v: k, n: LVL_NAMES[k]})))}</div>
    <div class="field"><label>${t('adm_ex_eq')}</label>${chips(f, 'eq', EX_EQUIP.map(k => ({v: k, n: k})))}</div>
    <div class="field"><label>${t('adm_ex_goals')}</label>${chips(f, 'goals', EX_GOAL_KEYS.map(k => ({v: k, n: goalName(k)})), true)}</div>
    <div class="inrow">
      <div class="field" style="flex:1"><label for="admEx_kcal">${t('adm_ex_kcal')}</label><input class="txin" id="admEx_kcal" type="number" min="0" max="40" step="0.5" value="${+f.kcal || 0}"></div>
      <div class="field" style="flex:2"><label for="admEx_video">${t('adm_ex_video')}</label><input class="txin" id="admEx_video" value="${esc(f.video || '')}" autocapitalize="off" spellcheck="false"></div>
    </div>
    <p class="xs mut" style="margin:-10px 0 16px">${t('adm_ex_video_hint')}</p>
    ${texts.map(([k, l, r]) => txtField(k, t(l), r, f[k])).join('')}
    <details class="adm-details"><summary>${t('adm_ex_en')}</summary>
      ${txtField('n', t('adm_ex_name_en'), 0, f.en.n, true)}
      ${texts.map(([k, l, r]) => txtField(k, t(l) + ' (EN)', r, f.en[k], true)).join('')}
    </details>
    <label class="adm-check"><input type="checkbox" id="admEx_hidden" ${f.hidden ? 'checked' : ''}> ${t('adm_ex_hidden')}</label>
    ${src.builtin ? '' : `<p class="xs mut">${t('adm_ex_nocoach')}</p>`}
    <p class="xs" id="admExErr" role="alert" style="min-height:1em;color:var(--coral)"></p>
    <button class="btn p" id="admExSave">${t('save')}</button>
    ${!isNew && src.builtin && src.doc ? `<button class="btn g" id="admExRestore" style="margin-top:10px">↺ ${t('adm_ex_restore')}</button>` : ''}
    ${!isNew && !src.builtin ? `<button class="btn coral" id="admExDelete" style="margin-top:10px">🗑 ${t('adm_ex_delete')}</button>` : ''}`;

  const q = s => sheet.querySelector(s);
  const readForm = () => {
    if(isNew) f.id = q('#admEx_id').value.trim().toLowerCase();
    f.e = q('#admEx_e').value.trim();
    f.n = q('#admEx_n').value.trim();
    f.kcal = +q('#admEx_kcal').value || 0;
    f.video = q('#admEx_video').value.trim();
    texts.forEach(([k]) => { f[k] = q('#admEx_' + k).value.trim(); });
    ['n', ...texts.map(x => x[0])].forEach(k => { f.en[k] = q('#admEn_' + k).value.trim(); });
    f.hidden = q('#admEx_hidden').checked;
  };
  // chip taps repaint, so keep what was typed first
  wireChips(sheet, f, () => {
    readForm();
    const open = q('.adm-details') && q('.adm-details').open;
    paintExerciseEditor(sheet, f, src, isNew);
    if(open) q('.adm-details').open = true;
  });

  q('#admExSave').onclick = async () => {
    readForm();
    const err = q('#admExErr');
    const enVals = Object.fromEntries(Object.entries(f.en).filter(([, v]) => v));
    if(!EX_ID_RE.test(f.id) || (isNew && EX.some(x => x.id === f.id))){ err.textContent = t('adm_err_id'); return; }
    if(!f.n){ err.textContent = t('adm_err_name'); return; }
    if(f.video && !EX_VIDEO_RE.test(f.video)){ err.textContent = t('adm_err_video'); return; }
    if(hasMarkup(f.n, f.e, ...texts.map(([k]) => f[k]), ...Object.values(enVals))){ err.textContent = t('adm_err_markup'); return; }
    const doc = {
      id: f.id, n: f.n, e: f.e || '🏋️', loc: f.loc, m: f.m, lvl: +f.lvl, eq: f.eq,
      kcal: Math.min(40, Math.max(0, f.kcal)), video: f.video, goals: f.goals.filter(g => EX_GOAL_KEYS.includes(g)),
      tgt: f.tgt, tech: f.tech, err: f.err, easy: f.easy, hard: f.hard,
      hidden: f.hidden, updatedAt: Date.now(), updatedBy: authUser.uid,
    };
    if(Object.keys(enVals).length) doc.en = enVals;
    const btn = q('#admExSave'); btn.disabled = true;
    try{
      await admDb().collection('exercises').doc(f.id).set(doc);
      await admPatchExercise(f.id, doc);
      adminLog(isNew ? 'exercise.create' : 'exercise.update', f.id, doc.hidden ? 'hidden' : '');
      toast(t('adm_saved'));
      closeSheet();
      drawExList();
    }catch(e){ btn.disabled = false; admErr(e); }
  };
  const drop = async (confirmKey, action) => {
    if(!confirm(t(confirmKey, f.n || f.id))) return;
    try{
      await admDb().collection('exercises').doc(f.id).delete();
      await admPatchExercise(f.id, null);
      adminLog(action, f.id);
      toast(t('adm_deleted'));
      closeSheet();
      drawExList();
    }catch(e){ admErr(e); }
  };
  if(q('#admExRestore')) q('#admExRestore').onclick = () => drop('adm_ex_confirm_restore', 'exercise.restore');
  if(q('#admExDelete')) q('#admExDelete').onclick = () => drop('adm_ex_confirm_delete', 'exercise.delete');
}
/* applies one saved/deleted document locally (and to the device cache)
   without re-reading the whole collection */
async function admPatchExercise(id, doc){
  const cached = (await Store.get('mf_content')) || {};
  const raw = {...(cached.exercises || {})};
  if(doc) raw[id] = doc; else delete raw[id];
  await Store.set('mf_content', {...cached, exercises: raw});
  setExerciseDocs(raw);
}

/* ---------- config ---------- */
function admConfig(body){
  const tabs = [['general', '⚙️'], ['pages', '📝'], ['legal', '⚖️']];
  body.innerHTML = `<div class="scrollrow" id="cfgTabs">${tabs.map(([id, ic]) =>
      `<button class="chip ${AD.cfgTab === id ? 'on' : ''}" data-tab="${id}">${ic} ${t('adm_cfg_tab_' + id)}</button>`).join('')}</div>
    <div id="cfgBody" style="margin-top:14px"></div>`;
  body.querySelectorAll('#cfgTabs .chip').forEach(c => c.onclick = () => { AD.cfgTab = c.dataset.tab; admConfig(body); });
  const el = body.querySelector('#cfgBody');
  if(AD.cfgTab === 'pages') admPages(el);
  else if(AD.cfgTab === 'legal') admLegal(el);
  else paintConfig(el, JSON.parse(JSON.stringify(APP_CONFIG || cleanConfig(null))));
}
function paintConfig(body, cfg){
  const c = cfg.calc, D = CALC_DEFAULTS;
  const num = (id, label, val, step, min, max, def) =>
    `<div class="field" style="flex:1"><label for="${id}">${label}</label>
      <input class="txin" id="${id}" type="number" step="${step}" min="${min}" max="${max}" value="${val}">
      <span class="xs mut">${min}–${max} · ${t('adm_cfg_defaults').toLowerCase()} ${def}</span></div>`;
  body.innerHTML = `
    <div class="card">
      <b>📣 ${t('adm_cfg_announce')}</b>
      <label class="adm-check" style="margin-top:10px"><input type="checkbox" id="cfgAnnOn" ${cfg.announce.on ? 'checked' : ''}> ${t('adm_cfg_announce_on')}</label>
      <div class="field"><label for="cfgAnnMn">${t('adm_cfg_mn')}</label><textarea class="txin" id="cfgAnnMn" rows="3" maxlength="300">${esc(cfg.announce.mn)}</textarea></div>
      <div class="field" style="margin-bottom:0"><label for="cfgAnnEn">${t('adm_cfg_en')}</label><textarea class="txin" id="cfgAnnEn" rows="3" maxlength="300">${esc(cfg.announce.en)}</textarea></div>
    </div>
    <div class="card" style="margin-top:14px">
      <b>🔥 ${t('adm_cfg_calc')}</b>
      <p class="xs mut" style="margin:4px 0 14px">${t('adm_cfg_calc_hint')}</p>
      <div class="field" style="margin-bottom:8px"><label>${t('adm_cfg_activity')}</label></div>
      <div class="inrow adm-five">${[1, 2, 3, 4, 5].map(k =>
        `<div class="field" style="flex:1"><label for="cfgAct${k}">${k}</label><input class="txin" id="cfgAct${k}" type="number" step="0.05" min="1" max="2.5" value="${c.activity[k]}"></div>`).join('')}</div>
      <div class="inrow">${num('cfgDef', t('adm_cfg_deficit'), c.deficit, 0.01, 0.6, 1, D.deficit)}${num('cfgSur', t('adm_cfg_surplus'), c.surplus, 0.01, 1, 1.3, D.surplus)}</div>
      <div class="inrow">${num('cfgPro', t('adm_cfg_protein'), c.proteinPerKg, 0.1, 0.8, 3, D.proteinPerKg)}${num('cfgFat', t('adm_cfg_fat'), c.fatShare, 0.01, 0.15, 0.45, D.fatShare)}</div>
      <div class="inrow">${num('cfgCare', t('adm_cfg_care'), c.careFloor, 0.01, 0.8, 1, D.careFloor)}</div>
      <div class="inrow">${num('cfgFm', t('adm_cfg_floor_m'), c.floorM, 50, 1000, 2500, D.floorM)}${num('cfgFf', t('adm_cfg_floor_f'), c.floorF, 50, 800, 2500, D.floorF)}</div>
      <p class="note xs" id="cfgPreview" style="margin:4px 0 0"></p>
      <button class="btn g sm" id="cfgDefaults" style="margin-top:12px">↺ ${t('adm_cfg_defaults')}</button>
    </div>
    <button class="btn p" id="cfgSave" style="margin-top:16px">${t('adm_cfg_save')}</button>`;

  const q = s => body.querySelector(s);
  const read = () => {
    const v = (id, d) => { const n = +q(id).value; return q(id).value !== '' && isFinite(n) ? n : d; };
    cfg.announce = {on: q('#cfgAnnOn').checked, mn: q('#cfgAnnMn').value.trim(), en: q('#cfgAnnEn').value.trim()};
    cfg.calc = {
      activity: Object.fromEntries([1, 2, 3, 4, 5].map(k => [k, v('#cfgAct' + k, D.activity[k])])),
      deficit: v('#cfgDef', D.deficit), surplus: v('#cfgSur', D.surplus),
      proteinPerKg: v('#cfgPro', D.proteinPerKg), fatShare: v('#cfgFat', D.fatShare),
      careFloor: v('#cfgCare', D.careFloor), floorM: v('#cfgFm', D.floorM), floorF: v('#cfgFf', D.floorF),
    };
    return cfg;
  };
  // the same arithmetic as nutrition() in js/planner.js, on the numbers in the form
  const preview = () => {
    const c2 = cleanConfig(read()).calc;
    const tdee = Math.round((10 * 80 + 6.25 * 175 - 5 * 30 + 5) * c2.activity[3]);
    const cal = Math.max(Math.round(tdee * c2.deficit), c2.floorM);
    q('#cfgPreview').textContent = t('adm_cfg_preview', cal, Math.round(80 * c2.proteinPerKg));
  };
  body.querySelectorAll('input').forEach(i => i.addEventListener('input', preview));
  preview();
  q('#cfgDefaults').onclick = () => {
    read();
    cfg.calc = JSON.parse(JSON.stringify({activity: D.activity, deficit: D.deficit, surplus: D.surplus, proteinPerKg: D.proteinPerKg,
      fatShare: D.fatShare, careFloor: D.careFloor, floorM: D.floorM, floorF: D.floorF}));
    paintConfig(body, cfg);
  };
  q('#cfgSave').onclick = async () => {
    read();
    if(hasMarkup(cfg.announce.mn, cfg.announce.en)){ toast(t('adm_err_markup')); return; }
    const clean = cleanConfig(cfg); // clamps to the same ranges the rules enforce
    const doc = {
      announce: clean.announce,
      calc: {...clean.calc, activity: Object.fromEntries(Object.entries(clean.calc.activity).map(([k, n]) => [String(k), n]))},
      updatedAt: Date.now(), updatedBy: authUser.uid,
    };
    const btn = q('#cfgSave'); btn.disabled = true;
    try{
      await admDb().collection('config').doc('app').set(doc);
      applyConfig(clean);
      const cached = (await Store.get('mf_content')) || {};
      await Store.set('mf_content', {...cached, config: doc});
      adminLog('config.update', 'config/app', clean.announce.on ? 'announce on' : 'announce off');
      toast(t('adm_saved'));
      paintConfig(body, JSON.parse(JSON.stringify(clean)));
    }catch(e){ btn.disabled = false; admErr(e); }
  };
}

/* ---------- page text (config/pages) ----------
   Every on-screen string is an I18N key; the editor groups them by the page
   they belong to (key prefix) and stores only the ones that differ from the
   shipped wording. */
const PAGE_GROUPS = [
  ['home', '🏠', ['home', 'na', 'doctor', 'rec', 'sug', 'todays', 'install', 'ios', 'already', 'other', 'attach', 'q', 'send', 'announce', 'disclaimer']],
  ['nutrition', '🍳', ['nut', 'recipe', 'recipes', 'photo', 'fadv', 'food', 'pantry', 'macro', 'act', 'abbr', 'ingredients', 'instructions', 'find', 'search', 'added', 'nothing', 'can', 'or', 'day', 'not', 'kcal']],
  ['library', '🏋️', ['lib', 'plan', 'plantitle', 'wd', 'ex', 'fig', 'demo', 'video', 'clip', 'proper', 'common', 'easier', 'harder', 'alt', 'no', 'equip', 'goal']],
  ['workout', '⏱', ['ws', 'pose', 'cam', 'rest', 'warmup', 'done', 'finish', 'workout', 'manual', 'target', 'skip']],
  ['onboard', '📝', ['onb', 'bmi', 'auth', 'autherr']],
  ['profile', '👤', ['prog', 'meas', 'chart', 'challenge', 'restart', 'congrats', 'summary', 'pf', 'profile', 'your', 'st', 'unit', 'sources', 'ref']],
  ['other', '🧩', []],
];
const PAGE_LIST_MAX = 150;
function pageGroupOf(k){
  const p = k.split('_')[0];
  const g = PAGE_GROUPS.find(([, , ps]) => ps.includes(p));
  return g ? g[0] : 'other';
}
/* the shipped wording as the plain text an override is written in */
function plainText(s){
  return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
const placeholdersOf = s => (String(s).match(/\{\d\}/g) || []).filter((v, i, a) => a.indexOf(v) === i);
const autoRows = s => Math.min(8, Math.max(1, Math.ceil(String(s || '').length / 42)));

function pagesDirty(){
  const d = AD.pgDraft;
  let n = 0;
  for(const lang of ['mn', 'en']){
    const keys = new Set([...Object.keys(d[lang]), ...Object.keys(PAGE_TEXTS[lang])]);
    keys.forEach(k => { if((d[lang][k] || '') !== (PAGE_TEXTS[lang][k] || '')) n++; });
  }
  return n;
}
function admPages(el){
  if(!AD.pgDraft) AD.pgDraft = {mn: {...PAGE_TEXTS.mn}, en: {...PAGE_TEXTS.en}};
  const P = AD.pg, d = AD.pgDraft;
  const edited = g => Object.keys(I18N_DEFAULTS.mn).filter(k => pageGroupOf(k) === g && (d.mn[k] || d.en[k])).length;
  el.innerHTML = `
    <p class="xs mut" style="margin:0 2px 12px">${t('adm_pg_hint')}</p>
    <div class="scrollrow" id="pgGroups">${PAGE_GROUPS.map(([id, ic]) => {
      const n = edited(id);
      return `<button class="chip ${P.group === id ? 'on' : ''}" data-g="${id}">${ic} ${t('adm_pg_g_' + id)}${n ? ` · ${n}` : ''}</button>`;
    }).join('')}</div>
    <div class="chiprow" id="pgLang" style="margin-top:10px">
      <button class="chip ${P.lang === 'mn' ? 'on' : ''}" data-l="mn">MN</button>
      <button class="chip ${P.lang === 'en' ? 'on' : ''}" data-l="en">EN</button>
      <button class="chip ${P.edited ? 'on' : ''}" id="pgEdited">✎ ${t('adm_pg_edited_only')}</button>
    </div>
    <input class="txin" id="pgQ" type="search" placeholder="${t('adm_search')}" value="${esc(P.q)}" style="margin-top:10px">
    <div id="pgList" style="margin-top:12px"></div>
    <p class="xs" id="pgErr" role="alert" style="color:var(--coral);min-height:1em"></p>
    <div class="adm-savebar"><span class="xs mut" id="pgDirty"></span><button class="btn p sm" id="pgSave">${t('save')}</button></div>`;
  el.querySelectorAll('#pgGroups .chip').forEach(c => c.onclick = () => { P.group = c.dataset.g; P.q = ''; admPages(el); });
  el.querySelectorAll('#pgLang [data-l]').forEach(c => c.onclick = () => { P.lang = c.dataset.l; admPages(el); });
  el.querySelector('#pgEdited').onclick = () => { P.edited = !P.edited; admPages(el); };
  const q = el.querySelector('#pgQ');
  q.oninput = () => { P.q = q.value; drawPageList(el); };
  el.querySelector('#pgSave').onclick = () => savePages(el);
  drawPageList(el);
}
function drawPageList(el){
  const P = AD.pg, d = AD.pgDraft[P.lang], defs = I18N_DEFAULTS[P.lang];
  const q = P.q.trim().toLowerCase();
  const keys = Object.keys(I18N_DEFAULTS.mn).filter(k => {
    if(!q && pageGroupOf(k) !== P.group) return false;
    if(P.edited && !d[k]) return false;
    return !q || [k, plainText(defs[k]), d[k]].some(v => String(v || '').toLowerCase().includes(q));
  });
  const list = el.querySelector('#pgList');
  if(!keys.length){ list.innerHTML = `<div class="empty">${t('adm_none_found')}</div>`; updatePagesDirty(el); return; }
  list.innerHTML = keys.slice(0, PAGE_LIST_MAX).map(k => {
    const def = plainText(defs[k]), ov = d[k];
    return `<div class="adm-txt ${ov ? 'edited' : ''}" data-k="${esc(k)}">
      <div class="adm-txt-h"><code>${esc(k)}</code><button class="adm-link" data-reset ${ov ? '' : 'hidden'}>↺ ${t('adm_pg_reset')}</button></div>
      <div class="xs mut adm-txt-def" ${ov ? '' : 'hidden'}>${t('adm_pg_default')} ${esc(def)}</div>
      <textarea class="txin" rows="${autoRows(ov || def)}" maxlength="${PAGE_TEXT_MAX}" aria-label="${esc(k)}">${esc(ov || def)}</textarea>
    </div>`;
  }).join('') + (keys.length > PAGE_LIST_MAX ? `<p class="xs mut">${t('adm_pg_more', keys.length - PAGE_LIST_MAX)}</p>` : '');
  list.querySelectorAll('.adm-txt').forEach(row => {
    const k = row.dataset.k, ta = row.querySelector('textarea'), def = plainText(defs[k]);
    const sync = () => {
      const v = ta.value.trim();
      if(v && v !== def) d[k] = v; else delete d[k];
      const on = !!d[k];
      row.classList.toggle('edited', on);
      row.querySelector('[data-reset]').hidden = !on;
      row.querySelector('.adm-txt-def').hidden = !on;
      updatePagesDirty(el);
    };
    ta.oninput = sync;
    row.querySelector('[data-reset]').onclick = () => { ta.value = def; sync(); };
  });
  updatePagesDirty(el);
}
function updatePagesDirty(el){
  const n = pagesDirty();
  const s = el.querySelector('#pgDirty');
  if(s) s.textContent = n ? t('adm_pg_changes', n) : t('adm_pg_no_changes');
}
async function savePages(el){
  const d = AD.pgDraft, err = el.querySelector('#pgErr');
  err.textContent = '';
  for(const lang of ['mn', 'en']){
    for(const [k, v] of Object.entries(d[lang])){
      if(/[<>"]/.test(v)){ err.textContent = t('adm_pg_err_markup', k); return; }
      const missing = placeholdersOf(I18N_DEFAULTS[lang][k]).filter(ph => !v.includes(ph));
      if(missing.length){ err.textContent = t('adm_pg_err_ph', k, missing.join(' ')); return; }
    }
  }
  const doc = {mn: {...d.mn}, en: {...d.en}, updatedAt: Date.now(), updatedBy: authUser.uid};
  const n = pagesDirty();
  const btn = el.querySelector('#pgSave'); btn.disabled = true;
  try{
    await admDb().collection('config').doc('pages').set(doc);
    applyPages(cleanPages(doc));
    const cached = (await Store.get('mf_content')) || {};
    await Store.set('mf_content', {...cached, pages: doc});
    adminLog('pages.update', 'config/pages', `${n} changes, ${Object.keys(doc.mn).length + Object.keys(doc.en).length} overrides`);
    AD.pgDraft = null;
    toast(t('adm_saved'));
    renderAdmin();
  }catch(e){ btn.disabled = false; admErr(e); }
}

/* ---------- privacy policy & terms (config/legal) ----------
   The shipped wording is the static HTML (Mongolian) and js/i18n-public.js
   (English); both are read here so the editor starts from what visitors see
   today. js/public.js applies the saved overrides on the public pages. */
const LEGAL_PAGES = {privacy: {file: 'privacy.html', path: '/privacy', prefix: 'pv_'}, terms: {file: 'terms.html', path: '/terms', prefix: 'tm_'}};
let _pubI18n = null;
async function loadLegalDefaults(){
  if(AD.lgDefaults) return AD.lgDefaults;
  if(!_pubI18n){
    _pubI18n = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/i18n-public.js'; s.onload = res;
      s.onerror = () => { _pubI18n = null; rej(new Error('i18n-public.js')); };
      document.head.appendChild(s);
    });
  }
  await _pubI18n;
  const out = {};
  for(const [page, meta] of Object.entries(LEGAL_PAGES)){
    const res = await fetch(meta.file, {cache: 'no-cache'});
    if(!res.ok) throw new Error(meta.file);
    const docEl = new DOMParser().parseFromString(await res.text(), 'text/html');
    out[page] = [...docEl.querySelectorAll('[data-i18n]')]
      .filter(e => e.dataset.i18n.startsWith(meta.prefix))
      .map(e => ({key: e.dataset.i18n, tag: e.tagName.toLowerCase(),
        mn: e.textContent.replace(/\s+/g, ' ').trim(), en: I18N.en[e.dataset.i18n] || ''}));
  }
  AD.lgDefaults = out;
  return out;
}
function cleanLegal(d){
  const out = {};
  for(const page of Object.keys(LEGAL_PAGES)){
    const p = (d && d[page] && typeof d[page] === 'object') ? d[page] : {};
    out[page] = {mn: {}, en: {}};
    for(const lang of ['mn', 'en']){
      for(const [k, v] of Object.entries((p[lang] && typeof p[lang] === 'object') ? p[lang] : {})){
        if(typeof v === 'string' && v.trim()) out[page][lang][k] = v.trim().slice(0, 5000);
      }
    }
    if(typeof p.updated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.updated)) out[page].updated = p.updated;
  }
  return out;
}
async function admLegal(el, force){
  admLoading(el);
  try{
    await loadLegalDefaults();
    if(!AD.lgSaved || force){
      const snap = await admDb().collection('config').doc('legal').get();
      AD.lgSaved = cleanLegal(snap.exists ? snap.data() : null);
      AD.lgDraft = JSON.parse(JSON.stringify(AD.lgSaved));
    }
  }catch(e){ admFailed(el, () => admLegal(el, true)); return; }
  if(AD.sec !== 'config' || AD.cfgTab !== 'legal') return;
  paintLegal(el);
}
function legalChanged(page){
  const a = AD.lgDraft[page], b = AD.lgSaved[page];
  return JSON.stringify([a.mn, a.en]) !== JSON.stringify([b.mn, b.en]);
}
function paintLegal(el){
  const L = AD.lg, meta = LEGAL_PAGES[L.page], draft = AD.lgDraft[L.page][L.lang];
  const rows = AD.lgDefaults[L.page];
  const changed = Object.keys(LEGAL_PAGES).filter(legalChanged).length;
  el.innerHTML = `
    <p class="xs mut" style="margin:0 2px 12px">${t('adm_lg_hint')}</p>
    <div class="chiprow" id="lgPage">${Object.keys(LEGAL_PAGES).map(p =>
      `<button class="chip ${L.page === p ? 'on' : ''}" data-p="${p}">${t('adm_lg_' + p)}${legalChanged(p) ? ' ✎' : ''}</button>`).join('')}</div>
    <div class="chiprow" id="lgLang" style="margin-top:10px">
      <button class="chip ${L.lang === 'mn' ? 'on' : ''}" data-l="mn">MN</button>
      <button class="chip ${L.lang === 'en' ? 'on' : ''}" data-l="en">EN</button>
      <a class="chip" href="${meta.path}" target="_blank" rel="noopener">${t('adm_lg_view')}</a>
    </div>
    <p class="xs mut" style="margin:10px 2px 0">${t('adm_lg_' + L.page)} · ${esc(AD.lgSaved[L.page].updated || '—')}</p>
    <div id="lgList" style="margin-top:12px">${rows.map(r => {
      const def = r[L.lang], ov = draft[r.key];
      return `<div class="adm-txt ${ov ? 'edited' : ''} ${/^h\d$/.test(r.tag) ? 'adm-txt-head' : ''}" data-k="${esc(r.key)}">
        <div class="adm-txt-h"><code>${esc(r.key)}</code><button class="adm-link" data-reset ${ov ? '' : 'hidden'}>↺ ${t('adm_pg_reset')}</button></div>
        <textarea class="txin" rows="${autoRows(ov || def)}" maxlength="5000" aria-label="${esc(r.key)}">${esc(ov || def)}</textarea>
      </div>`;
    }).join('')}</div>
    <div class="adm-savebar"><span class="xs mut" id="lgDirty">${changed ? t('adm_pg_changes', changed) : t('adm_pg_no_changes')}</span>
      <button class="btn p sm" id="lgSave">${t('save')}</button></div>`;
  el.querySelectorAll('#lgPage [data-p]').forEach(c => c.onclick = () => { L.page = c.dataset.p; paintLegal(el); });
  el.querySelectorAll('#lgLang [data-l]').forEach(c => c.onclick = () => { L.lang = c.dataset.l; paintLegal(el); });
  el.querySelectorAll('#lgList .adm-txt').forEach(row => {
    const k = row.dataset.k, ta = row.querySelector('textarea');
    const def = (rows.find(r => r.key === k) || {})[L.lang] || '';
    const sync = () => {
      const v = ta.value.trim();
      if(v && v !== def) draft[k] = v; else delete draft[k];
      row.classList.toggle('edited', !!draft[k]);
      row.querySelector('[data-reset]').hidden = !draft[k];
      const n = Object.keys(LEGAL_PAGES).filter(legalChanged).length;
      el.querySelector('#lgDirty').textContent = n ? t('adm_pg_changes', n) : t('adm_pg_no_changes');
    };
    ta.oninput = sync;
    row.querySelector('[data-reset]').onclick = () => { ta.value = def; sync(); };
  });
  el.querySelector('#lgSave').onclick = async () => {
    const pages = Object.keys(LEGAL_PAGES).filter(legalChanged);
    if(!pages.length) return;
    const next = JSON.parse(JSON.stringify(AD.lgDraft));
    pages.forEach(p => { next[p].updated = today(); });
    const btn = el.querySelector('#lgSave'); btn.disabled = true;
    try{
      await admDb().collection('config').doc('legal').set({...next, updatedAt: Date.now(), updatedBy: authUser.uid});
      adminLog('legal.update', 'config/legal', pages.join(', '));
      AD.lgSaved = cleanLegal(next);
      AD.lgDraft = JSON.parse(JSON.stringify(AD.lgSaved));
      toast(t('adm_saved'));
      paintLegal(el);
    }catch(e){ btn.disabled = false; admErr(e); }
  };
}

/* ---------- staff ---------- */
async function admStaff(body, force){
  admLoading(body);
  try{ await admLoadRoles(force); }
  catch(e){ admFailed(body, () => admStaff(body, true)); return; }
  if(AD.sec !== 'staff') return;
  const rows = Object.entries(AD.roles).sort((a, b) => (b[1].grantedAt || 0) - (a[1].grantedAt || 0));
  body.innerHTML = `
    <p class="xs mut" style="margin:0 2px 12px">${t('adm_staff_hint')}</p>
    <div class="card adm-staff"><div><b>${esc(OWNER_EMAIL)}</b><div class="xs mut">${t('adm_role_owner_fixed')}</div></div>
      <span class="adm-badge adm-owner">${roleName('owner')}</span></div>
    ${rows.map(([uid, r]) => `<div class="card adm-staff">
      <div style="min-width:0"><b>${esc(r.name || r.email || uid)}</b>
        <div class="xs mut" style="word-break:break-all">${esc(r.email || uid)} · ${t('adm_granted')} ${admTime(r.grantedAt)}</div></div>
      <span class="adm-badge adm-${esc(r.role)}">${roleName(r.role)}</span>
      ${hasRole('owner') ? `<button class="btn g sm" data-revoke="${esc(uid)}">${t('adm_revoke')}</button>` : ''}
    </div>`).join('')}`;
  body.querySelectorAll('[data-revoke]').forEach(b => b.onclick = async () => {
    const uid = b.dataset.revoke, r = AD.roles[uid] || {};
    if(!confirm(t('adm_confirm_role', r.email || uid, roleName(null)))) return;
    try{
      await admDb().collection('roles').doc(uid).delete();
      adminLog('role.revoke', uid, r.email || '');
      delete AD.roles[uid];
      toast(t('adm_role_set'));
      admStaff(body);
    }catch(e){ admErr(e); }
  });
}

/* ---------- audit log ---------- */
async function admLogView(body){
  admLoading(body);
  let snap;
  try{ snap = await admDb().collection('adminLog').orderBy('at', 'desc').limit(100).get(); }
  catch(e){ admFailed(body, () => admLogView(body)); return; }
  if(AD.sec !== 'log') return;
  if(snap.empty){ body.innerHTML = `<div class="empty">${t('adm_log_empty')}</div>`; return; }
  body.innerHTML = `<table class="adm-table"><tbody>${snap.docs.map(d => {
    const e = d.data();
    return `<tr><td><b>${esc(e.action)}</b><div class="xs mut" style="word-break:break-all">${esc(e.target)}${e.note ? ' · ' + esc(e.note) : ''}</div></td>
      <td class="xs mut">${esc(e.byEmail || e.by)}<br>${admTime(e.at)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
