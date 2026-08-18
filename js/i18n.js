/* ---------- i18n — core UI chrome only (nav, headers, labels, buttons).
   Recipe/exercise names, ingredients, technique text stay Mongolian in every
   language, by design — see project notes. ---------- */
const I18N = {
  mn: {
    nav_home:'Нүүр', nav_plan:'Хөтөлбөр', nav_library:'Дасгал', nav_progress:'Ахиц', nav_nutrition:'Хоол',
    settings:'Тохиргоо', save:'Хадгалах', add:'Нэмэх', cancel:'Цуцлах', edit:'Засах', close:'Хаах',
    back:'Буцах', continue:'Үргэлжлүүлэх', all:'Бүгд', logout:'Гарах',

    auth_login_title:'Нэвтэрч <span class="y">үргэлжлүүл</span>', auth_signup_title:'Бүртгэл <span class="y">үүсгэ</span>',
    auth_tagline:'Дансаараа бүх төхөөрөмж дээрээ хөтөлбөр, ахиц, хоолны тэмдэглэлээ хадгалж, хаанаас ч үргэлжлүүл.',
    auth_google:'Google-ээр үргэлжлүүлэх', auth_or_email:'эсвэл имэйлээр',
    auth_email:'Имэйл', auth_pass:'Нууц үг', auth_pass2:'Нууц үг давтах',
    auth_login_btn:'Нэвтрэх', auth_signup_btn:'Бүртгүүлэх', auth_wait:'Түр хүлээнэүү…',
    auth_switch_to_signup:'Шинэ хэрэглэгч үү? Бүртгүүлэх', auth_switch_to_login:'Бүртгэлтэй юу? Нэвтрэх',
    auth_forgot:'Нууц үг мартсан?', auth_privacy:'Таны мэдээлэл зөвхөн танд харагдана.',
    auth_loading:'Ачааллаж байна…',

    onb_intro_eyebrow:'Гэр &amp; Жийм · Монгол',
    onb_intro_h1:'Гэртээ ч, жиймд ч <span class="y">өөрт тохирсон</span> дасгалаа эхлүүл',
    onb_intro_p:'Зорилго, түвшин, цагаа хэлээд хувийн долоо хоногийн хөтөлбөрөө аваарай. Монгол хоол, Монгол нөхцөлд тааруулсан.',
    onb_start:'Эхлэх — 1 минут ⚡',
    onb_s1_h:'Чиний тухай', onb_s1_p:'Калори, ачааллыг зөв тооцоход хэрэгтэй.',
    onb_name:'Нэр', onb_sex:'Хүйс', onb_male:'Эрэгтэй', onb_female:'Эмэгтэй',
    onb_age:'Нас', onb_height:'Өндөр (см)', onb_weight:'Жин (кг)',
    onb_s2_h:'Зорилго &amp; түвшин', onb_s2_p:'Хөтөлбөрийн set, reps, амралтыг үүгээр тааруулна.',
    onb_goal:'Зорилго', onb_level:'Дасгалын түвшин', onb_place:'Хаана дасгал хийх вэ?',
    onb_lvl1:'Анхан', onb_lvl2:'Дунд', onb_lvl3:'Ахисан',
    onb_home:'Гэртээ', onb_gym:'Жиймд', onb_both:'Аль алинд',
    onb_s3_h:'Хуваарь &amp; тоног', onb_s3_p:'Боломжит цаг, төхөөрөмждөө тааруулъя.',
    onb_days:'Долоо хоногт хэдэн өдөр?', onb_minutes:'Өдөрт хэдэн минут?', onb_equip:'Боломжтой тоног төхөөрөмж',
    onb_finish:'Хөтөлбөрөө гаргах 🚀',

    st_title:'Тохиргоо', st_program_save:'Хадгалаад хөтөлбөр шинэчлэх',
    st_install:'Утас/компьютер дээр суулгах', st_reset:'Бүх өгөгдлийг арилгаж дахин эхлэх',
    st_lang:'Хэл', st_theme:'Загвар',
    st_theme_system:'Систем', st_theme_light:'Цайвар', st_theme_dark:'Бараан',
    st_lang_mn:'Монгол', st_lang_en:'English',
    st_profile_link:'Миний профайл',

    profile_title:'Миний профайл', profile_edit:'Профайл засах',
    profile_goal:'Зорилго', profile_joined:'Эхэлсэн огноо',
    profile_start_weight:'Эхний жин', profile_cur_weight:'Одоогийн жин', profile_total_change:'Нийт өөрчлөлт',
    profile_streak:'Дараалсан өдөр', profile_total_workouts:'Нийт дасгал', profile_week_progress:'Энэ 7 хоногийн ахиц',
    profile_workout_history:'Дасгалын түүх', profile_weight_history:'Жингийн түүх', profile_food_history:'Хоолны түүх',
    profile_timeline:'Өмнөх ахицын хугацаа', profile_summary:'Юу өөрчлөгдсөн бэ?',
    profile_summary_from:'Эхэндээ', profile_summary_to:'Одоо',
    profile_no_history:'Бүртгэл алга',

    home_today:'Өнөөдөр танд', home_today_workout:'Өнөөдрийн дасгал', home_today_duration:'Хугацаа',
    home_today_food:'Өнөөдрийн хоол', home_today_calorie_goal:'Калорийн зорилго', home_today_water_goal:'Усны зорилго',
    home_next_action:'Дараагийн алхам', home_rest_day:'Амралтын өдөр',
    home_workout_section:'Дасгал хийх', home_home_workout:'Гэрийн дасгал', home_home_workout_p:'Тоног хэрэгслэлгүй, хаана ч хийнэ',
    home_gym_workout:'Жийм дасгал', home_gym_workout_p:'Тоног төхөөрөмжтэй, хүчтэй ачаалал',
    home_next_workout:'Дараагийн дасгал', home_all:'Бүгд ›',
    home_doctor:'Эмчийн зөвлөгөө 🩺',

    plan_title:'Миний хөтөлбөр', plan_regen:'↻ Шинэчлэх', plan_week:'7 ХОНОГИЙН ХУВААРЬ',

    lib_title:'Дасгалын сан', lib_loc:'БАЙРШИЛ', lib_lvl:'ТҮВШИН', lib_goal:'ЗОРИЛГО', lib_muscle:'БУЛЧИН',

    prog_title:'Миний ахиц', prog_cur_weight:'Одоогийн жин', prog_total_change:'Нийт өөрчлөлт (кг)',
    prog_total_workouts:'Нийт дасгал', prog_streak:'Дараалсан өдөр', prog_chart:'Жингийн өөрчлөлт',
    prog_week:'Энэ 7 хоног', prog_challenge:'30 хоногийн эрэлт',

    nut_title:'Хооллолт', nut_activity:'ӨДРИЙН ИДЭВХ', nut_today_eaten:'Өнөөдөр идсэн',
    nut_diary:'Өнөөдрийн тэмдэглэл', nut_bmi:'Биеийн жин (BMI)', nut_pantry:'Гэрийн нөөц',
    nut_recipes:'Хоолны санаа', nut_mealplan:'Хоолны төлөвлөгөө',
  },
  en: {
    nav_home:'Home', nav_plan:'Plan', nav_library:'Exercises', nav_progress:'Progress', nav_nutrition:'Food',
    settings:'Settings', save:'Save', add:'Add', cancel:'Cancel', edit:'Edit', close:'Close',
    back:'Back', continue:'Continue', all:'All', logout:'Log out',

    auth_login_title:'Log in and <span class="y">continue</span>', auth_signup_title:'Create your <span class="y">account</span>',
    auth_tagline:'Keep your program, progress, and food log synced across every device.',
    auth_google:'Continue with Google', auth_or_email:'or with email',
    auth_email:'Email', auth_pass:'Password', auth_pass2:'Confirm password',
    auth_login_btn:'Log in', auth_signup_btn:'Sign up', auth_wait:'Please wait…',
    auth_switch_to_signup:'New here? Sign up', auth_switch_to_login:'Have an account? Log in',
    auth_forgot:'Forgot password?', auth_privacy:'Your data is visible only to you.',
    auth_loading:'Loading…',

    onb_intro_eyebrow:'Home &amp; Gym · Mongolia',
    onb_intro_h1:'Start a plan built for you, <span class="y">at home or the gym</span>',
    onb_intro_p:'Tell us your goal, level, and time, and get a personal weekly program — tuned to Mongolian food and conditions.',
    onb_start:'Get started — 1 min ⚡',
    onb_s1_h:'About you', onb_s1_p:'Needed to calculate calories and load correctly.',
    onb_name:'Name', onb_sex:'Sex', onb_male:'Male', onb_female:'Female',
    onb_age:'Age', onb_height:'Height (cm)', onb_weight:'Weight (kg)',
    onb_s2_h:'Goal &amp; level', onb_s2_p:'Sets, reps, and rest will be tuned from this.',
    onb_goal:'Goal', onb_level:'Training level', onb_place:'Where will you train?',
    onb_lvl1:'Beginner', onb_lvl2:'Intermediate', onb_lvl3:'Advanced',
    onb_home:'At home', onb_gym:'At the gym', onb_both:'Both',
    onb_s3_h:'Schedule &amp; equipment', onb_s3_p:'Let’s match your available time and gear.',
    onb_days:'How many days a week?', onb_minutes:'How many minutes a day?', onb_equip:'Available equipment',
    onb_finish:'Build my program 🚀',

    st_title:'Settings', st_program_save:'Save and refresh program',
    st_install:'Install on phone/computer', st_reset:'Erase all data and start over',
    st_lang:'Language', st_theme:'Theme',
    st_theme_system:'System', st_theme_light:'Light', st_theme_dark:'Dark',
    st_lang_mn:'Монгол', st_lang_en:'English',
    st_profile_link:'My profile',

    profile_title:'My profile', profile_edit:'Edit profile',
    profile_goal:'Goal', profile_joined:'Joined',
    profile_start_weight:'Starting weight', profile_cur_weight:'Current weight', profile_total_change:'Total change',
    profile_streak:'Day streak', profile_total_workouts:'Total workouts', profile_week_progress:'This week’s progress',
    profile_workout_history:'Workout history', profile_weight_history:'Weight history', profile_food_history:'Food history',
    profile_timeline:'Progress timeline', profile_summary:'What’s changed?',
    profile_summary_from:'Then', profile_summary_to:'Now',
    profile_no_history:'No entries yet',

    home_today:'Today, for you', home_today_workout:'Today’s workout', home_today_duration:'Duration',
    home_today_food:'Today’s food', home_today_calorie_goal:'Calorie goal', home_today_water_goal:'Water goal',
    home_next_action:'Next step', home_rest_day:'Rest day',
    home_workout_section:'Train', home_home_workout:'Home workout', home_home_workout_p:'No equipment, do it anywhere',
    home_gym_workout:'Gym workout', home_gym_workout_p:'Equipment-based, higher load',
    home_next_workout:'Next workout', home_all:'All ›',
    home_doctor:'Ask about aches & pains 🩺',

    plan_title:'My program', plan_regen:'↻ Regenerate', plan_week:'7-DAY SCHEDULE',

    lib_title:'Exercise library', lib_loc:'LOCATION', lib_lvl:'LEVEL', lib_goal:'GOAL', lib_muscle:'MUSCLE',

    prog_title:'My progress', prog_cur_weight:'Current weight', prog_total_change:'Total change (kg)',
    prog_total_workouts:'Total workouts', prog_streak:'Day streak', prog_chart:'Weight change',
    prog_week:'This week', prog_challenge:'30-day challenge',

    nut_title:'Nutrition', nut_activity:'DAILY ACTIVITY', nut_today_eaten:'Eaten today',
    nut_diary:'Today’s log', nut_bmi:'Body weight (BMI)', nut_pantry:'Home pantry',
    nut_recipes:'Meal ideas', nut_mealplan:'Meal plan',
  },
};
function t(key){
  const lang = (typeof S!=='undefined' && S.lang) || 'mn';
  return (I18N[lang] && I18N[lang][key]) || I18N.mn[key] || key;
}

