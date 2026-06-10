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

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {

      function isAdmin() {
        return request.auth != null
          && request.auth.uid == "REPLACE_WITH_YOUR_ADMIN_UID";
      }
      function isOwner(uid) {
        return request.auth != null && request.auth.uid == uid;
      }

      match /users/{uid} {
        allow read: if isOwner(uid) || isAdmin();
        allow create: if request.auth != null && request.auth.uid == uid;
        allow update: if isOwner(uid) || isAdmin();
        allow delete: if isAdmin();
      }
      match /orders/{orderId} {
        allow read: if isAdmin()
          || (request.auth != null && resource.data.uid == request.auth.uid);
        allow create: if request.auth != null
          && request.resource.data.uid == request.auth.uid;
        allow update, delete: if isAdmin();
      }
      match /cards/{cardId} {
        allow read: if isAdmin()
          || (request.auth != null && resource.data.uid == request.auth.uid);
        allow create: if request.auth != null
          && request.resource.data.uid == request.auth.uid;
        allow update, delete: if isAdmin();
      }
      match /titlepurchases/{id} {
        allow read: if isAdmin()
          || (request.auth != null && resource.data.uid == request.auth.uid);
        allow create: if request.auth != null
          && request.resource.data.uid == request.auth.uid;
        allow update, delete: if isAdmin();
      }
      match /fruitstock/{id} {
        allow read: if true;
        allow write: if isAdmin();
      }
      match /coinlogs/{id} {
        allow read, write: if isAdmin();
      }
    }
  }
*/
