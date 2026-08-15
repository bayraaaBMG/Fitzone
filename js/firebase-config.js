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
  apiKey: "AIzaSyDUIPurUMVMGwsPhB3O7SDh4RtC8xVxlIs",
  authDomain: "fitzone-7f325.firebaseapp.com",
  projectId: "fitzone-7f325",
  storageBucket: "fitzone-7f325.firebasestorage.app",
  messagingSenderId: "912121543971",
  appId: "1:912121543971:web:5fd2dcd7b5dfcf09f9a096",
};
