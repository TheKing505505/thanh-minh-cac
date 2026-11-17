/* Khởi chạy ứng dụng sau khi tất cả script phụ thuộc đã được nạp. */
(async function initApp(){
    const session = loadSession();
    if (session) {
        if (session.role === 'admin') {
            // Phiên admin kiểu cũ chỉ lưu trong localStorage không phải bằng chứng xác thực.
            clearSession();
        } else {
            try {
                const user = await findUserInDB(session.username);
                if (user) currentUser = { username: user.username, role: 'user' };
                else clearSession();
            } catch (e) {
                // Giữ trải nghiệm offline cũ cho khách; Firestore Rules vẫn phải bảo vệ dữ liệu.
                currentUser = session;
            }
        }
    }
    renderServices();
    updateNav();
    applyVideoSetting();
    loadSocialProof();
    loadTopNap();
    renderTitleShopGrid();
    if (db) startFruitStockListener();
})();
