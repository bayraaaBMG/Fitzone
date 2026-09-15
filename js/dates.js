/* ---------- calendar day keys ('YYYY-MM-DD') ----------
   Every stored day key — workout completion, streaks, weights, food/water
   logs, the 30-day challenge — is the calendar date in Mongolia, not the
   browser's UTC date: a workout at 23:30 in Ulaanbaatar belongs to that day,
   not to the next one. All day-key logic in the app goes through here.

   Asia/Ulaanbaatar is UTC+8 with no daylight saving (abolished 2017), so the
   fixed-offset fallback (browsers without Intl time-zone data) gives the
   same answer. Day arithmetic works on the date string itself in UTC, so the
   device's own time zone / DST can never shift a day. */
const APP_TZ = 'Asia/Ulaanbaatar';
const APP_TZ_OFFSET_MIN = 480;

let _dayFmt;
function getWorkoutDate(ts){
  const t = ts==null ? Date.now() : +ts;
  if(!isFinite(t)) return getWorkoutDate();
  if(_dayFmt===undefined){
    try{ _dayFmt = new Intl.DateTimeFormat('en-US', {timeZone:APP_TZ, year:'numeric', month:'2-digit', day:'2-digit'}); }
    catch(e){ _dayFmt = null; }
  }
  if(_dayFmt){
    const p = {};
    for(const part of _dayFmt.formatToParts(new Date(t))) p[part.type] = part.value;
    if(p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`;
  }
  return new Date(t + APP_TZ_OFFSET_MIN*60000).toISOString().slice(0,10);
}
const today = ()=> getWorkoutDate();

/* 'YYYY-MM-DD' ± n calendar days */
function addDays(ymd, n){
  const d = new Date(ymd+'T00:00:00Z');
  d.setUTCDate(d.getUTCDate()+n);
  return d.toISOString().slice(0,10);
}
/* Mon=0 … Sun=6 for a day key */
function weekdayIdx(ymd){ return (new Date(ymd+'T00:00:00Z').getUTCDay()+6)%7; }

if(typeof module!=='undefined') module.exports = {APP_TZ, getWorkoutDate, today, addDays, weekdayIdx};
