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
├── firestore.rules
├── .gitignore
└── README.md
```

## Cách chạy thử miễn phí

1. Mở thư mục này trong VS Code.
2. Chạy `index.html` bằng tiện ích Live Server, hoặc triển khai như một trang tĩnh trên GitHub Pages.
3. Firebase vẫn dùng Web SDK dạng compat từ CDN như bản cũ; không có npm, bundler hay dịch vụ trả phí mới được thêm vào.
4. Dùng Firebase Console để áp dụng Rules tại `firestore.rules` sau khi đã rà soát và sửa các vấn đề bảo mật bên dưới.

> Các file JavaScript đang được nạp bằng classic `<script>` theo thứ tự trong `index.html`, không dùng `type="module"`. Cách này được giữ để các `onclick="..."` đang có trong HTML tiếp tục gọi được các hàm global mà không phải đổi toàn bộ HTML.

## Việc chưa được thực hiện trong lượt tách

- Không đổi thuật toán đăng nhập, đăng ký, đặt đơn, ví, nạp thẻ, danh hiệu hay tồn kho.
- Không chuyển sang Firebase Authentication.
- Không hash/chuyển đổi dữ liệu tài khoản cũ.
- Không chỉnh Firestore Rules.
- `data/wallet.js` là placeholder có chủ đích vì luồng số dư và `coinlogs` hiện đang được thực hiện trực tiếp trong các hàm admin/user gốc; tách thành API riêng sẽ là một lượt refactor logic khác.

## CẢNH BÁO BẢO MẬT — chưa public repo ở trạng thái này

Bản gốc có thông tin đăng nhập admin viết thẳng trong `js/config/constants.js`. Vì JavaScript phía trình duyệt tải xuống được, tách sang file riêng **không che giấu** mật khẩu. Hãy đổi/thu hồi mật khẩu đã lộ và không xem nó là bí mật an toàn cho frontend.

Mã hiện tại tự xác thực bằng dữ liệu `users`/`localStorage`; trong source không có luồng `firebase.auth().signIn...` để tạo Firebase Auth session. Trong khi đó, Rules được cung cấp dùng `request.auth != null` cho phần lớn thao tác ghi. Vì vậy, khi bật đúng Rules này, các thao tác ghi của website có thể bị `permission-denied` nếu người dùng chưa đăng nhập bằng Firebase Authentication. Vai trò `currentUser.role` trong trình duyệt không thay thế được `request.auth`.

Mật khẩu tài khoản khách hiện được lưu dưới trường `passwordHash`, nhưng hàm `simpleHash()` trong frontend là hàm hash tự viết rất yếu, không phải thuật toán lưu mật khẩu chuyên dụng (không salt, không chống dò mật khẩu). Kết hợp với quyền đọc công khai ở Rules hiện tại, dữ liệu hash này cũng có thể bị lấy ra để dò ngoại tuyến. Không nên dùng hệ thống tài khoản này cho dữ liệu thật trước khi chuyển sang Firebase Authentication.

Trong giao diện hiện tại còn có thông báo hướng dẫn thay Rules bằng `allow read, write: if true`. Đây là hướng dẫn không an toàn và không được làm theo. Mình giữ nguyên phần này trong lượt tách để không sửa logic/giao diện ngoài phạm vi, nhưng cần loại bỏ nó ở lượt bảo mật tiếp theo.

Rules được gửi kèm còn có các rủi ro cần xử lý trước khi vận hành thật:

- `match /{document=**}` cho phép đọc tất cả document. Trong Firestore, các điều kiện `allow` khớp nhiều nhánh được kết hợp theo OR, nên quy tắc đọc tổng quát này làm mất tác dụng giới hạn đọc riêng tư của `users`, `orders`, `cards`, `titlepurchases` và `coinlogs`.
- `users` đang cho phép đọc công khai; dữ liệu tài khoản có thể bị lộ.
- Người dùng tự cập nhật document của mình mà chưa giới hạn field, nên có thể thử sửa `balance`, `role` hoặc các trường nhạy cảm.
- Các rule tạo `orders`, `cards`, `titlepurchases` chưa ràng buộc `uid` của document phải trùng `request.auth.uid`.
- Vì code hiện tại chưa dùng Firebase Auth, cần thiết kế lại xác thực và quyền truy cập cùng nhau trước khi đổi Rules.

Firebase Web API key trong `init.js` là cấu hình client, không phải khóa máy chủ. Tuy vậy, cần giới hạn API key theo domain/API phù hợp trong Google Cloud/Firebase Console và bảo vệ dữ liệu bằng Authentication + Rules. Không đưa private key/service account hoặc mật khẩu admin vào repository.

## Bước tiếp theo nên làm

1. Xác nhận repo GitHub là public hay private; nếu public, không push nguyên trạng file có mật khẩu admin.
2. Chuyển xác thực sang Firebase Authentication (giữ phương thức đăng nhập mong muốn) và ánh xạ tài khoản cũ, không để client tự quyết định quyền admin.
3. Thiết kế lại Rules theo UID, kiểm tra field được phép sửa, và loại bỏ quyền đọc công khai không cần thiết.
4. Chỉ sau khi test các luồng đăng nhập, tạo đơn, ví, nạp thẻ, danh hiệu và quản trị mới triển khai công khai.
