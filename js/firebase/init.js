// Firebase Compat SDK 10.12.0 — project đã xác nhận trong Firebase Console.
// API key là khóa nhận diện ứng dụng web, không phải service-account/private key.
let db = null;
let auth = null;

const firebaseConfig = {
    apiKey: "AIzaSyDmezzJngdyi0G4jH1QzeJQP_-cDEvAvEA",
    authDomain: "thanh-minh-cac-41666.firebaseapp.com",
    projectId: "thanh-minh-cac-41666",
    storageBucket: "thanh-minh-cac-41666.firebasestorage.app",
    messagingSenderId: "646917525177",
    appId: "1:646917525177:web:499798730e45509e899568"
};

(function initFirebase() {
    try {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK chưa được tải.');

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        } else {
            const existing = firebase.app();
            if (existing.options.projectId !== firebaseConfig.projectId) {
                throw new Error(`Firebase App đang trỏ tới project ${existing.options.projectId}, cần ${firebaseConfig.projectId}. Kiểm tra nơi khởi tạo Firebase khác.`);
            }
        }

        auth = firebase.auth();
        db = firebase.firestore();
        // Chỉ bật một cơ chế long-polling, không bật auto-detect đồng thời.
        db.settings({ experimentalForceLongPolling: true });
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .catch(error => console.warn('Không đặt được Auth persistence:', error));

        console.info('Firebase initialized:', firebaseConfig.projectId);
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        db = null;
        auth = null;
    }
})();
