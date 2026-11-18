# Thanh Minh Các

Bản tách cấu trúc từ `webv0(2).html`. Lượt này tập trung **tách CSS, JavaScript và giữ nguyên phần giao diện/logic hiện có**; không phải là bản hoàn tất bảo mật.

## Cấu trúc

```text
thanh-minh-cac/
├── index.html
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── pages.css
│   └── admin.css
├── js/
│   ├── firebase/init.js
│   ├── config/constants.js
│   ├── config/catalog.js
│   ├── config/title-logos.js
│   ├── core/state.js
│   ├── core/storage.js
│   ├── core/helpers.js
│   ├── data/users.js
│   ├── data/orders.js
│   ├── data/cards.js
│   ├── data/wallet.js
│   ├── data/titles.js
│   ├── data/fruit-stock.js
│   ├── features/auth.js
│   ├── features/storefront.js
│   ├── features/orders.js
│   ├── features/profile-history.js
│   ├── features/card-topup.js
│   ├── features/titles.js
│   ├── admin/dashboard.js
│   ├── admin/users.js
│   ├── admin/orders.js
│   ├── admin/services.js
│   ├── admin/cards.js
│   ├── admin/titles.js
│   ├── admin/settings-stock.js
│   └── app.js
├── firebaserulev1.rules
├── .gitignore
└── README.md
```

## Cách chạy thử miễn phí

1. Mở thư mục này trong VS Code.
2. Chạy `index.html` bằng tiện ích Live Server, hoặc triển khai như một trang tĩnh trên GitHub Pages.
3. Firebase vẫn dùng Web SDK dạng compat từ CDN như bản cũ; không có npm, bundler hay dịch vụ trả phí mới được thêm vào.
4. Rules mục tiêu nằm trong `firebaserulev1.rules`; chỉ Publish sau khi hoàn tất Firebase Authentication và migrate UID theo `SECURITY_REVIEW_V1.md`.

> Các file JavaScript đang được nạp bằng classic `<script>` theo thứ tự trong `index.html`, không dùng `type="module"`. Cách này được giữ để các `onclick="..."` đang có trong HTML tiếp tục gọi được các hàm global mà không phải đổi toàn bộ HTML.

## Trạng thái sau lượt rà soát bảo mật

- Frontend chưa được migrate sang Firebase Authentication.
- Dữ liệu user/order/card cũ chưa được bổ sung UID.
- Các luồng trừ tiền và mua danh hiệu chưa được thiết kế lại để chỉ chủ shop thay đổi số dư.
- `data/wallet.js` vẫn là placeholder; số dư hiện được cập nhật trực tiếp trong các hàm client.


## CẢNH BÁO BẢO MẬT — chưa public repo ở trạng thái này

Bản gốc có thông tin đăng nhập admin viết thẳng trong `js/config/constants.js`. Vì JavaScript phía trình duyệt tải xuống được, tách sang file riêng **không che giấu** mật khẩu. Hãy đổi/thu hồi mật khẩu đã lộ và không xem nó là bí mật an toàn cho frontend.

Mã gốc tự xác thực bằng dữ liệu `users`/`localStorage`; không có luồng Firebase Authentication. Rules bảo mật mới yêu cầu Firebase Auth và trường `uid`, nên không được Publish trước khi frontend hoàn tất migrate. Vai trò `currentUser.role` trong trình duyệt không thay thế được `request.auth`.

Mật khẩu tài khoản khách trong mã gốc được lưu dưới `passwordHash`, nhưng `simpleHash()` là hàm tự viết rất yếu. Bản sao bảo mật không xem dữ liệu này là xác thực an toàn; cần chuyển sang Firebase Authentication và không lưu mật khẩu/hash trong Firestore.

Mã nguồn gốc có hai thông báo hướng dẫn thay Rules bằng `allow read, write: if true`. Đây là hướng dẫn không an toàn; bản sao bảo mật mới đã loại bỏ các đoạn hướng dẫn đó.

Rules gốc trong gói RAR có các rủi ro nghiêm trọng sau (đã được thay bằng rules mục tiêu trong `firebaserulev1.rules`):

- `match /{document=**}` cho phép đọc công khai tất cả document. Trong Firestore, các điều kiện `allow` khớp nhiều nhánh được kết hợp theo OR, nên rule đọc tổng quát đã làm mất giới hạn riêng tư ở các collection.
- `users` cho phép đọc công khai; người dùng tự cập nhật document mà chưa giới hạn field.
- Rule tạo `orders`, `cards`, `titlepurchases` không ràng buộc UID người tạo với Firebase Authentication.
- Bản code gốc không có Firebase Auth nên không thể dùng các điều kiện `request.auth` một cách đáng tin cậy.

Firebase Web API key trong `init.js` là cấu hình client, không phải khóa máy chủ. Tuy vậy, cần giới hạn API key theo domain/API phù hợp trong Google Cloud/Firebase Console và bảo vệ dữ liệu bằng Authentication + Rules. Không đưa private key/service account hoặc mật khẩu admin vào repository.

## Bước tiếp theo nên làm

1. Xác nhận repo GitHub là public hay private; nếu public, không push nguyên trạng file có mật khẩu admin.
2. Chuyển xác thực sang Firebase Authentication (giữ phương thức đăng nhập mong muốn) và ánh xạ tài khoản cũ, không để client tự quyết định quyền admin.
3. Thiết kế lại Rules theo UID, kiểm tra field được phép sửa, và loại bỏ quyền đọc công khai không cần thiết.
4. Chỉ sau khi test các luồng đăng nhập, tạo đơn, ví, nạp thẻ, danh hiệu và quản trị mới triển khai công khai.


## Bao mat (cap nhat 2026-11-18)

Doc `SECURITY_REVIEW_V1.md` truoc khi dua len Firebase. File `firebaserulev1.rules` moi yeu cau Firebase Authentication va truong `uid`; khong Publish khi frontend chua migrate. Mat khau admin cu da duoc go khoi ban sao nay; chuc nang dang nhap admin tam thoi bi khoa cho den khi tich hop Firebase Authentication.

## Version 3.0 — Firebase Auth & đồng bộ khách/Admin

Bản đồng bộ 3.0 dùng Firebase Authentication làm danh tính khách/admin, Firestore UID cho hồ sơ/đơn/thẻ/yêu cầu danh hiệu và `firebaserulev1.rules` làm bộ Rules tương ứng.

**Hướng dẫn triển khai hiện hành:** xem [`IMPLEMENTATION_V3.md`](IMPLEMENTATION_V3.md). Tài liệu `AUTH_MIGRATION_STEP2.md` cũ đã được thay thế.
