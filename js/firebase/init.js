/* Firebase client initialization.
 * Các giá trị web config là cấu hình client công khai, KHÔNG phải khóa bí mật.
 * Quyền truy cập dữ liệu phải được kiểm soát bằng Firebase Authentication và Firestore Rules.
 */
let db = null;
(function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK chưa load!');
            return;
        }
        const firebaseConfig = {
            apiKey: "AIzaSyBgZncJBGRrJI1DobylcIwiS1CHXvbDjQo",
            authDomain: "thanh-minh-cac.firebaseapp.com",
            projectId: "thanh-minh-cac",
            storageBucket: "thanh-minh-cac.firebasestorage.app",
            messagingSenderId: "872838076122",
            appId: "1:872838076122:web:1d4b5f6839c4fbcb61f7e3"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        db.settings({ experimentalForceLongPolling: true, merge: true });
        console.log('✅ Firebase init OK');
    } catch (e) {
        console.error('Firebase init failed:', e.message);
        db = null;
    }
})();
