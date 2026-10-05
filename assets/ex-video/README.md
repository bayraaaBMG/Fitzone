# Exercise form clips

Short, silent, looping demonstration clips, addressed by exercise id. Two steps
to add one:

```bash
cp bulgarian-split-squat.mp4 assets/ex-video/splitsquat.mp4   # named by exercise id
node tools/gen-ex-clips.js                                    # list what is now there
```

The generator writes the `EX_CLIPS` list in [js/ex-videos.js](../../js/ex-videos.js)
from the contents of this folder, so the app asks the network only for files that
exist — an exercise without a clip costs no request at all. Credit fields added
by hand to that list are kept across re-runs.

While trying clips out locally, setting `EX_CLIP_STRICT = false` makes every
exercise try its own file and fall back when there is none, which saves running
the generator but spends one failed request per exercise without a clip.

```
assets/ex-video/<id>.mp4     required — H.264, the file every browser plays
assets/ex-video/<id>.webm    optional — VP9, smaller; tried if the .mp4 is absent
assets/ex-video/<id>.jpg     optional poster; set poster:true for that id in EX_CLIPS
```

An exercise with no clip keeps the illustration it has now. A clip that is
listed but whose file has gone falls back to the same illustration: the player
tries it once, fails, swaps itself out, and does not ask again. A missing clip
never leaves a broken video box on the screen.

A file named after something that is not an exercise id is reported and ignored
by the generator, rather than silently never being reached.

## What a clip should be

| | |
|---|---|
| Length | 3–6 seconds, 2–3 full repetitions, cut so the loop joins cleanly |
| Frame | the whole body, side-on for squats/push-ups/hinges, the way the camera counter wants it |
| Audio | none at all — the player is muted, so a soundtrack is only wasted bytes |
| Size | 1.5 MB or less, 720×405 (16:9) is plenty for a 390 px phone |
| Rate | 24–30 fps |

## Encoding

MP4 (H.264), stripped of audio, with the moov atom in front so playback starts
before the whole file has arrived:

```bash
ffmpeg -i raw/squat.mov -an -vf "scale=720:-2,fps=30"   -c:v libx264 -profile:v main -level 4.0 -crf 28 -preset slow   -pix_fmt yuv420p -movflags +faststart assets/ex-video/squat.mp4
```

WebM (VP9), optional, usually 25–35 % smaller:

```bash
ffmpeg -i raw/squat.mov -an -vf "scale=720:-2,fps=30"   -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 assets/ex-video/squat.webm
```

Poster frame:

```bash
ffmpeg -i assets/ex-video/squat.mp4 -frames:v 1 -q:v 4 assets/ex-video/squat.jpg
```

Both formats are tried, `.mp4` first. Once every clip has a webm, swap the
order in `EX_CLIP_FORMATS` so the smaller file is the one that gets served.

Everything at once, from a folder of clips already named by id:

```bash
for f in raw/*.mov; do id=$(basename "$f" .mov)
  ffmpeg -y -i "$f" -an -vf "scale=720:-2,fps=30" -c:v libx264 -profile:v main     -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart "assets/ex-video/$id.mp4"
done
```

## Hosting somewhere else

`EX_CLIP_BASE` in [js/ex-videos.js](../../js/ex-videos.js) is the only place a
path is built, so one line moves the whole set:

```js
const EX_CLIP_BASE = 'https://cdn.example.com/mongolfit/ex-video/';
```

A different origin needs `Access-Control-Allow-Origin` for mongolfit.vercel.app
and `Accept-Ranges: bytes` (otherwise phones cannot seek), and the clips must
stay out of the service worker's cache — they already are, by extension.

Kept in this repo instead, the clips are served by Vercel's CDN with range
requests and far-future caching for free. 60 clips at 1.5 MB is about 90 MB in
git, which is manageable but permanent: a clip re-encoded ten times leaves ten
copies in history. Either budget for that or host them off the repo from the
start.

## Credit

A clip from someone else needs its entry in `EX_CLIPS` so the player can show
the credit over the video:

```js
squat: {by:'Author name', lic:'CC BY 4.0', url:'https://source…'},
```

## The 60 filenames

