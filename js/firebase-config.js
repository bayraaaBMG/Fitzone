/* ---------- Firebase тохиргоо (аккаунт + cloud sync) ----------
   Тохируулах алхамууд:
   1. https://console.firebase.google.com → "Add project" дарж шинэ project үүсгэ.
   2. "Build → Authentication → Sign-in method"-с "Email/Password" болон
      "Google"-г идэвхжүүл.
   3. "Build → Firestore Database" үүсгэж идэвхжүүл.
   4. Project Settings (⚙) → "Your apps" → "</> Web app" нэмж, гарч ирэх
      firebaseConfig обьектын утгуудыг доор хуулж тавь.
   5. firestore.rules-г `firebase deploy --only firestore:rules` коммандаар
      деплой хий (эсвэл Console дээр гараар paste хий) — хэрэглэгч бүр
      зөвхөн өөрийн users/{uid} баримтад хандах эрхтэй болгоно.
   Зураг: хэрэглэгчийн хавсаргасан хоолны зураг зөвхөн browser дээрх
   preview-д ашиглагдана, хаана ч (cloud/Storage) хадгалагдахгүй —
   Firebase Storage энэ апп-д огт хэрэггүй тул Blaze төлбөрт багц
   шаардахгүй. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDUIPurUMVMGwsPhB3O7SDh4RtC8xVxlIs",
  authDomain: "fitzone-7f325.firebaseapp.com",
  projectId: "fitzone-7f325",
  messagingSenderId: "912121543971",
  appId: "1:912121543971:web:5fd2dcd7b5dfcf09f9a096",
};
