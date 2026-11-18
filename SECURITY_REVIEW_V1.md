# Báo cáo bảo mật và hướng dẫn migrate — Thanh Minh Các (webv1)

## 1. Kết luận quan trọng

Mình đã kiểm tra Firebase init, Firestore Rules và các luồng đăng ký/đăng nhập, tạo đơn, nạp thẻ, quản lý khách hàng, danh hiệu và tồn kho.

**Không thể chỉ thay Firestore Rules mà giữ nguyên frontend hiện tại rồi coi website đã an toàn.** Bản gốc chưa dùng Firebase Authentication:

- Khách đăng nhập bằng `users/{username}` và hàm `simpleHash()` tự viết.
- Chủ shop đăng nhập bằng mật khẩu viết thẳng trong `js/config/constants.js`.
- `role` được lưu trong `localStorage`, nên người dùng có thể sửa nó trong trình duyệt. Giá trị này không phải danh tính đáng tin cậy đối với Firebase.
- `users.js` tự chuyển sang localStorage khi Firestore từ chối quyền.
- Mã gốc có hai màn hình hướng dẫn copy rules `allow read, write: if true`.

Trong bản sao đã chỉnh:

- Đã xóa chuỗi mật khẩu admin khỏi `constants.js` và tạm khóa đường đăng nhập admin cũ. Chủ shop cần dùng Firebase Authentication sau khi tích hợp xong.
- Đã bỏ hai hướng dẫn mở toàn quyền Firestore.
- Đã chuyển các vị trí hiển thị dữ liệu khách nhập ở màn hình quản trị/lịch sử sang escape HTML, đồng thời dùng `textContent` cho thông báo để giảm nguy cơ stored XSS.
- Đã viết lại `firebaserulev1.rules` theo mô hình Firebase Authentication + UID.

**Không Publish rules mới ngay vào website hiện tại.** Frontend vẫn chưa tạo Firebase Auth session, chưa thêm `uid` vào document, và vẫn lưu `passwordHash`; do đó các thao tác ghi/đọc hiện tại sẽ bị từ chối. Đây là chủ đích fail-closed, không phải lỗi cần chữa bằng cách mở quyền công khai.

## 2. Những rủi ro cụ thể đã phát hiện

| Khu vực | Vấn đề | Hậu quả |
|---|---|---|
| Đăng nhập admin | Mật khẩu nằm trong JavaScript | Ai tải trang cũng xem được; không phải bí mật |
| Phiên đăng nhập | Dựa vào `localStorage` và `currentUser.role` | Có thể giả mạo giao diện quản trị; Rules không thể tin giá trị này |
| Tài khoản khách | `simpleHash()` không có salt và quá yếu | Hash có thể bị dò; không nên dùng cho mật khẩu thật |
| Firestore Rules cũ | Có `match /{document=**}` cho phép đọc công khai | Các giới hạn đọc riêng bị vô hiệu vì quyền khớp được cộng OR |
| Hồ sơ | Cho phép khách tự cập nhật không giới hạn trường | Có thể thử sửa số dư, vai trò, danh hiệu |
| Dữ liệu khách nhập | Nội dung order/card/user được chèn trực tiếp vào `innerHTML` | Có nguy cơ stored XSS nhắm vào trình duyệt chủ shop |
| Đơn hàng | Tài khoản/mật khẩu Roblox lưu plaintext | Dữ liệu nhạy cảm nếu tài khoản Firestore bị lộ hoặc người có quyền bị xâm nhập |
| Ví và giá | Client tự tính giá/giảm giá và tự ghi số dư | Không thể tin dữ liệu tiền do trình duyệt gửi lên |

## 3. File rules mới đang giả định điều gì?

`firebaserulev1.rules` là rules mục tiêu sau khi frontend được migrate. Nó giả định:

- Người dùng đã đăng nhập bằng Firebase Authentication.
- Mỗi hồ sơ `users/{username}` có trường `uid` trùng `request.auth.uid`.
- Các document `orders`, `cards`, `titlepurchases` có trường `uid` của người tạo.
- Khách chỉ đọc được document có UID của chính họ; chủ shop mới được đọc toàn bộ và cập nhật/xóa trạng thái.
- Khách không được sửa `balance`, `role`, `titleOverride`, trạng thái order, trạng thái card hoặc `coinlogs`.
- Chỉ collection `fruitstock` được đọc công khai; không có catch-all cấp quyền cho collection khác.

