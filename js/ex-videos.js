/* ---------- exercise demonstration clips ----------
   One short, silent, looping form clip per exercise, addressed by the exercise
   id, so adding a clip means adding a file and changing no code:

     assets/ex-video/<id>.mp4    H.264 baseline + AAC-free (silent), the fallback every browser plays
     assets/ex-video/<id>.webm   VP9, smaller where it is supported — optional
     assets/ex-video/<id>.jpg    poster frame, shown while the first frame decodes — optional

   EX_CLIP_BASE moves the whole set elsewhere (Firebase Storage, a CDN, another
   origin) without touching any caller. See assets/ex-video/README.md for the
   encoding commands and the full list of ids.

   Nothing in this file asserts that a file exists: exClip() only says where a
   clip would be. The player tries it once and falls back to the exercise
   illustration when it is not there, so a missing clip never leaves a broken
   video box on the page. */

const EX_CLIP_BASE = './assets/ex-video/';

/* The formats to try, in order. Both are listed so either upload works as it
   lands; a format whose file is absent costs one 404 before the next is tried.
   Put 'webm' first once every clip has a webm — it is the smaller file. */
const EX_CLIP_FORMATS = ['mp4', 'webm'];

/* The clips that exist, written by `node tools/gen-ex-clips.js` from whatever
   is in the folder. Credit is added by hand and the generator keeps it:
     squat: {formats:['mp4','webm'], poster:true, by:'Name', lic:'CC BY 4.0', url:'https://…'}
   `off:true` on an id holds a clip back without deleting the file. */
const EX_CLIPS = {
};

/* Only the ids above are played, so an exercise without a clip costs no
   request at all — which is why the generator has to be run after uploading.
   Set this to false to have every exercise try its file and fall back when it
   is not there: handy while trying clips out locally, but it spends one failed
   request per exercise that has none. */
const EX_CLIP_STRICT = true;

const CLIP_MIME = {mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime'};
/* ids proven missing while this page has been open, so one 404 is never
   repeated, and the same for single formats of an id that does have a clip */
const _clipMissing = new Set();
const _clipFmtMissing = new Set();

/* where the clip for an exercise would be, or null if there cannot be one */
function exClip(id){
  if(!id || _clipMissing.has(id)) return null;
  const e = EX_CLIPS[id];
  if(e && e.off) return null;
  if(EX_CLIP_STRICT && !e) return null;
  const base = EX_CLIP_BASE.replace(/\/*$/, '/') + encodeURIComponent(id);
  const src = ((e && e.formats) || EX_CLIP_FORMATS)
    .filter(f => CLIP_MIME[f] && !_clipFmtMissing.has(id + '.' + f))
    .map(f => ({src: base + '.' + f, type: CLIP_MIME[f]}));
  if(!src.length) return null;
  return {id, src, poster: (e && e.poster) ? base + '.jpg' : '', credit: (e && e.by) ? e : null};
}

/* a clip the player could not load at all: the illustration is used from now on */
function exClipFailed(id){ if(id) _clipMissing.add(id); }

/* one format of a clip that is not there, while another may still be: this is
   what stops a webm-only clip asking for its .mp4 every time it is opened */
function exClipFormatFailed(url){
  const m = /([^/]+)\.([a-z0-9]+)(?:\?.*)?$/i.exec(url || '');
  if(m && CLIP_MIME[m[2].toLowerCase()]) _clipFmtMissing.add(decodeURIComponent(m[1]) + '.' + m[2].toLowerCase());
}

/* Autoplay is wrong on a metered connection and when the viewer has asked for
   less motion. The clip is still offered — it just waits to be pressed. */
function exClipAutoplay(){
  try{
    if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const c = navigator.connection;
    if(c && (c.saveData || /^(slow-2g|2g)$/.test(c.effectiveType || ''))) return false;
  }catch(e){}
  return true;
}
