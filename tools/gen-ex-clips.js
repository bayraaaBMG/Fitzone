/* Rewrites the EX_CLIPS list in js/ex-videos.js from whatever is actually in
   assets/ex-video/, so the app asks only for files that exist.

   Run it after adding or removing clips:
       node tools/gen-ex-clips.js

   Credit already recorded for an id (by / lic / url) is carried over, so a
   re-run never loses attribution. */
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'assets/ex-video');
const SRC = path.join(ROOT, 'js/ex-videos.js');
const FORMATS = ['mp4', 'webm'];

const src = fs.readFileSync(SRC, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';

/* credit from the current list, so it survives a regeneration */
const start = src.indexOf('const EX_CLIPS = {');
const end = src.indexOf(nl + '};', start);
if(start < 0 || end < 0){ console.error('could not find the EX_CLIPS block in js/ex-videos.js'); process.exit(1); }
const kept = {};
for(const m of src.slice(start, end).matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*\{([^}]*)\}/gm)){
  const f = {};
  for(const key of ['by', 'lic', 'url']){
    const v = new RegExp(key + ":\\s*'((?:[^'\\\\]|\\\\.)*)'").exec(m[2]);
    if(v) f[key] = v[1];
  }
  if(Object.keys(f).length) kept[m[1]] = f;
}

/* what is on disk */
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR) : [];
const found = {};
for(const f of files){
  const m = /^(.+)\.(mp4|webm|jpg|jpeg)$/i.exec(f);
  if(!m) continue;
  const id = m[1], ext = m[2].toLowerCase();
  found[id] = found[id] || {formats: [], poster: false};
  if(ext === 'jpg' || ext === 'jpeg') found[id].poster = true;
  else found[id].formats.push(ext);
}

/* an id must be a real exercise, or the file is named wrongly and would never
   be reached — say so rather than writing a line that does nothing. data.js
   holds other lists with ids too, so EX is read rather than pattern-matched */
const vm = require('vm');
const sandbox = {console, Math, Date, JSON, Object, Array, isFinite, Number, String};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8').replace(/^const /gm, 'var '), sandbox);
const known = new Set(sandbox.EX.map(x => x.id));
const strays = Object.keys(found).filter(id => !known.has(id));

const ids = Object.keys(found).filter(id => known.has(id) && found[id].formats.length).sort();
const lines = ids.map(id => {
  const e = found[id], c = kept[id] || {};
  const fmt = FORMATS.filter(f => e.formats.includes(f));
  const bits = [`formats:[${fmt.map(f => `'${f}'`).join(', ')}]`];
  if(e.poster) bits.push('poster:true');
  for(const key of ['by', 'lic', 'url']) if(c[key]) bits.push(`${key}:'${c[key].replace(/'/g, "\\'")}'`);
  return `  ${id}: {${bits.join(', ')}},`;
});

const block = 'const EX_CLIPS = {' + (lines.length ? nl + lines.join(nl) : '');
fs.writeFileSync(SRC, src.slice(0, start) + block + src.slice(end), 'utf8');

console.log(`js/ex-videos.js: ${ids.length} clip${ids.length === 1 ? '' : 's'} listed` +
  (ids.length ? ' — ' + ids.join(', ') : ' (none in assets/ex-video)'));
const noPoster = ids.filter(id => !found[id].poster);
if(noPoster.length) console.log(`  no poster frame for: ${noPoster.join(', ')}`);
if(strays.length) console.log(`  IGNORED, not an exercise id: ${strays.join(', ')}`);
const missing = [...known].filter(id => !ids.includes(id));
console.log(`  ${missing.length} of ${known.size} exercises still have no clip`);
