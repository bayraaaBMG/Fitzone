/* Runs a converted TF.js graph model on fixture inputs so export_model.py can
   compare it against PyTorch. Export-time tool only — never shipped.

   usage: echo '{"x": [...], "heads": [...]}' | node tfjs_parity.mjs <model dir>
   needs: npm i @tensorflow/tfjs   (pure JS; the native tfjs-node build is not
   required — the model is served over a temporary localhost server because
   plain tfjs loads models with fetch(), not from the filesystem) */
import { readFileSync } from 'node:fs';
import { createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const dir = process.argv[2];
if(!dir){ console.error('usage: tfjs_parity.mjs <model dir>'); process.exit(2); }
const payload = JSON.parse(readFileSync(0, 'utf8'));

const tf = await import('@tensorflow/tfjs-node').catch(() => import('@tensorflow/tfjs'));

const root = path.resolve(dir);
const server = http.createServer((req, res) => {
  const file = path.join(root, path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, ''));
  if(!file.startsWith(root) || !statSync(file, {throwIfNoEntry:false})){ res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type': file.endsWith('.json') ? 'application/json' : 'application/octet-stream'});
  createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

try{
  const model = await tf.loadGraphModel(base + 'model.json');
  const x = tf.tensor(payload.x, undefined, 'float32');
  const res = model.execute(x);
  const list = Array.isArray(res) ? res : [res];
  // concatenated in the same head order export_model.py uses for PyTorch
  const outputs = await tf.concat(list, 1).array();
  console.log(JSON.stringify({outputs}));
} finally {
  server.close();
}
