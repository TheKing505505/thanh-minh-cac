// Firebase init — chạy ngay sau khi các script SDK load xong (blocking = đúng thứ tự)
// Lưu ý: apiKey/appId của Firebase Web là cấu hình CÔNG KHAI, không phải bí mật.
// Bảo vệ thật sự nằm ở Authentication + firestore.rules + giới hạn API key theo domain.
let db = null;
let auth = null;
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBgZncJBGRrJI1DobylcIwiS1CHXvbDjQo",
    authDomain: "thanh-minh-cac.firebaseapp.com",
    projectId: "thanh-minh-cac",
    storageBucket: "thanh-minh-cac.firebasestorage.app",
    messagingSenderId: "872838076122",
    appId: "1:872838076122:web:1d4b5f6839c4fbcb61f7e3"
};
function initFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK chưa load!');
            return;
        }
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        db.settings({ experimentalForceLongPolling: true, merge: true });
        auth = firebase.auth();
    } catch(e) {
        console.error('Firebase init failed:', e.message);
        db = null; auth = null;
    }
}
initFirebase();