| File | Exercise | Place | Muscle |
|---|---|---|---|
| `pushup.mp4` | Push Up (Шахалт) | Гэр | chest |
| `squat.mp4` | Bodyweight Squat (Суулт) | Гэр | legs |
| `lunge.mp4` | Lunge (Урагшаа алхалт) | Гэр | legs |
| `glute.mp4` | Glute Bridge (Өгзгийн гүүр) | Гэр | glutes |
| `plank.mp4` | Plank (Тэвш) | Гэр | abs |
| `mtclimb.mp4` | Mountain Climber | Гэр | abs |
| `burpee.mp4` | Burpee | Гэр | cardio |
| `pikepu.mp4` | Pike Push Up | Гэр | shoulders |
| `superman.mp4` | Superman | Гэр | back |
| `birddog.mp4` | Bird Dog | Гэр | back |
| `bicycle.mp4` | Bicycle Crunch | Гэр | abs |
| `wallsit.mp4` | Wall Sit (Хана түших суулт) | Гэр | legs |
| `jjack.mp4` | Jumping Jack | Гэр | cardio |
| `calf.mp4` | Calf Raise (Шилбэ) | Гэр | legs |
| `bench.mp4` | Bench Press | Жийм | chest |
| `inclinedb.mp4` | Incline Dumbbell Press | Жийм | chest |
| `latpull.mp4` | Lat Pulldown | Жийм | back |
| `row.mp4` | Seated Cable Row | Жийм | back |
| `deadlift.mp4` | Deadlift | Жийм | back |
| `squatbb.mp4` | Barbell Squat | Жийм | legs |
| `legpress.mp4` | Leg Press | Жийм | legs |
| `rdl.mp4` | Romanian Deadlift | Жийм | glutes |
| `hipthrust.mp4` | Hip Thrust | Жийм | glutes |
| `ohp.mp4` | Shoulder Press | Жийм | shoulders |
| `latraise.mp4` | Lateral Raise | Жийм | shoulders |
| `curl.mp4` | Bicep Curl | Жийм | arms |
| `pushdown.mp4` | Tricep Pushdown | Жийм | arms |
| `cablecr.mp4` | Cable Crunch | Жийм | abs |
| `pullup.mp4` | Pull Up | Жийм | back |
| `kneepu.mp4` | Knee Push Up (Өвдөг дээрх шахалт) | Гэр | chest |
| `incpu.mp4` | Incline Push Up (Налуу шахалт) | Гэр | chest |
| `declpu.mp4` | Decline Push Up (Хөл өндөрт шахалт) | Гэр | chest |
| `diamondpu.mp4` | Diamond Push Up (Алмаз шахалт) | Гэр | arms |
| `sumosquat.mp4` | Sumo Squat (Өргөн суулт) | Гэр | legs |
| `jumpsquat.mp4` | Jump Squat (Үсрэх суулт) | Гэр | legs |
| `splitsquat.mp4` | Bulgarian Split Squat (Булгар суулт) | Гэр | legs |
| `revlunge.mp4` | Reverse Lunge (Ухрах алхалт) | Гэр | legs |
| `stepup.mp4` | Step Up (Шат өөд алхалт) | Гэр | legs |
| `sglute.mp4` | Single-leg Glute Bridge (Нэг хөлт гүүр) | Гэр | glutes |
| `donkey.mp4` | Donkey Kick (Өгзөгний өшиглөлт) | Гэр | glutes |
| `sideplank.mp4` | Side Plank (Хажуугийн тэвш) | Гэр | abs |
| `deadbug.mp4` | Dead Bug (Цох хөдөлгөөн) | Гэр | abs |
| `crunch.mp4` | Crunch (Гэдэсний атгалт) | Гэр | abs |
| `legraise.mp4` | Lying Leg Raise (Хэвтээ хөл өргөлт) | Гэр | abs |
| `hollow.mp4` | Hollow Hold (Хотгор барилт) | Гэр | abs |
| `russian.mp4` | Russian Twist (Оросын эргэлт) | Гэр | abs |
| `highknees.mp4` | High Knees (Өндөр өвдөг) | Гэр | cardio |
| `skater.mp4` | Skater Jump (Тэшүүрийн үсрэлт) | Гэр | cardio |
| `benchdip.mp4` | Bench Dip (Сандал түшсэн dip) | Гэр | arms |
| `inclinebb.mp4` | Incline Barbell Press (Налуу barbell түлхэлт) | Жийм | chest |
| `chestpress.mp4` | Machine Chest Press (Машин дээрх цээжний түлхэлт) | Жийм | chest |
| `dbfly.mp4` | Dumbbell Fly (Гантелийн нээлт) | Жийм | chest |
| `seatedrow.mp4` | Seated Cable Row (Суугаа cable row) | Жийм | back |
| `dbrow.mp4` | One-arm Dumbbell Row (Нэг гарын гантель row) | Жийм | back |
| `facepull.mp4` | Face Pull (Нүүр рүү татах) | Жийм | shoulders |
| `dbpress.mp4` | Seated Dumbbell Press (Суугаа гантелийн түлхэлт) | Жийм | shoulders |
| `rearfly.mp4` | Rear Delt Fly (Мөрний арын нээлт) | Жийм | shoulders |
| `legext.mp4` | Leg Extension (Хөлний сунгалт) | Жийм | legs |
| `legcurl.mp4` | Leg Curl (Гуяны арын нугалалт) | Жийм | legs |
| `hammer.mp4` | Hammer Curl (Алхны curl) | Жийм | arms |
