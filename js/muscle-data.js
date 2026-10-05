/* ---------- muscle map + recovery database ----------
   A finer muscle set than EX.m / M_NAMES (which stay as they are for the
   library filters): the body map and the recovery model need to tell biceps
   from triceps, quads from hamstrings.

   Per exercise:
     pri    muscles that do the work — they take the full recovery time
     sec    muscles that assist — they take SEC_FACTOR of it
     recov  hours until a primary muscle is back to 100% after this exercise

   `recov` is a planning estimate, not a measurement: real recovery depends on
   load, sets, sleep, food and training age. The UI says so. The values follow
   the usual guidance — bigger muscles and heavier compound lifts need longer,
   small isolation and core work needs less.

   Muscle assignments were cross-checked against the open wger exercise
   database (CC-BY-SA, https://wger.de) where an exercise matches; none of
   wger's own text is copied. */

const MUSCLES = ['chest','lats','traps','shoulders','biceps','triceps','abs','obliques','quads','hams','glutes','calves'];

const MUSCLE_NAMES_MN = {
  chest:'Цээж', lats:'Нурууны өргөн булчин', traps:'Мөр, нурууны дээд', shoulders:'Мөр (delt)',
  biceps:'Bicep', triceps:'Tricep', abs:'Гэдэс', obliques:'Хажуугийн булчин',
  quads:'Гуяны урд', hams:'Гуяны ар', glutes:'Өгзөг', calves:'Шилбэ',
};
const MUSCLE_NAMES_EN = {
  chest:'Chest', lats:'Lats', traps:'Traps', shoulders:'Shoulders',
  biceps:'Biceps', triceps:'Triceps', abs:'Abs', obliques:'Obliques',
  quads:'Quads', hams:'Hamstrings', glutes:'Glutes', calves:'Calves',
};
/* mutated by applyLangLabels(), like M_NAMES */
const MUSCLE_NAMES = {...MUSCLE_NAMES_MN};

/* assisting muscles recover in this fraction of the primary time */
const SEC_FACTOR = 0.6;

