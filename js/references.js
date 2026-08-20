/* ---------- REFERENCES — citations backing exercise/nutrition/safety claims ---------- */
const REFERENCES = {
  who_activity: {
    org: 'WHO',
    url: 'https://www.who.int/publications/i/item/9789240015128',
    title_mn: 'ДЭМБ — Биеийн тамирын дасгал, идэвхгүй байдлын зөвлөмж (2020)',
    title_en: 'WHO Guidelines on Physical Activity and Sedentary Behaviour (2020)',
    used_mn: 'Долоо хоногийн дасгалын давтамж, булчин чангалах өдрийн зөвлөмж',
    used_en: 'Weekly training frequency and muscle-strengthening day guidance',
  },
  cdc_activity: {
    org: 'CDC',
    url: 'https://www.cdc.gov/physical-activity-basics/guidelines/index.html',
    title_mn: 'CDC — Насанд хүрэгчдэд хэр их биеийн тамир хэрэгтэй вэ',
    title_en: 'CDC — How Much Physical Activity Do Adults Need',
    used_mn: 'Долоо хоногийн дасгалын давтамж, хугацааны зөвлөмж',
    used_en: 'Weekly training frequency and duration guidance',
  },
  who_bmi: {
    org: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',
    title_mn: 'ДЭМБ — Илүүдэл жин ба таргалалт',
    title_en: 'WHO — Obesity and Overweight',
    used_mn: 'БЖИ (BMI) ангиллын босго тоо (18.5 / 25 / 30)',
    used_en: 'BMI category cutoffs (18.5 / 25 / 30)',
  },
  mifflin_stjeor: {
    org: 'J Am Diet Assoc',
    url: 'https://www.jandonline.org/article/S0002-8223(05)00149-5/abstract',
    title_mn: 'Mifflin-St Jeor тэгшитгэлийн нарийвчлалын судалгаа (Frankenfield, 2005)',
    title_en: 'Comparison of Predictive RMR Equations — Mifflin-St Jeor (Frankenfield et al., 2005)',
    used_mn: 'Илчлэгийн зорилтот тоо (TDEE) тооцоолол',
    used_en: 'Calorie/TDEE target calculation',
  },
  issn_protein: {
    org: 'ISSN',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/',
    title_mn: 'International Society of Sports Nutrition — уураг ба дасгалын зөвлөмж',
    title_en: 'International Society of Sports Nutrition — Protein and Exercise Position Stand',
    used_mn: 'Уургийн өдөр тутмын зорилт (кг жинд ногдох грамм)',
    used_en: 'Daily protein target (grams per kg body weight)',
  },
  amdr_fat: {
    org: 'US National Academies',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK610333/',
    title_mn: 'Acceptable Macronutrient Distribution Range — өөх тос',
    title_en: 'Acceptable Macronutrient Distribution Range (AMDR) — Fat',
    used_mn: 'Өөх тосны өдөр тутмын зорилт (нийт илчлэгийн 20–35%)',
    used_en: 'Daily fat target (20–35% of total calories)',
  },
  efsa_water: {
    org: 'EFSA',
    url: 'https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2010.1459',
    title_mn: 'EFSA — Усны хэрэгцээний шинжлэх ухааны дүгнэлт',
    title_en: 'EFSA — Scientific Opinion on Dietary Reference Values for Water',
    used_mn: 'Усны өдөр тутмын ойролцоо зорилт (жинд үндэслэсэн ерөнхий тооцоо)',
    used_en: 'Approximate daily water-intake goal (general weight-scaled estimate)',
  },
  acsm_resistance: {
    org: 'ACSM',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41843416/',
    title_mn: 'ACSM — Хүч дасгалын зөвлөмж (2026 Position Stand)',
    title_en: 'ACSM — Resistance Training Prescription Position Stand (2026)',
    used_mn: 'Сет, давталт, амралтын хугацааны зөвлөмж',
    used_en: 'Sets, reps, and rest-interval guidance',
  },
  aha_warning: {
    org: 'AHA',
    url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack',
    title_mn: 'American Heart Association — Зүрхний дайралтын анхны шинж тэмдэг',
    title_en: 'American Heart Association — Warning Signs of a Heart Attack',
    used_mn: 'Дасгал хийх үед цээжээр өвдөх/амьсгаадах үеийн анхааруулга',
    used_en: 'Chest-pain / breathlessness warning during exercise',
  },
  spot_reduction: {
    org: 'University of Sydney',
    url: 'https://www.sydney.edu.au/news-opinion/news/2023/11/07/spot-reduction--why-targeting-weight-loss-to-a-specific-area-is-.html',
    title_mn: '"Spot reduction" домог — эрдэм шинжилгээний тойм',
    title_en: '"Spot Reduction" Myth — Research Summary',
    used_mn: 'Тодорхой хэсгийн өөхийг зорьж хасах боломжгүй тухай зөвлөгөө',
    used_en: 'Guidance that fat cannot be selectively lost from one body area',
  },
  nih_weightloss: {
    org: 'NIH',
    url: 'https://www.ncbi.nlm.nih.gov/books/NBK2004/',
    title_mn: 'NIH — Илүүдэл жин, таргалалтын эмчилгээний удирдамж',
    title_en: 'NIH — Clinical Guidelines on Overweight and Obesity Treatment',
    used_mn: 'Калорийн дутагдал/илүүдлийн хэмжээ (жин хасах/нэмэх)',
    used_en: 'Calorie deficit/surplus sizing (weight loss/gain)',
  },
};

