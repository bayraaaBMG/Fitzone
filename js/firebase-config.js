/* ---------- Firebase тохиргоо (хоолны зураг хадгалах) ----------
   Тохируулах алхамууд:
   1. https://console.firebase.google.com → "Add project" дарж шинэ project үүсгэ.
   2. Зүүн цэснээс "Build → Storage" руу орж "Get started" дарж идэвхжүүл.
   3. "Build → Authentication → Sign-in method"-с "Anonymous"-г идэвхжүүл.
   4. Project Settings (⚙) → "Your apps" → "</> Web app" нэмж, гарч ирэх
      firebaseConfig обьектын утгуудыг доор хуулж тавь.
   5. Storage → Rules-г дараах байдлаар өөрчилж хадгал:
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /{allPaths=**} {
              allow read;
              allow write: if request.auth != null;
            }
          }
        }
   Энэ файлыг бөглөтлөө хоолны зураг upload хийх боломжтой болно. */
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
