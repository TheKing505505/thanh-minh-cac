/**
 * firebase-config.js
 * Firebase v10 Modular SDK
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmezzJngdyi0G4jH1QzeJQP_-cDEvAvEA",
  authDomain: "thanh-minh-cac-41666.firebaseapp.com",
  projectId: "thanh-minh-cac-41666",
  storageBucket: "thanh-minh-cac-41666.firebasestorage.app",
  messagingSenderId: "646917525177",
  appId: "1:646917525177:web:499798730e45509e899568"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Offline persistence bị vô hiệu do mở nhiều tab.");
  } else if (err.code === "unimplemented") {
    console.warn("Trình duyệt không hỗ trợ IndexedDB.");
  }
});

export { app, db, auth };

/*
  ⚠️  FIRESTORE SECURITY RULES – dán vào Firebase Console → Firestore → Rules → Publish
  Lưu ý cú pháp: dùng toán tử "||" (HOẶC) đầy đủ giữa các điều kiện,
  KHÔNG được viết "isAdmin() (request.auth...)" — đây là lỗi cú pháp gây
  Firestore từ chối toàn bộ request một cách âm thầm (permission-denied).

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {

      function isAdmin() {
        return request.auth != null
          && request.auth.uid == "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1";
      }

      // USERS – document ID = Firebase Auth UID (userId)
      match /users/{userId} {
        allow read   : if true;
        allow create : if request.auth != null;
        allow update : if isAdmin()
                       || (request.auth != null
                           && request.auth.uid == userId);
        allow delete : if isAdmin();
      }

      // ORDERS
      match /orders/{orderId} {
        allow create : if request.auth != null;
        allow read   : if isAdmin()
                       || (request.auth != null
                           && resource.data.uid == request.auth.uid);
        allow update,
              delete : if isAdmin();
      }

      // CARDS
      match /cards/{cardId} {
        allow create         : if request.auth != null;
        allow read,
              update, delete : if isAdmin();
      }

      // TITLEPURCHASES
      match /titlepurchases/{id} {
        allow create : if request.auth != null;
        allow read   : if isAdmin()
                       || (request.auth != null
                           && resource.data.uid == request.auth.uid);
        allow update,
              delete : if isAdmin();
      }

      // FRUITSTOCK – ai cũng xem được tồn kho (kể cả khách vãng lai)
      match /fruitstock/{id} {
        allow read  : if true;
        allow write : if isAdmin();
      }

      // SYSTEM_CONFIGS – services/categories/settings: khách vãng lai
      // (chưa đăng nhập) cũng đọc được để thấy thay đổi của admin ngay lập tức
      match /system_configs/{docId} {
        allow read  : if true;
        allow write : if isAdmin();
      }

      // COINLOGS – chỉ admin xem/ghi (log bơm tiền nội bộ)
      match /coinlogs/{id} {
        allow read, write: if isAdmin();
      }

      // MỌI COLLECTION KHÁC chưa khai báo ở trên
      match /{document=**} {
        allow read  : if true;
        allow write : if isAdmin();
      }
    }
  }
*/