// Firebase init — Compat SDK 10.12.0. Khởi tạo một lần duy nhất.
let db = null;
let auth = null;
(function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK chưa load!');
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp({
                apiKey: "AIzaSyBgZncJBGRrJI1DobylcIwiS1CHXvbDjQo",
                authDomain: "thanh-minh-cac-41666.firebaseapp.com",
                projectId: "thanh-minh-cac-41666",
                storageBucket: "thanh-minh-cac.firebasestorage.app",
                messagingSenderId: "646917525177",
                appId: "1:646917525177:web:499798730e45509e899568"
            });
        }
        auth = firebase.auth();
        db = firebase.firestore();
        // Chỉ cấu hình Long Polling một lần; không bật đồng thời auto-detect.
        db.settings({ experimentalForceLongPolling: true });
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
            console.warn('Không đặt được Auth persistence:', err);
        });
        console.log('Firebase App, Auth và Firestore đã khởi tạo.');
    } catch (e) {
        console.error('Firebase init failed:', e);
        db = null;
        auth = null;
    }
})();
