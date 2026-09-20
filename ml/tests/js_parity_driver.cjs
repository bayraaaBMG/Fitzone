/* Feeds frames through the browser feature extractor so test_js_parity.py can
   compare it against the Python one. Test tool only.
   stdin: {"frames": [{"lm": [{x,y,z,visibility}...], "aspect": 1.0, "ts": 0}]}  */
const fs = require('fs');
const path = require('path');
const F = require(path.resolve(__dirname, '../../js/ai/ml-features.js'));

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const fx = F.createMlFeatureExtractor();
const out = payload.frames.map(frame => {
  const {vec, valid} = fx.push(frame.lm, frame.aspect, frame.ts);
  return {valid, vec: vec ? Array.from(vec) : null};
});
process.stdout.write(JSON.stringify({featureSize: F.ML_FEATURE_SIZE, featureVersion: F.ML_FEATURE_VERSION, frames: out}));
