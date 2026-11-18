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
                authDomain: "thanh-minh-cac.firebaseapp.com",
                projectId: "thanh-minh-cac",
                storageBucket: "thanh-minh-cac.firebasestorage.app",
                messagingSenderId: "872838076122",
                appId: "1:872838076122:web:1d4b5f6839c4fbcb61f7e3"
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