const REFERENCE_GROUPS = [
  { h_mn: 'Дасгал, долоо хоногийн идэвх', h_en: 'Exercise & weekly activity', ids: ['who_activity','cdc_activity','acsm_resistance'] },
  { h_mn: 'Илчлэг ба шим тэжээл', h_en: 'Calories & nutrition', ids: ['mifflin_stjeor','issn_protein','amdr_fat','efsa_water','nih_weightloss'] },
  { h_mn: 'БЖИ (BMI)', h_en: 'BMI', ids: ['who_bmi'] },
  { h_mn: 'Аюулгүй байдал', h_en: 'Safety', ids: ['aha_warning','spot_reduction'] },
];

function refBadge(...ids){
  return `<button class="refbadge" data-refids="${ids.join(',')}" type="button">ⓘ ${t('ref_source')}</button>`;
}

function refRow(id){
  const r = REFERENCES[id];
  if(!r) return '';
  const en = S.lang==='en';
  return `<div class="foodrow" style="align-items:flex-start">
    <div class="e">📎</div>
    <div style="flex:1;min-width:0">
      <b style="display:block">${esc(en?r.title_en:r.title_mn)}</b>
      <span class="xs mut" style="display:block;margin-top:2px">${esc(r.org)} — ${esc(en?r.used_en:r.used_mn)}</span>
      <a href="${r.url}" target="_blank" rel="noopener" class="xs" style="display:inline-block;margin-top:4px;color:var(--acc-ink);word-break:break-all">${r.url}</a>
    </div>
  </div>`;
}

function openReferenceSheet(ids){
  const sheet = mkSheet();
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:20px">${t('ref_title')}</h2>
    <div class="card" style="margin-top:12px">${ids.map(refRow).join('')}</div>
    <button class="btn g" id="ref_seeall" style="margin-top:14px">📚 ${t('sources_link')}</button>
  `;
  sheet.querySelector('#ref_seeall').onclick=()=> openSourcesPage();
}

function openSourcesPage(){
  const sheet = mkSheet();
  const en = S.lang==='en';
  sheet.querySelector('.inner').innerHTML = `
    <div class="grab"></div>
    <h2 class="disp" style="font-size:22px">${t('sources_title')}</h2>
    <p class="sm mut" style="margin:6px 0 4px">${t('sources_intro')}</p>
    ${REFERENCE_GROUPS.map(g=>`
      <div class="secttl" style="margin-top:18px"><h2 style="font-size:14px">${esc(en?g.h_en:g.h_mn)}</h2></div>
      <div class="card">${g.ids.map(refRow).join('')}</div>
    `).join('')}
    <p class="xs mut center" style="margin-top:20px">${t('sources_footer')}</p>
  `;
}

document.addEventListener('click', e=>{
  const b = e.target.closest('[data-refids]');
  if(b) openReferenceSheet(b.dataset.refids.split(','));
});