UID admin trong rules đang được sao chép từ file rules cũ: `dZ1j9g4vVcSDlGDtRIEkQlY7Vbt1`. Hãy xác nhận UID này thật sự là UID Firebase Authentication của chủ shop. Nếu không, thay bằng UID thực tế.

## 4. Các bước bắt buộc trước khi Publish

1. Sao lưu Firestore trước khi thay rules. Không xóa document cũ; các document chưa có `uid` sẽ không được khách đọc bằng rules mới.
2. Firebase Console → Authentication → Sign-in method → bật Email/Password.
3. Tạo/xác nhận tài khoản Firebase Authentication của chủ shop và xác minh UID admin như ghi ở trên.
4. Thêm Firebase Authentication SDK vào `index.html`. Viết lại đăng ký/đăng nhập bằng `createUserWithEmailAndPassword` và `signInWithEmailAndPassword`. Email hiện đang tùy chọn nên cần chuyển thành bắt buộc.
5. Không lưu mật khẩu hoặc `passwordHash` vào Firestore. Tài khoản cũ cần quy trình migrate riêng; không thể suy ra UID từ `simpleHash()`.
6. Khi tạo user/order/card/titlepurchase, thêm `uid: firebase.auth().currentUser.uid`. Chuyển truy vấn của khách sang lọc `uid == auth.currentUser.uid`; admin mới được truy vấn toàn collection.
7. Sửa luồng số dư: rules mới chỉ cho admin thay đổi balance. Frontend hiện có đoạn khách tự trừ tiền khi đặt đơn/mua danh hiệu; đoạn đó sẽ bị từ chối. Với mục tiêu không phát sinh phí backend, hãy để chủ shop xác nhận giá và cập nhật ví từ phiên admin. Không tin `price`/`discount` do client gửi; rules hiện tại chỉ kiểm tra kiểu và giới hạn cơ bản, chưa xác thực được giá dịch vụ động từ catalog localStorage.
8. Dữ liệu Roblox hiện vẫn nằm trong document order dạng plaintext. Giới hạn quyền đọc như rules mới, hạn chế người có quyền admin, không xuất/chia sẻ collection này và xóa thông tin đăng nhập sau khi hoàn tất nếu không còn cần.
9. Đổi/thu hồi mật khẩu admin cũ đã từng nằm trong source. Nếu repo GitHub từng public, chỉ xóa chuỗi khỏi file là chưa đủ vì mật khẩu có thể còn trong Git history.
10. Giới hạn Firebase Web API key theo domain/API cần thiết trong Google Cloud Console. API key frontend không phải mật khẩu admin, nhưng vẫn nên hạn chế nơi sử dụng.

## 5. Kiểm thử trước khi mở shop

Dùng Rules Playground hoặc Firebase Emulator để kiểm tra:

| Tình huống | Kết quả mong đợi |
|---|---|
| Chưa đăng nhập đọc `users`, `orders`, `cards`, `coinlogs` | Từ chối |
| Khách A đọc hồ sơ/đơn/thẻ của A có UID đúng | Cho phép |
| Khách A đọc dữ liệu của khách B | Từ chối |
| Khách A sửa `balance`, `role`, `titleOverride` | Từ chối |
| Khách A tạo order/card/titlepurchase với UID của B | Từ chối |
| Khách A tự sửa trạng thái order/card | Từ chối |
| Khách đọc `fruitstock` | Cho phép |
| Khách ghi `fruitstock` hoặc `coinlogs` | Từ chối |
| Chủ shop với đúng admin UID | Cho phép thao tác quản trị |

## 6. Kiểm tra đã thực hiện và giới hạn

- Đã chạy `node --check` cho tất cả file JavaScript trong gói: đạt.
- Đã thử `escapeHTML()` với chuỗi HTML/JavaScript thử nghiệm: ký tự nguy hiểm được mã hóa.
- Đã rà lại để không còn đoạn giao diện hướng dẫn `allow read, write: if true`.
- Chưa chạy được Firebase Rules Emulator và chưa kết nối Firebase project thật để kiểm thử Rules.
- Chưa migrate frontend sang Firebase Authentication, chưa migrate dữ liệu cũ và chưa Publish Rules. Vì vậy **đây là bản hardening + rules mục tiêu, chưa phải bản website đã sẵn sàng đưa vào vận hành thật**.
