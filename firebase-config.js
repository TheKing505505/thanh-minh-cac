/**
 * firebase-config.js
 * Firebase v10 Modular SDK
 * Fix #3: UID admin thật đã được điền vào Security Rules
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
  apiKey           : "AIzaSyDmezzJngdyi0G4jH1QzeJQP_-cDEvAvEA",
  authDomain       : "thanh-minh-cac-41666.firebaseapp.com",
  projectId        : "thanh-minh-cac-41666",
  storageBucket    : "thanh-minh-cac-41666.firebasestorage.app",
  messagingSenderId: "646917525177",
  appId            : "1:646917525177:web:499798730e45509e899568"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// Bật offline persistence (IndexedDB) để shop vẫn hoạt động khi mất mạng tạm thời
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === "failed-precondition") {
    console.warn("TMC: offline persistence bị vô hiệu do mở nhiều tab.");
  } else if (err.code === "unimplemented") {
    console.warn("TMC: trình duyệt không hỗ trợ offline persistence.");
  }
});

export { app, db, auth };

/*
 * ════════════════════════════════════════════════════════════════
 *  FIRESTORE SECURITY RULES – production-ready
 *  Fix #3: Admin UID thật "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1" đã được điền
 *
 *  Dán toàn bộ nội dung dưới đây vào:
 *  Firebase Console → Firestore Database → Rules → Publish
 * ════════════════════════════════════════════════════════════════
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *
 *     // ── Helpers ─────────────────────────────────────────────
 *     // Fix #3: UID admin thật đã được hardcode vào đây
 *     function isAdmin() {
 *       return request.auth != null
 *         && request.auth.uid == "dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1";
 *     }
 *     function isOwner(uid) {
 *       return request.auth != null && request.auth.uid == uid;
 *     }
 *
 *     // ── Collection: users ────────────────────────────────────
 *     match /users/{uid} {
 *       allow read  : if isOwner(uid) || isAdmin();
 *       allow create: if request.auth != null && request.auth.uid == uid;
 *       allow update: if isOwner(uid) || isAdmin();
 *       allow delete: if isAdmin();
 *     }
 *
 *     // ── Collection: orders ──────────────────────────────────
 *     match /orders/{orderId} {
 *       allow read  : if isAdmin()
 *         || (request.auth != null && resource.data.uid == request.auth.uid);
 *       allow create: if request.auth != null
 *         && request.resource.data.uid == request.auth.uid;
 *       allow update, delete: if isAdmin();
 *     }
 *
 *     // ── Collection: cards ────────────────────────────────────
 *     match /cards/{cardId} {
 *       allow read  : if isAdmin()
 *         || (request.auth != null && resource.data.uid == request.auth.uid);
 *       allow create: if request.auth != null
 *         && request.resource.data.uid == request.auth.uid;
 *       allow update, delete: if isAdmin();
 *     }
 *
 *     // ── Collection: titlepurchases ───────────────────────────
 *     match /titlepurchases/{id} {
 *       allow read  : if isAdmin()
 *         || (request.auth != null && resource.data.uid == request.auth.uid);
 *       allow create: if request.auth != null
 *         && request.resource.data.uid == request.auth.uid;
 *       allow update, delete: if isAdmin();
 *     }
 *
 *     // ── Collection: fruitstock ───────────────────────────────
 *     // Fix #1: Mọi người (kể cả chưa đăng nhập) đọc được tồn kho
 *     // để hiển thị badge "còn hàng / hết hàng" trước khi login
 *     match /fruitstock/{id} {
 *       allow read : if true;
 *       allow write: if isAdmin();
 *     }
 *
 *     // ── Collection: system_configs ───────────────────────────
 *     // Fix #1: config shop (services, categories, settings, codes)
 *     // lưu trên Firestore – mọi người đọc được, chỉ admin ghi
 *     match /system_configs/{docId} {
 *       allow read : if true;
 *       allow write: if isAdmin();
 *     }
 *
 *     // ── Collection: coinlogs ────────────────────────────────
 *     match /coinlogs/{id} {
 *       allow read, write: if isAdmin();
 *     }
 *
 *     // ── Mặc định: từ chối tất cả ────────────────────────────
 *     match /{document=**} {
 *       allow read, write: if false;
 *     }
 *
 *   }
 * }
 */