const EX_MUSCLES = {
  // --- home, bodyweight ---
  pushup:    {pri:['chest'], sec:['triceps','shoulders'], recov:36},
  kneepu:    {pri:['chest'], sec:['triceps','shoulders'], recov:30},
  incpu:     {pri:['chest'], sec:['triceps','shoulders'], recov:30},
  declpu:    {pri:['chest'], sec:['shoulders','triceps'], recov:40},
  diamondpu: {pri:['triceps'], sec:['chest','shoulders'], recov:36},
  benchdip:  {pri:['triceps'], sec:['chest','shoulders'], recov:36},
  pikepu:    {pri:['shoulders'], sec:['triceps','abs'], recov:40},
  squat:     {pri:['quads','glutes'], sec:['hams','abs'], recov:40},
  sumosquat: {pri:['quads','glutes'], sec:['hams'], recov:40},
  jumpsquat: {pri:['quads','glutes'], sec:['calves'], recov:48},
  splitsquat:{pri:['quads','glutes'], sec:['hams'], recov:48},
  lunge:     {pri:['quads','glutes'], sec:['hams'], recov:40},
  revlunge:  {pri:['quads','glutes'], sec:['hams'], recov:40},
  stepup:    {pri:['quads','glutes'], sec:['calves'], recov:36},
  wallsit:   {pri:['quads'], sec:['glutes'], recov:30},
  glute:     {pri:['glutes'], sec:['hams'], recov:30},
  sglute:    {pri:['glutes'], sec:['hams'], recov:36},
  donkey:    {pri:['glutes'], sec:['hams'], recov:24},
  superman:  {pri:['lats'], sec:['glutes','hams'], recov:24},
  birddog:   {pri:['abs'], sec:['glutes','lats'], recov:18},
  plank:     {pri:['abs'], sec:['obliques','shoulders'], recov:24},
  sideplank: {pri:['obliques'], sec:['abs','shoulders'], recov:24},
  deadbug:   {pri:['abs'], sec:[], recov:18},
  crunch:    {pri:['abs'], sec:[], recov:24},
  legraise:  {pri:['abs'], sec:['quads'], recov:24},
  hollow:    {pri:['abs'], sec:['obliques'], recov:24},
  russian:   {pri:['obliques'], sec:['abs'], recov:24},
  bicycle:   {pri:['abs','obliques'], sec:[], recov:24},
  mtclimb:   {pri:['abs'], sec:['shoulders','quads'], recov:30},
  burpee:    {pri:['quads','chest'], sec:['shoulders','triceps','abs'], recov:48},
  jjack:     {pri:['calves'], sec:['shoulders','quads'], recov:18},   // quads per wger
  highknees: {pri:['quads'], sec:['calves','abs'], recov:18},
  skater:    {pri:['quads','glutes'], sec:['calves'], recov:36},

  // --- gym ---
  bench:     {pri:['chest'], sec:['triceps','shoulders'], recov:60},
  inclinebb: {pri:['chest'], sec:['shoulders','triceps'], recov:60},
  inclinedb: {pri:['chest'], sec:['shoulders','triceps'], recov:48},
  chestpress:{pri:['chest'], sec:['triceps','shoulders'], recov:48},
  dbfly:     {pri:['chest'], sec:['shoulders'], recov:40},
  latpull:   {pri:['lats'], sec:['biceps'], recov:48},
  pullup:    {pri:['lats'], sec:['biceps','traps'], recov:48},
  row:       {pri:['lats','traps'], sec:['biceps'], recov:60},
  seatedrow: {pri:['lats','traps'], sec:['biceps'], recov:48},
  dbrow:     {pri:['lats'], sec:['biceps','traps'], recov:48},
  deadlift:  {pri:['hams','glutes'], sec:['lats','traps','quads'], recov:72},
  rdl:       {pri:['hams'], sec:['glutes','lats'], recov:72},
  squatbb:   {pri:['quads','glutes'], sec:['hams','abs'], recov:72},
  legpress:  {pri:['quads'], sec:['glutes','hams'], recov:60},
  legext:    {pri:['quads'], sec:[], recov:40},
  legcurl:   {pri:['hams'], sec:[], recov:40},
  hipthrust: {pri:['glutes'], sec:['hams'], recov:60},
  calf:      {pri:['calves'], sec:[], recov:36},
  ohp:       {pri:['shoulders'], sec:['triceps','traps'], recov:48},
  dbpress:   {pri:['shoulders'], sec:['triceps'], recov:48},
  latraise:  {pri:['shoulders'], sec:[], recov:36},
  rearfly:   {pri:['shoulders'], sec:['traps'], recov:36},
  facepull:  {pri:['traps','shoulders'], sec:['biceps'], recov:30},
  curl:      {pri:['biceps'], sec:[], recov:36},
  hammer:    {pri:['biceps'], sec:[], recov:36},
  pushdown:  {pri:['triceps'], sec:[], recov:36},
  cablecr:   {pri:['abs'], sec:['obliques'], recov:30},
  // --- added exercises ---
  widepu:    {pri:['chest'], sec:['triceps','shoulders'], recov:36},
  plyopu:    {pri:['chest'], sec:['triceps','shoulders'], recov:48},
  dbbench:   {pri:['chest'], sec:['triceps','shoulders'], recov:48},
  pecdeck:   {pri:['chest'], sec:[], recov:36},
  chinup:    {pri:['lats','biceps'], sec:['traps'], recov:48},
  hyperext:  {pri:['glutes'], sec:['hams'], recov:24},
  strarm:    {pri:['lats'], sec:[], recov:36},
  tbarrow:   {pri:['lats','traps'], sec:['biceps'], recov:48},
  db2row:    {pri:['lats','traps'], sec:['biceps'], recov:48},
  closepd:   {pri:['lats'], sec:['biceps'], recov:36},
  arnold:    {pri:['shoulders'], sec:['triceps'], recov:48},
  machohp:   {pri:['shoulders'], sec:['triceps'], recov:36},
  shrug:     {pri:['traps'], sec:[], recov:36},
  handpu:    {pri:['shoulders'], sec:['triceps','traps'], recov:48},
  altdelt:   {pri:['shoulders'], sec:[], recov:36},
  cabrear:   {pri:['shoulders'], sec:['traps'], recov:36},
  bbcurl:    {pri:['biceps'], sec:[], recov:36},
  conc:      {pri:['biceps'], sec:[], recov:24},
  inclcurl:  {pri:['biceps'], sec:[], recov:36},
  ohtri:     {pri:['triceps'], sec:[], recov:36},
  machcurl:  {pri:['biceps'], sec:[], recov:24},
  machtri:   {pri:['triceps'], sec:[], recov:24},
  dips:      {pri:['triceps'], sec:['chest','shoulders'], recov:48},
  dbsquat:   {pri:['quads','glutes'], sec:['hams'], recov:48},
  dblunge:   {pri:['quads','glutes'], sec:['hams'], recov:48},
  hacksquat: {pri:['quads'], sec:['glutes'], recov:48},
  ghr:       {pri:['hams'], sec:['glutes'], recov:72},
  calfpress: {pri:['calves'], sec:[], recov:24},
  chairsquat:{pri:['quads','glutes'], sec:['hams'], recov:24},
  bbglute:   {pri:['glutes'], sec:['hams'], recov:48},
  kickcable: {pri:['glutes'], sec:['hams'], recov:36},
  pullthru:  {pri:['glutes','hams'], sec:[], recov:36},
  kneelsquat:{pri:['glutes'], sec:['hams'], recov:48},
  pallof:    {pri:['obliques'], sec:['abs'], recov:24},
  woodchop:  {pri:['obliques'], sec:['abs'], recov:24},
  abmach:    {pri:['abs'], sec:[], recov:24},
  hangleg:   {pri:['abs'], sec:['obliques'], recov:36},
  flutter:   {pri:['abs'], sec:[], recov:24},
  revcrunch: {pri:['abs'], sec:[], recov:24},
  vup:       {pri:['abs'], sec:['obliques'], recov:24},
  startjump: {pri:['quads','calves'], sec:['shoulders','glutes'], recov:24},
  splitjump: {pri:['quads','glutes'], sec:['calves'], recov:36},
  kneetuck:  {pri:['quads'], sec:['abs','calves'], recov:36},
};

/* the coarse EX.m group each fine muscle belongs to — used to read the
   day-level history (completedLog.focus), which only stores coarse groups */
const MUSCLE_GROUP = {
  chest:'chest', lats:'back', traps:'back', shoulders:'shoulders',
  biceps:'arms', triceps:'arms', abs:'abs', obliques:'abs',
  quads:'legs', hams:'legs', glutes:'glutes', calves:'legs',
};

/* what a coarse group loads, for history entries that only name the group */
const GROUP_MUSCLES = MUSCLES.reduce((acc, m) => {
  (acc[MUSCLE_GROUP[m]] = acc[MUSCLE_GROUP[m]] || []).push(m);
  return acc;
}, {});

function exMuscles(id){ return EX_MUSCLES[id] || null; }
