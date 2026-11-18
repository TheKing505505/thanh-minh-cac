# Thanh Minh Các — Shop cày thuê Blox Fruits (bản bảo mật)

Web tĩnh (HTML/CSS/JS) + Firebase (Authentication + Firestore). **Chi phí 0đ**: chỉ dùng gói Spark miễn phí, không Cloud Functions, không dịch vụ trả phí.

## Mô hình bảo mật (tóm tắt)

| Vấn đề cũ | Cách xử lý hiện tại |
|---|---|
| Mật khẩu admin nằm trong `constants.js` | Xoá. Admin đăng nhập bằng **Firebase Authentication** (email + mật khẩu), quyền admin do `firestore.rules` kiểm tra theo UID |
| Rule `match /{document=**} allow read: if true` làm lộ mọi dữ liệu | Xoá. Mặc định **từ chối**, từng collection có rule riêng |
| Đăng nhập tự viết (`simpleHash`, lưu user/phiên ở localStorage) | Xoá. Dùng Firebase Auth (băm mật khẩu + giới hạn thử sai do Google lo) |
| Khách tự sửa được `balance`/`role` | Rule chặn: khách chỉ sửa được `email`, `facebook`. **Chỉ admin** đổi tiền/danh hiệu, bằng transaction |
| Mật khẩu Roblox lưu chữ thường, ai đọc DB cũng thấy | **Mã hoá RSA-OAEP** ngay trên trình duyệt khách; chỉ admin có khoá riêng mới giải mã |
| Mã thẻ cào, đơn hàng đọc công khai | Chỉ chủ sở hữu + admin đọc được |
| XSS (tên khách/ghi chú chèn HTML chạy trong trang admin) | Mọi dữ liệu động đi qua `esc()`; thông báo dùng `textContent`; thêm CSP |
| Bảng xếp hạng cần đọc toàn bộ đơn/thẻ | Admin tổng hợp sẵn vào `public_stats/summary` (công khai, chỉ chứa tên + số đếm) |
| Giá do khách gửi lên | Khách chỉ gửi *yêu cầu*; **admin tính lại giá chuẩn** khi hoàn thành đơn và cảnh báo nếu khai sai |

> ⚠️ Không có máy chủ riêng nên **trình duyệt admin là nơi duy nhất xử lý tiền**. Hãy bảo vệ tài khoản admin (xem mục 7).

## Cách triển khai (làm đúng thứ tự)

### 1. Bật đăng nhập Email/Mật khẩu
Firebase Console → **Authentication → Sign-in method → Email/Password → Enable**.
(Khách đăng nhập bằng *tên đăng nhập*; hệ thống tự đổi thành email nội bộ `u…@users.thanh-minh-cac.app`, không gửi mail thật.)

### 2. Tạo tài khoản admin
Authentication → **Users → Add user** (email thật của bạn + mật khẩu mạnh, dài ≥ 14 ký tự, duy nhất). Copy **User UID**.
Dán UID đó vào **2 chỗ** (phải giống nhau):
- `firestore.rules` → hàm `isAdmin()`
- `js/config/constants.js` → `ADMIN_UID`

(Bản này đang để sẵn UID `dZ1j9g4v…` lấy từ file rules cũ của bạn — hãy kiểm tra nó có đúng là tài khoản admin trong Authentication không.)

### 3. Xử lý dữ liệu cũ TRƯỚC khi publish rules mới
- Đơn cũ không có trường `uid` → khách không xem lại được, admin vẫn xem. Nên hoàn thành/xoá hết đơn cũ đang chờ trước.
- Hồ sơ khách cũ (`users/<tên>` có `passwordHash`) chỉ còn admin đọc được. Khách cũ **đăng ký lại cùng tên** → Admin → Khách Hàng → mục “Tài khoản cũ” → **Chuyển** (chuyển số dư + danh hiệu và **xoá hồ sơ cũ**).
- Xoá hẳn các đơn cũ có mật khẩu Roblox chữ thường nếu không cần nữa.

### 4. Publish Rules
Firebase Console → **Firestore Database → Rules** → dán toàn bộ `firestore.rules` → **Publish**.
(Chỉ dùng file này. **Không** dán `allow read, write: if true` dù bất kỳ hướng dẫn nào bảo vậy.)

### 5. Giới hạn API key theo domain
Google Cloud Console → **APIs & Services → Credentials** → chọn Browser key của dự án → *Application restrictions: Websites* → thêm `https://<user>.github.io/*` và `http://localhost:*`. Authentication → Settings → **Authorized domains**: chỉ giữ domain thật của bạn.
(Web API key của Firebase là thông tin công khai, nhưng giới hạn domain giúp chống kẻ khác xài ké quota.)

