// ============================================================
// ===== CONFIG (KHÔNG chứa bí mật — file này ai cũng tải được) =====
// ============================================================

// Tên hiển thị dành riêng cho chủ shop — khách không được đăng ký trùng tên này.
const ADMIN_USER = 'Thanh Minh Các Chủ';

// UID của tài khoản admin trong Firebase Authentication.
// UID KHÔNG phải bí mật. Quyền admin thật sự được quyết định bởi firestore.rules
// (hàm isAdmin) — giá trị này ở client chỉ để hiển thị giao diện quản trị.
// PHẢI trùng với UID trong firestore.rules.
const ADMIN_UID = 'dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1';

// Khách đăng nhập bằng "tên đăng nhập"; hệ thống tự đổi thành email nội bộ
// (không gửi mail thật) để dùng Firebase Authentication.
const USER_EMAIL_DOMAIN = 'users.thanh-minh-cac.app';

// Khoá CÔNG KHAI (RSA-OAEP, định dạng JWK) dùng để mã hoá mật khẩu Roblox của khách.
// Tạo cặp khoá ở Admin → Cài Đặt → "Mã hoá mật khẩu Roblox", rồi dán khoá CÔNG KHAI vào đây.
// Khoá RIÊNG chỉ lưu ở máy chủ shop, TUYỆT ĐỐI không đưa lên GitHub.
// Để null = chưa bật mã hoá (mật khẩu sẽ lưu dạng chữ thường — KHÔNG khuyến nghị).
const ORDER_PUBLIC_KEY = null;
