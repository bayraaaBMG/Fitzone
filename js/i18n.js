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
    home_install_title:'FitZone-г төхөөрөмждөө суулгах', home_install_btn:'Суулгах', home_installed:'Суулгасан ✓',

    plan_title:'Миний хөтөлбөр', plan_regen:'↻ Шинэчлэх', plan_week:'7 ХОНОГИЙН ХУВААРЬ',

    lib_title:'Дасгалын сан', lib_loc:'БАЙРШИЛ', lib_lvl:'ТҮВШИН', lib_goal:'ЗОРИЛГО', lib_muscle:'БУЛЧИН',

    prog_title:'Миний ахиц', prog_cur_weight:'Одоогийн жин', prog_total_change:'Нийт өөрчлөлт (кг)',
    prog_total_workouts:'Нийт дасгал', prog_streak:'Дараалсан өдөр', prog_chart:'Жингийн өөрчлөлт',
    prog_week:'Энэ 7 хоног', prog_challenge:'30 хоногийн эрэлт',

    nut_title:'Хооллолт', nut_activity:'ӨДРИЙН ИДЭВХ', nut_today_eaten:'Өнөөдөр идсэн',
    nut_diary:'Өнөөдрийн тэмдэглэл', nut_bmi:'Биеийн жин (BMI)', nut_pantry:'Гэрийн нөөц',
    nut_recipes:'Хоолны санаа', nut_mealplan:'Хоолны төлөвлөгөө', nut_footer_note:'Тооцоо нь ойролцоо. Эрүүл мэндийн онцгой нөхцөлд мэргэжлийн хүнтэй зөвлөл.',
    nut_label_maintain:'Хадгалах', nut_label_lose:'Жин хасах', nut_label_gain:'Булчин нэмэх',

    /* units & abbreviations */
    unit_kcal:'ккал', unit_kg:'кг', unit_g:'г', unit_cm:'см', unit_min:'мин', unit_sec:'с', unit_ml:'мл', unit_liter:'л', unit_meals:'хоол',
    unit_exercises:'дасгал', unit_days:'өдөр', unit_days_word:'хоног', unit_entries:'бичлэг', unit_kg:'кг',
    abbr_p:'Б', abbr_c:'Н', abbr_f:'Ө',
    goal_word:'зорилго',

    /* auth extras */
    auth_pass_placeholder:'Хамгийн багадаа 6 тэмдэгт', auth_pass2_placeholder:'Дахин оруулна уу',
    conn_error:'Холболтын алдаа гарлаа. Интернэтээ шалгаад хуудсаа дахин ачаалаарай.', reload:'Дахин ачаалах',
    err_email_first:'Имэйлээ эхлээд бичнэ үү.', err_fill_email_pass:'Имэйл, нууц үгээ бөглөнө үү.',
    err_pass_mismatch:'Нууц үг таарахгүй байна.', toast_reset_sent:'Нууц үг сэргээх холбоос имэйл рүү илгээгдлээ 📩',
    err_ios_standalone_google:'Суулгасан апп дээр Google-ээр нэвтрэх зарим үед бүтэлгүйтдэг (iOS-ийн хязгаарлалт). Safari дээрээ шууд нээгээд эсвэл имэйлээр нэвтэрнэ үү.',
    err_redirect_incomplete:'Google-ээр нэвтрэх дуусаагүй байна — дахин оролдоно уу, эсвэл имэйлээр нэвтэрнэ үү.',
    autherr_email_in_use:'Энэ имэйл хаяг бүртгэлтэй байна. Нэвтэрч үзнэ үү.',
    autherr_invalid_email:'Имэйл хаяг буруу байна.',
    autherr_weak_password:'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.',
    autherr_user_not_found:'Ийм имэйлтэй хэрэглэгч олдсонгүй.',
    autherr_wrong_password:'Нууц үг буруу байна.',
    autherr_operation_not_allowed:'Имэйл/нууц үгээр нэвтрэх түр хаалттай байна. Түр хүлээгээд дахин оролдоно уу.',
    autherr_invalid_credential:'Имэйл эсвэл нууц үг буруу байна.',
    autherr_too_many_requests:'Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.',
    autherr_network:'Сүлжээний алдаа. Холболтоо шалгаад дахин оролдоно уу.',
    autherr_popup_closed:'Google цонх хаагдлаа. Дахин оролдоно уу.',
    autherr_cancelled:'Дахин оролдоно уу.',
    autherr_account_exists:'Энэ имэйл өөр аргаар (нууц үгээр) бүртгэлтэй байна. Имэйл/нууц үгээрээ нэвтэрнэ үү.',
    autherr_unauthorized_domain:'Энэ сайтаас Google-ээр нэвтрэх зөвшөөрөгдөөгүй байна.',
    autherr_generic:'Алдаа гарлаа. Дахин оролдоно уу.',
    toast_offline_mode:'Офлайн горим — сүүлд хадгалсан өгөгдөл харагдаж байна',
    toast_load_error:'Дата ачаалахад алдаа гарлаа. Холболтоо шалгаарай.',

    /* onboarding extras */
    onb_stat_exercises:'Дасгал', onb_stat_days:'Өдөр/долоо хоног', onb_stat_minutes:'Минут',
    onb_tile1_h:'Гэрийн дасгал', onb_tile1_p:'Тоног төхөөрөмжгүй ч болно',
    onb_tile2_h:'Жийм хөтөлбөр', onb_tile3_h:'Ахиц хянах', onb_tile3_p:'Жин, streak, график',
    onb_tile4_h:'Монгол хоол', onb_tile4_p:'Бууз, цуйван, тарагаа тохируул',
    onb_name_placeholder:'Жишээ: Бат', default_user_name:'Хэрэглэгч',
    onb_equip_hint:'Юу ч сонгохгүй бол суурь хувилбараар төлөвлөнө.', equip_dumbbell:'Гантель',
    toast_program_ready:'Хувийн хөтөлбөр бэлэн боллоо 🎉', disclaimer:'Эмчилгээний зөвлөгөө биш. Гэмтэл, өвчтэй бол эмчтэйгээ зөвлөл.',

    /* settings extras */
    confirm_reset_all:'Бүх өгөгдлийг устгаад эхнээс эхлэх үү?', toast_settings_saved:'Тохиргоо хадгалагдлаа ✓',

    /* home / next-action / doctor */
    home_welcome:'Тавтай морил', home_both_places:'Гэр + жийм', home_days_per_week:'7 хоногт {0} өдөр',
    na_start_workout:'▶ {0} эхлүүлэх', na_log_food:'Хоолоо тэмдэглэх', na_drink_water:'Ус уух',
    na_log_weight:'Жингээ бүртгэх', na_all_done:'Маш сайн байна өнөөдөр! 🎉',
    doctor_intro:'Юу өвдөж, эвгүй байгаагаа бичээрэй — тохирсон зөвлөмж өгье. Хүсвэл зураг хавсаргаж болно.',
    doctor_placeholder:'Жишээ: Өвдөг өвдөж байна, squat хийж болох уу?',
    doctor_photo_note:'Хавсаргасан зургийг автоматаар шинжлэх боломжгүй ч энэ нь эмчид үзүүлэхэд тань хэрэг болно.',
    doctor_disclaimer:'⚠️ Энэ бол ерөнхий зөвлөмж — оношлогоо биш. Шинж тэмдэг үргэлжилбэл/хүндэрвэл эмчид заавал үзүүлээрэй.',
    q_tired:'Өнөөдөр ядарч байна', q_shrink_belly:'Гэдэс багасгах', q_20min:'20 минутын дасгал',
    q_knee:'Өвдөг өвдөж байна', q_back:'Нуруу өвдөж байна', q_shoulder:'Мөр өвдөж байна',
    attach_photo:'Зураг хавсаргах', send:'Илгээх', photo_attached:'Зураг хавсаргасан',
    home_install_desc:'Апп мэт хурдан нээгдэж, offline ч ажиллана.',

    /* exercise detail */
    video_coming_soon:'Бичлэг удахгүй нэмэгдэнэ', rest:'амралт', unit_sec:'с', kcal_per_min:'Ккал/мин',
    target_muscle:'Ажиллах булчин', proper_technique:'Зөв техник', common_mistakes:'Түгээмэл алдаа',
    alt_exercises:'Орлуулах дасгал', easier:'Хөнгөн', harder:'Хүнд',

    /* plan / workout day */
    warmup_title:'Анхаар', warmup_note:'Хөтөлбөр эхлэхээс өмнө 5 мин халаалт, дараа нь сунгалт хий. Хурц өвдөлт мэдрэгдвэл зогсоо.',
    rest_between_sets:'амралт дасгалын дунд', rest_timer:'Амралтын тооцуур',
    done_undo:'Дууссан — буцаах', finish_workout:'Дасгал дуусгах', toast_workout_logged:'Бэрхээ! Дасгал бүртгэгдлээ 🔥',
    toast_program_updated:'Хөтөлбөр шинэчлэгдлээ',
    wd_mon:'Дав', wd_tue:'Мяг', wd_wed:'Лха', wd_thu:'Пүр', wd_fri:'Баа', wd_sat:'Бям', wd_sun:'Ням',
    plantitle_push:'Push (Түлэх)', plantitle_pull:'Pull (Татах)', plantitle_legs:'Legs (Хөл)',
    plantitle_upper:'Upper (Дээд)', plantitle_lower:'Lower (Доод)',
    plantitle_full_a:'Бүх бие A', plantitle_full_b:'Бүх бие B', plantitle_full_c:'Бүх бие C',

    /* library */
    lib_intro:'{0} дасгал. Шүүж сонгоод дэлгэрэнгүйг нь үз.', no_exercises_match:'Энэ шүүлтэд тохирох дасгал алга. Өөр сонголт хийгээрэй.',

    /* progress */
    todays_weight:'Өнөөдрийн жин (кг)', err_enter_valid_weight:'Бодит жин (кг) оруулна уу', toast_weight_logged:'Жин бүртгэгдлээ',
    toast_challenge_started:'Эрэлт эхэллээ! Амжилт хүсье 💪', challenge_intro:'Өдөр бүр дасгал хийгээд тэмдэглэж, 30 хоногийн эрэлтээ давхар бүртгээрэй.',
    challenge_start_btn:'30 хоногийн эрэлт эхлүүлэх', challenge_days_done:'{0}/30 өдөр дууссан', restart:'Дахин эхлүүлэх',
    congrats:'Баяр хүргэе!', challenge_complete:'30 хоногийн эрэлтийг амжилттай дуусгалаа!',
    challenge_tap_hint:'Өнөөдрийн нүдэн дээр дарж тэмдэглээрэй.', chart_needs_entries:'Жингээ 2-оос дээш удаа бүртгэхэд график зурагдана.',

    /* nutrition extras */
    act_sedentary:'Сууринтай', act_moderate:'Дунд зэрэг', act_active:'Идэвхтэй', act_very_active:'Маш идэвхтэй',
    macro_protein:'Уураг', macro_carb:'Нүүрс ус', macro_fat:'Өөх тос', your_reading:'Таны үзүүлэлт',
    bmi_underweight:'Дутуу жинтэй', bmi_normal:'Хэвийн', bmi_overweight:'Илүүдэл жинтэй', bmi_obese:'Таргалалттай',
    pantry_intro:'Гэртээ байгаа бүтээгдэхүүнээ тэмдэглээрэй — тэдгээрт тулгуурлан хоолны санаа гаргана.',
    recipes_intro:'Гэрийн нөөцөндөө тэмдэглэсэн зүйлээрээ шууд хийж болох хоол эхэнд ✓ тэмдэгтэй жагсаана.',
    or_type:'ЭСВЭЛ БИЧЭЭРЭЙ', pantry_text_placeholder:'Жишээ: үхрийн мах, өндөг, төмс',
    added_colon:'Нэмэгдлээ:', not_recognized_colon:'Танигдсангүй:', nothing_recognized:'Юу ч танигдсангүй',
    can_make_now:'Байгаа зүйлээрээ хийнэ', day_number:'{0}-р өдөр',
    ingredients:'Орц', instructions:'Хийх заавар', find_on_youtube:'YouTube-с заавар хайх', add_to_log:'Тэмдэглэлд нэмэх', recipe_tutorial:'хийх заавар',
    toast_added_to_log:'Тэмдэглэлд нэмлээ ✅', add_food:'хоол нэмэх', attach_meal_photo:'Хийсэн хоолныхоо зургийг хавсаргах (заавал биш)',
    search_recipe_placeholder:'Жорын нэрээр хайх...', manual_entry:'Гараар оруулах', food_name_placeholder:'Хоолны нэр',
    no_entries:'Бүртгэл алга', no_results:'Илэрц алга', err_enter_food_name:'Хоолны нэрээ оруулна уу',

    /* profile extras */
    workout_done_generic:'Дасгал хийсэн',
    summary_lost:'{0} кг хасагдсан', summary_gained:'{0} кг нэмэгдсэн', summary_unchanged:'Жин өөрчлөгдөөгүй',
    summary_within_days:'{0} өдрийн дотор', summary_workouts_done:'{0} дасгал хийсэн',
    summary_streak_active:'{0} өдөр дараалан идэвхтэй', summary_streak_none:'одоогоор streak алга',

    /* PWA install */
    already_installed:'Апп болгож суулгасан байна.', already_installed_long:'FitZone таны төхөөрөмж дээр апп болгож суулгасан байна.',
    install_app:'Апп суулгах', install_card_desc:'Апп мэт хурдан нээгдэж, offline ч ажиллана.',
    ios_install_hint:'Safari дээрх "Хуваалцах" 📤 товч дараад "Add to Home Screen" сонговол апп болгож суулгана.',
    other_browser_install_hint:'Энэ browser дээр browser-ийн цэснээс "Install app" / "Add to Home Screen" сонголтыг ашиглаж суулгаж болно.',
    toast_ios_install_hint:'Safari-гийн "Хуваалцах" 📤 → "Add to Home Screen" сонгоорой',
    toast_other_install_hint:'Browser-ийн цэснээс "Install app" сонголтыг ашиглаарай',
    ios_step1:'Доорх Safari цэснээс "Хуваалцах" 📤 дар', ios_step2:'Жагсаалтаас "Add to Home Screen" сонго',
    ios_step3:'Баруун дээд буланд "Нэмэх" дар — болоо',
    skip:'Алгасах', toast_rest_done:'Амралт дууслаа 💪',
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
    home_install_title:'Install FitZone on your device', home_install_btn:'Install', home_installed:'Installed ✓',

    plan_title:'My program', plan_regen:'↻ Regenerate', plan_week:'7-DAY SCHEDULE',

    lib_title:'Exercise library', lib_loc:'LOCATION', lib_lvl:'LEVEL', lib_goal:'GOAL', lib_muscle:'MUSCLE',

    prog_title:'My progress', prog_cur_weight:'Current weight', prog_total_change:'Total change (kg)',
    prog_total_workouts:'Total workouts', prog_streak:'Day streak', prog_chart:'Weight change',
    prog_week:'This week', prog_challenge:'30-day challenge',

    nut_title:'Nutrition', nut_activity:'DAILY ACTIVITY', nut_today_eaten:'Eaten today',
    nut_diary:'Today’s log', nut_bmi:'Body weight (BMI)', nut_pantry:'Home pantry',
    nut_recipes:'Meal ideas', nut_mealplan:'Meal plan', nut_footer_note:'Estimates are approximate. For special health conditions, consult a professional.',
    nut_label_maintain:'Maintain', nut_label_lose:'Lose weight', nut_label_gain:'Build muscle',

    /* units & abbreviations */
    unit_kcal:'kcal', unit_kg:'kg', unit_g:'g', unit_cm:'cm', unit_min:'min', unit_sec:'s', unit_ml:'ml', unit_liter:'L', unit_meals:'meals',
    unit_exercises:'exercises', unit_days:'days', unit_days_word:'days', unit_entries:'entries',
    abbr_p:'P', abbr_c:'C', abbr_f:'F',
    goal_word:'goal',

    /* auth extras */
    auth_pass_placeholder:'At least 6 characters', auth_pass2_placeholder:'Re-enter your password',
    conn_error:'A connection error occurred. Check your internet and reload the page.', reload:'Reload',
    err_email_first:'Enter your email first.', err_fill_email_pass:'Fill in your email and password.',
    err_pass_mismatch:'Passwords don’t match.', toast_reset_sent:'Password reset link sent to your email 📩',
    err_ios_standalone_google:'Google sign-in sometimes fails in the installed app (an iOS limitation). Open this site in Safari directly, or use email instead.',
    err_redirect_incomplete:'Google sign-in didn’t complete — please try again, or use email instead.',
    autherr_email_in_use:'This email is already registered. Try logging in instead.',
    autherr_invalid_email:'That email address looks invalid.',
    autherr_weak_password:'Password must be at least 6 characters.',
    autherr_user_not_found:'No account found with that email.',
    autherr_wrong_password:'Incorrect password.',
    autherr_operation_not_allowed:'Email/password sign-in is temporarily disabled. Please try again shortly.',
    autherr_invalid_credential:'Incorrect email or password.',
    autherr_too_many_requests:'Too many attempts. Please wait and try again.',
    autherr_network:'Network error. Check your connection and try again.',
    autherr_popup_closed:'The Google window was closed. Please try again.',
    autherr_cancelled:'Please try again.',
    autherr_account_exists:'This email is already registered with a password. Log in with email/password instead.',
    autherr_unauthorized_domain:'Google sign-in isn’t authorized from this site.',
    autherr_generic:'Something went wrong. Please try again.',
    toast_offline_mode:'Offline mode — showing your last synced data',
    toast_load_error:'Couldn’t load your data. Check your connection.',

    /* onboarding extras */
    onb_stat_exercises:'Exercises', onb_stat_days:'Days/week', onb_stat_minutes:'Minutes',
    onb_tile1_h:'Home workouts', onb_tile1_p:'No equipment needed',
    onb_tile2_h:'Gym program', onb_tile3_h:'Track progress', onb_tile3_p:'Weight, streak, chart',
    onb_tile4_h:'Mongolian food', onb_tile4_p:'Buuz, tsuivan, tarag and more',
    onb_name_placeholder:'e.g. Bat', default_user_name:'User',
    onb_equip_hint:'Pick nothing and we’ll plan with bodyweight basics.', equip_dumbbell:'Dumbbell',
    toast_program_ready:'Your personal program is ready 🎉', disclaimer:'Not medical advice. If injured or unwell, consult a doctor.',

    /* settings extras */
    confirm_reset_all:'Erase all data and start over?', toast_settings_saved:'Settings saved ✓',

    /* home / next-action / doctor */
    home_welcome:'Welcome', home_both_places:'Home + gym', home_days_per_week:'{0} days/week',
    na_start_workout:'▶ Start {0}', na_log_food:'Log your food', na_drink_water:'Drink water',
    na_log_weight:'Log your weight', na_all_done:'Great job today! 🎉',
    doctor_intro:'Tell us what hurts or feels off — we’ll suggest something. You can attach a photo too.',
    doctor_placeholder:'e.g. My knee hurts, can I still squat?',
    doctor_photo_note:'The attached photo can’t be auto-analyzed, but it may help if you show it to a doctor.',
    doctor_disclaimer:'⚠️ This is general guidance, not a diagnosis. See a doctor if symptoms persist or worsen.',
    q_tired:'Feeling tired today', q_shrink_belly:'Reduce belly fat', q_20min:'20-minute workout',
    q_knee:'My knee hurts', q_back:'My back hurts', q_shoulder:'My shoulder hurts',
    attach_photo:'Attach photo', send:'Send', photo_attached:'Photo attached',
    home_install_desc:'Opens instantly like an app, and works offline.',

    /* exercise detail */
    video_coming_soon:'Video coming soon', rest:'rest', unit_sec:'s', kcal_per_min:'Kcal/min',
    target_muscle:'Target muscle', proper_technique:'Proper technique', common_mistakes:'Common mistakes',
    alt_exercises:'Substitute exercises', easier:'Easier', harder:'Harder',

    /* plan / workout day */
    warmup_title:'Heads up', warmup_note:'Warm up for 5 min before training, then stretch afterward. Stop if you feel sharp pain.',
    rest_between_sets:'rest between sets', rest_timer:'Rest timer',
    done_undo:'Done — undo', finish_workout:'Finish workout', toast_workout_logged:'Nice work! Workout logged 🔥',
    toast_program_updated:'Program refreshed',
    wd_mon:'Mon', wd_tue:'Tue', wd_wed:'Wed', wd_thu:'Thu', wd_fri:'Fri', wd_sat:'Sat', wd_sun:'Sun',
    plantitle_push:'Push', plantitle_pull:'Pull', plantitle_legs:'Legs',
    plantitle_upper:'Upper', plantitle_lower:'Lower',
    plantitle_full_a:'Full Body A', plantitle_full_b:'Full Body B', plantitle_full_c:'Full Body C',

    /* library */
    lib_intro:'{0} exercises. Filter and pick one to see details.', no_exercises_match:'No exercises match this filter. Try a different combination.',

    /* progress */
    todays_weight:'Today’s weight (kg)', err_enter_valid_weight:'Enter a realistic weight (kg)', toast_weight_logged:'Weight logged',
    toast_challenge_started:'Challenge started! Good luck 💪', challenge_intro:'Train and check in every day, and track your own 30-day challenge alongside it.',
    challenge_start_btn:'Start the 30-day challenge', challenge_days_done:'{0}/30 days done', restart:'Restart',
    congrats:'Congratulations!', challenge_complete:'You completed the 30-day challenge!',
    challenge_tap_hint:'Tap today’s square to check it off.', chart_needs_entries:'Log your weight twice or more to see a chart.',

    /* nutrition extras */
    act_sedentary:'Sedentary', act_moderate:'Moderate', act_active:'Active', act_very_active:'Very active',
    macro_protein:'Protein', macro_carb:'Carbs', macro_fat:'Fat', your_reading:'Your reading',
    bmi_underweight:'Underweight', bmi_normal:'Normal', bmi_overweight:'Overweight', bmi_obese:'Obese',
    pantry_intro:'Mark what you have at home — we’ll suggest meals based on it.',
    recipes_intro:'Meals you can make right now with what’s in your pantry are listed first with a ✓.',
    or_type:'OR TYPE IT IN', pantry_text_placeholder:'e.g. beef, egg, potato',
    added_colon:'Added:', not_recognized_colon:'Not recognized:', nothing_recognized:'Nothing recognized',
    can_make_now:'You can make this now', day_number:'Day {0}',
    ingredients:'Ingredients', instructions:'Instructions', find_on_youtube:'Find a tutorial on YouTube', add_to_log:'Add to log', recipe_tutorial:'recipe tutorial',
    toast_added_to_log:'Added to your log ✅', add_food:'add food', attach_meal_photo:'Attach a photo of what you made (optional)',
    search_recipe_placeholder:'Search by recipe name...', manual_entry:'Enter manually', food_name_placeholder:'Food name',
    no_entries:'No entries yet', no_results:'No results', err_enter_food_name:'Enter a food name',

    /* profile extras */
    workout_done_generic:'Workout done',
    summary_lost:'{0} kg lost', summary_gained:'{0} kg gained', summary_unchanged:'Weight unchanged',
    summary_within_days:'within {0} days', summary_workouts_done:'{0} workouts done',
    summary_streak_active:'{0}-day streak active', summary_streak_none:'no active streak yet',

    /* PWA install */
    already_installed:'Installed as an app.', already_installed_long:'FitZone is installed as an app on your device.',
    install_app:'Install app', install_card_desc:'Opens instantly like an app, and works offline.',
    ios_install_hint:'Tap the Safari "Share" 📤 button, then "Add to Home Screen" to install.',
    other_browser_install_hint:'Use your browser’s menu — look for "Install app" / "Add to Home Screen".',
    toast_ios_install_hint:'Tap Safari’s "Share" 📤 → "Add to Home Screen"',
    toast_other_install_hint:'Use "Install app" from your browser’s menu',
    ios_step1:'Tap the Safari "Share" 📤 button below', ios_step2:'Choose "Add to Home Screen" from the list',
    ios_step3:'Tap "Add" in the top right — done',
    skip:'Skip', toast_rest_done:'Rest done 💪',
  },
};
function t(key, ...args){
  const lang = (typeof S!=='undefined' && S.lang) || 'mn';
  let s = (I18N[lang] && I18N[lang][key]) || I18N.mn[key] || key;
  args.forEach((a,i)=>{ s = s.replace(new RegExp('\\{'+i+'\\}','g'), a); });
  return s;
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

/* English translations of the exercise database, keyed by id.
   n omits the Mongolian parenthetical already baked into the MN name. */
const EX_EN = {
  pushup: {n:'Push Up', tgt:'Chest, shoulders, triceps', tech:'Hands slightly wider than shoulders. Body in one straight line from head to heels. Lower your chest, then push back up.', err:'Rounding your back, hips too high. Letting your head droop.', easy:'Push up on your knees', hard:'Decline (feet elevated)'},
  squat: {n:'Bodyweight Squat', tgt:'Quads, glutes', tech:'Feet shoulder-width apart. Sit your hips back, chest up, knees tracking your toes.', err:'Knees caving in, heels lifting off the floor.', easy:'Squat to a chair', hard:'Jump squat'},
  lunge: {n:'Lunge', tgt:'Quads, glutes, balance', tech:'Step forward and lower your back knee toward the floor. Both knees at 90°. Push through your front heel to return.', err:'Front knee traveling well past your toes.', easy:'Hold onto something for balance', hard:'Walking lunge / with dumbbells'},
  glute: {n:'Glute Bridge', tgt:'Glutes, hamstrings', tech:'Lie on your back, knees bent. Squeeze your glutes and lift your hips. Hold 1 second at the top.', err:'Overarching your lower back. Not squeezing your glutes.', easy:'—', hard:'Single-leg'},
  plank: {n:'Plank', tgt:'Core', tech:'Elbows under shoulders. Body in a straight line. Brace your core and glutes. Hold 20–60 sec.', err:'Hips sagging or piking up.', easy:'On your knees', hard:'Plank + leg raise'},
  mtclimb: {n:'Mountain Climber', tgt:'Core, shoulders, cardio', tech:'From a plank, drive your knees alternately toward your chest quickly. Keep hips level.', err:'Hips popping up, speed outpacing technique.', easy:'Slow tempo', hard:'Cross-body variation'},
  burpee: {n:'Burpee', tgt:'Full body, cardio, fat burn', tech:'Squat down, hands on the floor, kick feet back to a plank, jump back in, then jump up.', err:'Rounding your back. Rushing and losing form.', easy:'No jump', hard:'Add a push up'},
  pikepu: {n:'Pike Push Up', tgt:'Shoulders (delts), triceps', tech:'Push your hips up into a pike/"A" shape. Lower your head toward the floor, then push back up.', err:'Elbows flaring out too much. Sagging at the hips.', easy:'Against a wall', hard:'Feet elevated'},
  superman: {n:'Superman', tgt:'Lower back, posture', tech:'Lie face down. Lift arms and legs together and hold 2 seconds.', err:'Overextending your neck.', easy:'Arms only or legs only', hard:'Longer hold'},
  birddog: {n:'Bird Dog', tgt:'Core, back, balance', tech:'On all fours, extend the opposite arm and leg and hold 2 seconds. Alternate sides.', err:'Rotating your hips, letting them sag.', easy:'Legs only', hard:'Hold longer + band'},
  bicycle: {n:'Bicycle Crunch', tgt:'Abs, obliques', tech:'Lie on your back, bring elbow toward the opposite knee in a pedaling motion.', err:'Pulling on your neck. Rushing the movement.', easy:'Slow tempo', hard:'Legs lower to the floor'},
  wallsit: {n:'Wall Sit', tgt:'Quads, endurance', tech:'Back against a wall, sit like a chair at 90°. Hold 30–60 sec.', err:'Knees traveling past your toes.', easy:'Shorter hold', hard:'Single leg / longer hold'},
  jjack: {n:'Jumping Jack', tgt:'Cardio, warm-up', tech:'Jump while spreading arms and legs out, then back together. Keep a steady rhythm.', err:'Landing hard on your knees.', easy:'Step version (no jump)', hard:'Fast tempo'},
  calf: {n:'Calf Raise', tgt:'Calves', tech:'Rise as high as you can onto your toes, hold 1 second, lower slowly.', err:'Dropping down fast. Rushing the reps.', easy:'Hold a wall for balance', hard:'Single leg'},

  bench: {n:'Bench Press', tgt:'Chest, triceps, front delts', tech:'Lying on the bench, bar over your shoulders. Lower with control to your chest, then press up.', err:'Hips lifting off the bench. Flaring elbows too wide.', easy:'Dumbbell press', hard:'Add weight'},
  inclinedb: {n:'Incline Dumbbell Press', tgt:'Upper chest, shoulders', tech:'On a 30–45° incline bench, press the dumbbells up. Feel the stretch in your chest at the bottom.', err:'Bench angled too steep. Banging the dumbbells together.', easy:'Lighter weight', hard:'Add weight'},
  latpull: {n:'Lat Pulldown', tgt:'Lats, biceps', tech:'Pull the bar to your chest, squeezing your shoulder blades down and back. Control the release.', err:'Using momentum, pulling behind your neck.', easy:'Lighter weight', hard:'Progress to pull ups'},
  row: {n:'Seated Cable Row', tgt:'Mid-back, lats, biceps', tech:'Chest up, pull the handle to your stomach. Squeeze your shoulder blades and hold 1 second.', err:'Rowing with your lower back, leaning too far back.', easy:'Lighter weight', hard:'Add weight'},
  deadlift: {n:'Deadlift', tgt:'Back, glutes, hamstrings, core', tech:'Neutral spine, chest up. Keep the bar close to your body and drive up through your hips.', err:'Rounding your back — injury risk.', easy:'Romanian DL / lighter weight', hard:'Add weight'},
  squatbb: {n:'Barbell Squat', tgt:'Quads, glutes, core', tech:'Bar on your upper back. Chest up, sit your hips back until thighs are parallel to the floor.', err:'Knees caving in, heels lifting, chest dropping.', easy:'Goblet squat', hard:'Add weight/depth'},
  legpress: {n:'Leg Press', tgt:'Quads, glutes', tech:'Feet shoulder-width on the platform. Bend your knees to 90° and press.', err:'Fully locking your knees. Hips lifting off the seat.', easy:'Lighter weight', hard:'Add weight'},
  rdl: {n:'Romanian Deadlift', tgt:'Hamstrings, glutes', tech:'Slight knee bend, push your hips back and lower the weight. Keep your back neutral.', err:'Rounding your back. Bending your knees too much.', easy:'Lighter weight', hard:'Add weight'},
  hipthrust: {n:'Hip Thrust', tgt:'Glutes', tech:'Upper back on a bench, bar on your hips. Squeeze your glutes and drive up.', err:'Overarching your lower back. Short range of motion.', easy:'Bodyweight bridge', hard:'Add weight'},
  ohp: {n:'Shoulder Press', tgt:'Shoulders (delts), triceps', tech:'Press the dumbbells overhead to full extension. Brace your core.', err:'Overarching your lower back.', easy:'Lighter weight / seated', hard:'Add weight'},
  latraise: {n:'Lateral Raise', tgt:'Side delts', tech:'Raise the dumbbells out to shoulder height. Slight bend in your elbows.', err:'Using too much weight and swinging your body.', easy:'Lighter weight', hard:'Slow tempo'},
  curl: {n:'Bicep Curl', tgt:'Biceps', tech:'Elbows fixed at your sides, curl the dumbbells up. Lower slowly.', err:'Swinging your body, elbows drifting forward.', easy:'Lighter weight', hard:'Add weight'},
  pushdown: {n:'Tricep Pushdown', tgt:'Triceps', tech:'Elbows fixed at your sides, press the bar fully down.', err:'Elbows drifting forward, leaning your body.', easy:'Lighter weight', hard:'Add weight'},
  cablecr: {n:'Cable Crunch', tgt:'Abs', tech:'Kneeling, rope at the sides of your head. Crunch down through your abs.', err:'Pulling with your arms. Using your hips.', easy:'Lighter weight', hard:'Add weight'},
  pullup: {n:'Pull Up', tgt:'Back (lats), biceps', tech:'Grip the bar wider than shoulders. Pull your chest up to the bar.', err:'Partial range of motion, swinging.', easy:'Assisted / lat pulldown', hard:'Add weight'},
};
const PANTRY_CAT_EN = {
  'Мах, өндөг':'Meat & eggs',
  'Сүүн бүтээгдэхүүн':'Dairy',
  'Үр тариа':'Grains',
  'Ногоо':'Vegetables',
  'Бусад':'Other',
};
const PANTRY_ITEM_EN = {
  beef:'Beef', mutton:'Mutton', chicken:'Chicken', pork:'Pork', egg:'Egg',
  milk:'Milk', yogurt:'Yogurt', cheese:'Cheese',
  rice:'Rice', flour:'Flour', noodle:'Noodles', oats:'Oats',
  potato:'Potato', carrot:'Carrot', cabbage:'Cabbage', onion:'Onion', tomato:'Tomato',
  cucumber:'Cucumber', garlic:'Garlic', greens:'Leafy greens',
  beans:'Beans', fish:'Fish', fruit:'Fruit', nuts:'Nuts',
};
const RECIPES_EN = {
  buuz: {n:'Buuz (steamed dumplings)',
    ingredients:['Mutton/beef 500g','Flour 300g','Onion 1–2','Salt, black pepper'],
    steps:'Knead the flour with water and rest 20 min. Finely chop the meat and mix with onion, salt, and pepper. Roll the dough thin, wrap the filling, and steam for 15–20 min.'},
  huushuur: {n:'Huushuur (fried meat pastry)',
    ingredients:['Beef 400g','Flour 300g','Onion 1','Oil (for frying)'],
    steps:'Knead the dough and rest it. Finely chop the meat and mix with onion, salt, and pepper. Roll thin, fill, and fry in hot oil until golden.'},
  tsuivan: {n:'Tsuivan (steamed noodle stir-fry)',
    ingredients:['Noodles 400g','Beef 300g','Carrot 1–2','Cabbage 200g','Onion 1'],
    steps:'Steam the noodles to prep them. Chop and fry the meat, then add onion and carrot. Add the cabbage, then mix in the noodles and stir-fry well.'},
  friedrice: {n:'Fried rice with beef',
    ingredients:['Rice 1.5 cups','Beef 300g','Carrot 1','Onion 1','Oil'],
    steps:'Wash and cook the rice. Chop and fry the meat, then add onion and carrot. Mix in the cooked rice and stir-fry again.'},
  noodlesoup: {n:'Flour noodle soup',
    ingredients:['Flour 1.5 cups','Beef 250g','Potato 2','Carrot 1','Water'],
    steps:'Knead the flour thin and cut into small pieces. Cook the meat to make a broth. Add chopped potato and carrot, then stir in the flour pieces and boil.'},
  oatmeal: {n:'Oatmeal porridge',
    ingredients:['Oats 1 cup','Milk 1.5 cups','Salt/sugar to taste'],
    steps:'Bring the milk to a boil, add the oats, and simmer on low for 5–7 min. Add fruit or sugar to taste.'},
  eggfry: {n:'Fried eggs',
    ingredients:['Eggs 2–3','Onion 1/2','Tomato 1','Salt, oil'],
    steps:'Finely chop the onion and tomato and fry in oil. Beat the eggs, pour in, and cook on low heat, stirring.'},
  muesli: {n:'Yogurt muesli',
    ingredients:['Plain yogurt 1 cup','Oats 1/2 cup','Fruit/nuts (optional)'],
    steps:'Mix the oats into the yogurt and let sit 5 min before eating. Top with fruit or nuts if you like.'},
  potatoegg: {n:'Fried potato with egg',
    ingredients:['Potato 2–3','Eggs 2','Onion 1/2','Oil, salt'],
    steps:'Chop and fry the potato. Once nearly done, add the onion, then the eggs, and mix until cooked through.'},
  chickenfry: {n:'Fried chicken breast with vegetables',
    ingredients:['Chicken breast 300g','Carrot 1','Cabbage 150g','Garlic, oil'],
    steps:'Chop the chicken and season with salt and garlic, then fry in oil. Add the carrot and cabbage and cook together.'},
  porkfry: {n:'Fried pork with vegetables',
    ingredients:['Pork 300g','Cabbage 200g','Onion 1','Garlic 2–3 cloves'],
    steps:'Chop and fry the pork. Add onion and garlic to season, then add the cabbage and fry until done.'},
  salad: {n:'Vegetable salad',
    ingredients:['Cucumber 1','Tomato 1','Lettuce leaves','Oil, salt, lemon'],
    steps:'Chop all the vegetables. Dress with oil, salt, and a little lemon juice, then toss.'},
  cheesenoodle: {n:'Cheesy noodles',
    ingredients:['Noodles 250g','Cheese 100g','Milk 1/2 cup','Oil'],
    steps:'Cook the noodles. Melt the cheese into the milk on low heat to make a sauce, then mix with the noodles.'},
  beansoup: {n:'Bean soup',
    ingredients:['Beans 1 cup (soaked)','Potato 2','Carrot 1','Onion 1'],
    steps:'Wash the soaked beans and cook them. Once half-cooked, add potato, carrot, and onion, and cook until tender.'},
  yogurtfruit: {n:'Yogurt with fruit',
    ingredients:['Plain yogurt 1 cup','Fruit (whatever you have)'],
    steps:'Put the yogurt in a bowl, add your fruit, and eat right away.'},

  khorkhog: {n:'Khorkhog (stone-cooked mutton)',
    ingredients:['Mutton on the bone 1.5kg','Potato 4–5','Carrot 2','Onion 2','Hot stones, salt'],
    steps:'Cut the meat into large pieces and place in a pot. Layer with hot stones, potato, carrot, and onion, salting as you go. Seal the pot and cook for 1–1.5 hours.'},
  boortsog: {n:'Boortsog (fried dough)',
    ingredients:['Flour 2 cups','Milk 1/2 cup','Egg 1','Baking soda, salt','Oil (for frying)'],
    steps:'Mix flour, milk, egg, salt, and baking soda into a dough. Rest 30 min, shape into small pieces, and fry in hot oil until golden.'},
  bantan: {n:'Bantan (flour drop soup)',
    ingredients:['Flour 1 cup','Beef 150g','Onion 1/2','Water, salt'],
    steps:'Chop and cook the meat to make a broth. Mix flour with water into a thin batter and drizzle it into the boiling broth. Add onion and cook further.'},
  zutan: {n:'Zutan (meat & rice porridge)',
    ingredients:['Rice 1/2 cup','Beef 150g','Onion 1/2','Water, salt'],
    steps:'Chop the meat and cook it in water. Add the washed rice and simmer slowly until soft. Season with onion and salt.'},
  friedbansh: {n:'Fried bansh (small dumplings)',
    ingredients:['Beef 250g','Flour 200g','Onion 1','Oil (for frying)'],
    steps:'Make small dumplings like buuz, just smaller. Fry in hot oil until golden.'},
  lamjaa: {n:'Lamjaa (noodle stir-fry)',
    ingredients:['Noodles 300g','Beef 200g','Cabbage 150g','Carrot 1','Onion 1'],
    steps:'Cook the noodles to prep. Fry the meat, add onion and carrot. Add the cabbage, then mix in the noodles and stir-fry further.'},
  aaruul: {n:'Aaruul (dried curds)',
    ingredients:['Aaruul (dried curds) 80g'],
    steps:'Eat the ready-made aaruul as is. It keeps well, making it a great snack to take with you.'},
  milktea: {n:'Milk tea with boortsog',
    ingredients:['Milk tea 1 cup','Boortsog 2–3','Yogurt (optional)'],
    steps:'Brew the milk tea and serve with boortsog for breakfast.'},
  muttonpotatosoup: {n:'Mutton and potato soup',
    ingredients:['Mutton 250g','Potato 2','Carrot 1','Onion 1','Water, salt'],
    steps:'Chop the meat and cook it in water. Add potato, carrot, and onion, and cook until tender, then season with salt.'},

  steamedfish: {n:'Steamed fish with vegetables',
    ingredients:['Fish 250g','Carrot 1','Cabbage 150g','Salt, lemon'],
    steps:'Season the fish with salt and lemon juice, then steam with the vegetables for 15–20 min.'},
  vegsoup: {n:'Vegetable soup',
    ingredients:['Potato 1','Carrot 1','Cabbage 150g','Onion 1/2','Water, salt'],
    steps:'Chop all the vegetables and simmer in water until tender. Season with salt and pepper.'},
  eggwhiteveg: {n:'Fried egg whites with vegetables',
    ingredients:['Egg whites 4–5','Tomato 1','Leafy greens, a bunch','Salt, a little oil'],
    steps:'Separate the egg whites and mix with the vegetables, then fry in a lightly oiled pan.'},
  cheesecucumber: {n:'Cheese with cucumber',
    ingredients:['Cheese 100g','Cucumber 1','Salt'],
    steps:'Eat the sliced cheese together with the cucumber. A quick, high-protein snack.'},
  tunasalad: {n:'Tuna salad',
    ingredients:['Canned tuna 1 can','Cucumber 1','Tomato 1','Oil, lemon, salt'],
    steps:'Flake the tuna and toss with chopped vegetables. Dress with oil, lemon juice, and salt.'},
  fruitnuts: {n:'Fruit and nuts',
    ingredients:['Apple/banana 1','Nuts 20g'],
    steps:'Eat the fruit together with the nuts. A filling snack between meals.'},
  vegfry: {n:'Stir-fried vegetables',
    ingredients:['Cabbage 200g','Carrot 1','Onion 1/2','Garlic 1–2','A little oil'],
    steps:'Chop all the vegetables and stir-fry quickly in a lightly oiled pan. Season with salt and pepper.'},
  chickenvegsoup: {n:'Chicken and vegetable soup',
    ingredients:['Chicken 200g','Potato 1','Carrot 1','Water, salt'],
    steps:'Chop the chicken and cook it in water. Add potato and carrot, cook until tender, then season with salt.'},
  boiledeggveg: {n:'Boiled eggs with greens',
    ingredients:['Eggs 2','Leafy greens, a bunch','Salt'],
    steps:'Boil and peel the eggs. Eat together with the greens, salted to taste.'},
  rawveg: {n:'Raw vegetable snack',
    ingredients:['Carrot 1','Cucumber 1'],
    steps:'Cut the vegetables into sticks. Eat as is, or lightly salted.'},

  proteinsmoothie: {n:'Protein fruit smoothie',
    ingredients:['Milk 1.5 cups','Oats 1/2 cup','Banana/fruit 1','Nut butter 1 tbsp'],
    steps:'Blend all the ingredients until smooth. Great to drink after a workout.'},
  chickenriceveg: {n:'Chicken, rice, and vegetables',
    ingredients:['Chicken breast 250g','Rice 1 cup','Carrot 1','Cabbage 100g'],
    steps:'Cook the rice. Chop and fry the chicken with carrot and cabbage. Serve together with the rice.'},
  beefpotato: {n:'Beef with potato',
    ingredients:['Beef 300g','Potato 3','Onion 1','Oil'],
    steps:'Chop and fry the meat. Add the potato and fry together, seasoning with onion, until cooked through.'},
  fishrice: {n:'Fish with rice',
    ingredients:['Fish 250g','Rice 1 cup','Lemon, salt'],
    steps:'Cook the rice. Season the fish with salt and lemon juice, then fry or steam it. Serve together with the rice.'},
  muttonrice: {n:'Mutton with rice',
    ingredients:['Mutton 300g','Rice 1 cup','Onion 1','Oil'],
    steps:'Chop and fry the meat. Season with onion, then mix in the cooked rice and stir-fry again.'},
  eggcheesebread: {n:'Egg and cheese on toast',
    ingredients:['Eggs 2–3','Cheese 50g','Bread 2 slices'],
    steps:'Fry the eggs. Top the bread with cheese and the fried egg.'},
  beefbeanstew: {n:'Beef and bean stew',
    ingredients:['Beef 250g','Beans 1 cup (soaked)','Onion 1','Carrot 1'],
    steps:'Soak and prep the beans. Fry the meat with onion and carrot. Add the beans and cook until tender.'},
  yogurtgranola: {n:'Yogurt with granola and nuts',
    ingredients:['Plain yogurt 1.5 cups','Oats 1/2 cup','Nuts 20g','Honey (optional)'],
    steps:'Mix the oats and nuts into the yogurt. Drizzle with honey if you like.'},
  porkrice: {n:'Pork with rice',
    ingredients:['Pork 250g','Rice 1 cup','Onion 1','Garlic 2'],
    steps:'Chop and fry the pork with onion and garlic. Mix in the cooked rice and serve.'},
  eggpotatocheese: {n:'Egg, potato, and cheese',
    ingredients:['Eggs 3','Potato 2','Cheese 50g','Oil, salt'],
    steps:'Chop and fry the potato. Add the egg and cheese and cook through together.'},
  chickennoodle: {n:'Chicken with noodles',
    ingredients:['Chicken 250g','Noodles 250g','Carrot 1','Onion 1/2'],
    steps:'Cook the noodles. Chop and fry the chicken with carrot and onion. Mix in the noodles and serve.'},
};

let _mnSnapshot = null; // captured once, on first applyLangLabels() call, before any mutation

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

  // EX / RECIPES / PANTRY_GROUPS content: snapshot the original Mongolian
  // values the first time this runs (before any mutation), then swap
  // in-place between that snapshot and the *_EN dictionaries above —
  // avoids hand-duplicating the entire Mongolian database as a second
  // "_MN" copy just to support switching back.
  if(!_mnSnapshot && typeof EX!=='undefined' && typeof RECIPES!=='undefined' && typeof PANTRY_GROUPS!=='undefined'){
    _mnSnapshot = {
      ex: EX.map(x=>({id:x.id, n:x.n, tgt:x.tgt, tech:x.tech, err:x.err, easy:x.easy, hard:x.hard})),
      recipes: RECIPES.map(r=>({id:r.id, n:r.n, ingredients:r.ingredients.slice(), steps:r.steps})),
      pantryCats: PANTRY_GROUPS.map(g=>g.cat),
      pantryItems: PANTRY_GROUPS.flatMap(g=>g.items).map(it=>({tag:it.tag, n:it.n})),
    };
  }
  if(_mnSnapshot){
    EX.forEach(x=>{
      const src = en ? EX_EN[x.id] : _mnSnapshot.ex.find(o=>o.id===x.id);
      if(src) Object.assign(x, src);
    });
    RECIPES.forEach(r=>{
      const src = en ? RECIPES_EN[r.id] : _mnSnapshot.recipes.find(o=>o.id===r.id);
      if(src) Object.assign(r, {...src, ingredients: src.ingredients.slice()});
    });
    PANTRY_GROUPS.forEach((g,i)=>{
      const mnCat = _mnSnapshot.pantryCats[i];
      g.cat = en ? (PANTRY_CAT_EN[mnCat]||mnCat) : mnCat;
      g.items.forEach(it=>{
        const orig = _mnSnapshot.pantryItems.find(o=>o.tag===it.tag);
        it.n = en ? (PANTRY_ITEM_EN[it.tag]||orig.n) : orig.n;
      });
    });
  }
}
