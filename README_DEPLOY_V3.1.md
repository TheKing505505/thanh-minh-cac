# Thanh Minh Các — gói source đầy đủ 3.1

Gói này gồm toàn bộ website (index.html, css/, js/), file Firestore Rules `firebaserulev3.rules`, tài liệu và smoke test.

## Cấu hình dự án
- Firebase project: `thanh-minh-cac-41666`
- Auth domain: `thanh-minh-cac-41666.firebaseapp.com`
- Admin UID: `MiiCu1YFHKOwhVcB48OAxR8ImRg2`

## Triển khai an toàn
1. Tải ZIP và giải nén.
2. Sao lưu repository GitHub Pages hiện tại và lưu riêng Rules đang chạy.
3. Đưa nội dung thư mục gói này vào đúng thư mục publish của GitHub Pages (nơi đang có `index.html`).
4. Firebase Console → đúng project `thanh-minh-cac-41666` → Firestore Database → Rules.
5. Chỉ sau khi xác nhận project đúng, copy toàn bộ `firebaserulev3.rules` vào Rules editor và Publish.
6. Hard refresh website bằng Ctrl+Shift+R.
7. Kiểm thử bằng tài khoản mới: Authentication phải có user; Firestore `users/{usernameLower}` phải có hồ sơ với UID trùng Auth UID; Admin Panel phải đọc được hồ sơ.

## Cảnh báo tương thích
- Website và `firebaserulev3.rules` được thiết kế để dùng cùng nhau. Không dùng Rules cũ `firebaserulev1.rules`.
- Rules yêu cầu document hồ sơ tại `users/{usernameLower}` và các trường UID/schema tương ứng. Document cũ hoặc tài khoản localStorage không tự được chuyển đổi.
- Không xóa collections, không reset Firestore và không xóa tài khoản Auth để thử sửa lỗi.
- Đây là website tĩnh chạy logic từ trình duyệt. Các thao tác nhạy cảm về số dư/thanh toán chưa tương đương backend tin cậy; cần kiểm thử trên project thật trước khi dùng với giao dịch thật.
- Không dùng dữ liệu thẻ thật để test. Chỉ dùng dữ liệu giả lập.

## Kiểm tra đã chạy trong môi trường đóng gói
- `node --check` cho các file JavaScript.
- `node tests/firestore-payload-smoke-test.js`.
- Đã kiểm tra đường dẫn script trong `index.html`.

Các kiểm tra trên không thay thế kiểm thử Firebase thật/Firestore Emulator và không xác nhận rằng Rules đã được Publish trên project của bạn.