### 6. Bật mã hoá mật khẩu Roblox
Đăng nhập admin (gõ **email admin** vào ô “Tên đăng nhập”) → **Cài Đặt → Mã Hoá Mật Khẩu Roblox → Tạo Cặp Khoá**.
- File khoá **riêng** tự tải về (`tmc-PRIVATE-KEY-…json`): cất vào trình quản lý mật khẩu/USB. **Không đưa lên GitHub.** Mất khoá = không đọc lại được mật khẩu các đơn đã mã hoá.
- Dòng khoá **công khai** hiện ra → dán vào `js/config/constants.js` (`ORDER_PUBLIC_KEY`) rồi commit.
- Khi cần xem mật khẩu khách: dán khoá riêng vào ô “Nhập khoá riêng” → “Dùng Khoá Riêng” → ở đơn bấm **🔓 Giải mã**. Khoá chỉ nằm trong phiên, mất khi đóng tab/đăng xuất.

### 7. Bảo vệ tài khoản admin (quan trọng nhất)
Ai chiếm được tài khoản admin = toàn quyền. Hãy bật **xác thực 2 bước** cho Gmail/Google của dự án Firebase **và** cho GitHub; dùng mật khẩu admin riêng, không dùng lại mật khẩu admin cũ (đã từng nằm trong source) ở bất kỳ đâu.

### 8. Đưa lên GitHub
`.gitignore` đã chặn `.env`, khoá riêng, service account. Trước khi `git push`: tự tìm mật khẩu admin cũ và chuỗi `PRIVATE` trong toàn bộ thư mục (kể cả `git log -p`) — phải ra rỗng. Mật khẩu admin cũ có thể còn trong **lịch sử git cũ** — nếu repo từng có commit chứa nó thì tạo repo mới sạch (hoặc dùng `git filter-repo`) và coi mật khẩu đó đã lộ.

## Cách hoạt động của tiền (khác bản cũ)
1. Khách đặt đơn → đơn ở trạng thái *pending*, **chưa trừ tiền**; hệ thống tính “số dư khả dụng = số dư − tiền đang giữ cho đơn chờ”.
2. Admin bấm **Hoàn Thành & Trừ Tiền** → transaction: kiểm tra số dư, tính lại giá chuẩn, trừ tiền, đóng đơn, ghi `coinlogs`. Không đủ tiền thì không hoàn thành.
3. Duyệt thẻ nạp và cấp danh hiệu mua cũng là transaction (không thể duyệt 2 lần).

## Giới hạn còn lại (nói thẳng)
- **Chống spam đơn/thẻ**: không có máy chủ nên chỉ chặn bằng rule (định dạng, kích thước, `uid`, tên khớp hồ sơ). Một tài khoản vẫn có thể tạo nhiều đơn/thẻ rác. Nên bật **Firebase App Check** (reCAPTCHA v3, miễn phí) khi rảnh.
- **Duyệt thẻ cào là thủ công**: thẻ giả vẫn là rủi ro kinh doanh — chỉ duyệt sau khi đã kiểm tra thẻ thật.
- **Danh mục dịch vụ/giá** vẫn lưu ở `localStorage` của trình duyệt admin (như bản cũ), khách thấy giá mặc định trong `catalog.js`. Nếu bạn sửa giá ở admin, cần đồng bộ cho khách ở bước refactor sau (lưu danh mục vào Firestore).
- Mã giảm giá trong admin hiện chưa được dùng khi đặt đơn (giữ nguyên như bản cũ).
- Chưa gắn **SRI** cho script Firebase CDN (cần hash đúng phiên bản 10.12.0). Có thể thêm bằng `openssl dgst -sha384 -binary file.js | openssl base64 -A`.
- Xoá hồ sơ khách ở admin chỉ xoá Firestore; muốn chặn đăng nhập hẳn thì xoá thêm trong Authentication.

## Cấu trúc
```text
index.html            (có CSP meta)
firestore.rules       ← rule mới (thay firebaserulev1.rules)
css/…
js/core/security.js   esc(), safeId(), mã hoá RSA, băm tên đăng nhập
js/data/wallet.js     transaction tiền (chỉ admin)
js/data/public-stats.js
js/features/…  js/admin/…  (đã escape + chuyển sang uid)
js/admin/encryption.js  quản lý khoá mã hoá
```
