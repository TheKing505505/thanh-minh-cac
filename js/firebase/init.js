// ==========================================
// FIREBASE INIT — COMPAT SDK 10.12.0
// Project: thanh-minh-cac-41666
// Khởi tạo Firebase một lần duy nhất
// ==========================================

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

        // 1. Kiểm tra Firebase SDK
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK chưa được tải!');
        }

        // 2. Kiểm tra Firebase App hiện có
        if (firebase.apps.length > 0) {

            const existingApp = firebase.app();

            if (existingApp.options.projectId !== firebaseConfig.projectId) {
                throw new Error(
                    'Firebase đang sử dụng sai project: ' +
                    existingApp.options.projectId +
                    '. Yêu cầu: ' + firebaseConfig.projectId +
                    '. Hãy kiểm tra các file khởi tạo Firebase khác.'
                );
            }

        } else {

            // 3. Khởi tạo Firebase App
            firebase.initializeApp(firebaseConfig);
        }

        // 4. Khởi tạo Authentication
        auth = firebase.auth();

        // 5. Khởi tạo Firestore
        db = firebase.firestore();

        // 6. Chỉ sử dụng Force Long Polling
        // Không bật đồng thời Auto Detect Long Polling
        db.settings({
            experimentalForceLongPolling: true
        });

        // 7. Lưu phiên đăng nhập Firebase
        auth.setPersistence(
            firebase.auth.Auth.Persistence.LOCAL
        ).catch(error => {
            console.warn(
                'Không thiết lập được Auth Persistence:',
                error
            );
        });

        console.log(
            'Firebase khởi tạo thành công!',
            'Project:',
            firebaseConfig.projectId
        );

        console.log('Firebase Auth:', auth);
        console.log('Firestore:', db);

    } catch (error) {

        console.error('Firebase initialization failed:', error);

        db = null;
        auth = null;
    }
})();
