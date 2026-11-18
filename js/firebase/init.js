        // Firebase init — chạy ngay sau khi 2 script trên load xong (blocking = đúng thứ tự)
        let db = null;
        (function initFirebase() {
            try {
                if (typeof firebase === 'undefined') {
                    console.error('Firebase SDK chưa load!');
                    return;
                }
                // Tránh khởi tạo 2 lần nếu app đã tồn tại
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
                db = firebase.firestore();
                db.settings({ experimentalForceLongPolling: true, merge: true });
                console.log('✅ Firebase init OK');
            } catch(e) {
                console.error('Firebase init failed:', e.message);
                db = null;
            }
        })();