/* M_NAMES/LVL_NAMES/MEAL_NAMES/RECIPE_CATS/GOALS.n are plain objects looked
   up all over the codebase (e.g. M_NAMES[x.m]) — mutate their values in
   place on language change instead of touching every call site */
const M_NAMES_MN = {chest:'Цээж', back:'Нуруу', legs:'Хөл', glutes:'Өгзөг', shoulders:'Мөр', arms:'Гар', abs:'Гэдэс', cardio:'Кардио'};
const M_NAMES_EN = {chest:'Chest', back:'Back', legs:'Legs', glutes:'Glutes', shoulders:'Shoulders', arms:'Arms', abs:'Abs', cardio:'Cardio'};
const LVL_NAMES_MN = {1:'Анхан', 2:'Дунд', 3:'Ахисан'};
const LVL_NAMES_EN = {1:'Beginner', 2:'Intermediate', 3:'Advanced'};
const MEAL_NAMES_MN = {breakfast:'Өглөө', lunch:'Өдөр', dinner:'Орой', snack:'Зууш'};
const MEAL_NAMES_EN = {breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack'};
const RECIPE_CATS_MN = {mongol:'🇲🇳 Монгол хоол', fatloss:'🔥 Жин хасах', muscle:'💪 Булчин нэмэх'};
const RECIPE_CATS_EN = {mongol:'🇲🇳 Mongolian', fatloss:'🔥 Fat loss', muscle:'💪 Muscle gain'};
const GOAL_NAMES_MN = {fatloss:'Жин хасах', muscle:'Булчин нэмэх', tone:'Бие чангалах', strength:'Хүч нэмэх', health:'Эрүүл амьдрал'};
const GOAL_NAMES_EN = {fatloss:'Lose weight', muscle:'Build muscle', tone:'Tone up', strength:'Get stronger', health:'Healthy living'};

function applyLangLabels(){
  const lang = (typeof S!=='undefined' && S.lang) || 'mn';
  const en = lang==='en';
  if(typeof M_NAMES!=='undefined') Object.assign(M_NAMES, en?M_NAMES_EN:M_NAMES_MN);
  if(typeof LVL_NAMES!=='undefined') Object.assign(LVL_NAMES, en?LVL_NAMES_EN:LVL_NAMES_MN);
  if(typeof MEAL_NAMES!=='undefined') Object.assign(MEAL_NAMES, en?MEAL_NAMES_EN:MEAL_NAMES_MN);
  if(typeof RECIPE_CATS!=='undefined') Object.assign(RECIPE_CATS, en?RECIPE_CATS_EN:RECIPE_CATS_MN);
  if(typeof GOALS!=='undefined'){
    const src = en?GOAL_NAMES_EN:GOAL_NAMES_MN;
    GOALS.forEach(g=>{ if(src[g.id]) g.n = src[g.id]; });
  }
}
