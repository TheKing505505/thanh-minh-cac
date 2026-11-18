# Thanh Minh Các — bản đồng bộ khách hàng & Admin 3.0

## Phạm vi bản 3.0

Bản này sửa luồng dữ liệu để Firebase Authentication là nguồn xác thực duy nhất và Firestore là nơi lưu dữ liệu dùng chung giữa thiết bị khách và chủ shop.

- Đăng ký khách mới: tạo tài khoản Firebase Authentication bằng email/mật khẩu, sau đó tạo hồ sơ Firestore `users/{usernameLower}` có `uid`.
- Đăng nhập khách: dùng email/mật khẩu Firebase Authentication; tải hồ sơ theo UID.
- Đăng nhập admin: yêu cầu UID chính xác `MiiCu1YFHKOwhVcB48OAxR8ImRg2`.
- Đơn hàng: ghi `uid`, `usernameLower`; khách chỉ truy vấn đơn của mình; admin đọc và cập nhật.
- Nạp thẻ: yêu cầu có UID; chỉ admin duyệt và cộng số dư qua transaction; mã thẻ/seri được xóa khỏi document sau khi xử lý.
- Danh hiệu: yêu cầu mua có UID; admin cấp qua transaction và trừ số dư một lần.
- Cấu hình shop: dịch vụ, danh mục, cài đặt và mã giảm giá được chia sẻ qua `system_configs` và listener realtime.
- Tồn kho trái: đọc công khai, chỉ admin ghi.
- Lịch sử đơn khách: tự cập nhật khi admin đổi trạng thái.
- Lỗi ghi/đọc Firestore được hiển thị; không tự giả thành công bằng localStorage.

## Cấu hình Firebase được dùng

Project ID: `thanh-minh-cac-41666`

Auth domain: `thanh-minh-cac-41666.firebaseapp.com`

Storage bucket: `thanh-minh-cac-41666.firebasestorage.app`

Messaging Sender ID: `646917525177`

App ID: `1:646917525177:web:499798730e45509e899568`

Admin UID: `MiiCu1YFHKOwhVcB48OAxR8ImRg2`

Admin email: `thanhminhcacchu@thanhminhcacchu.com`

Web API key is in `js/firebase/init.js` as the Firebase Web App key supplied by the project settings. It is not a service-account key. Do not put service-account JSON or private credentials in this repository.

## Deployment order

### 1. Backup

- Download the current GitHub Pages source as a ZIP.
- Save a copy of the current Firestore Rules text.
- Do not delete or reset any Firestore collection or Firebase project.

### 2. Replace website source

- Extract `webv1-v3.0.zip`.
- Upload/replace the files inside its `webv1/` folder into the matching root of the GitHub Pages repository. Preserve the repository's Pages root layout.
- Confirm `index.html`, `js/`, `css/`, and `firebaserulev1.rules` are in the expected root.
- Commit changes.

### 3. Publish matching Firestore Rules

In Firebase Console, select project **`thanh-minh-cac-41666`** → Firestore Database → Rules.

- Copy the entire contents of `firebaserulev1.rules` from this package into the Rules editor.
- Publish the rules.
- Do not replace them with `allow read, write: if true`.

The website and Rules are a matched pair. If only the website is updated, Firestore may reject customer writes. If only Rules are updated, an older client will not send the required UID fields.

### 4. Hard refresh

Open the GitHub Pages website and press `Ctrl + Shift + R` (or clear the site's cached files if the browser still serves old JavaScript).

### 5. Test a brand-new customer account

Use a test email that is not already registered in Firebase Authentication. Register with:
- Username: a new unique username (2–32 characters, no `/`)
- Email: a valid email address
- Password: at least 6 characters

After the success message, check both places in Firebase Console:

1. Authentication → Users: a new Auth user should exist.
2. Firestore Database → Data → `users` → document ID equal to the lowercase username: field `uid` should equal the Auth UID.

Then open Admin Panel → Customers. The new profile should appear without reloading after the realtime listener receives it.

### 6. Test order flow

- Sign in as the test customer and submit a low-value test order.
- Firestore should create an `orders/{orderId}` document with `uid` and `usernameLower`.
- Admin Panel → Orders should show it.
- Admin can archive a pending order without deleting the document.
- To complete an order, the admin transaction checks the customer balance and then deducts the amount once. If balance is insufficient, add balance first or do not complete the order.
- Customer order history should update after admin changes the status.

### 7. Test card and title requests carefully

- For card-flow testing, use only a clearly marked test entry that will be rejected; do not enter real card codes just to test the UI.
- Admin can approve/reject pending card requests. Approval credits the stated denomination and clears serial/code fields after the transaction.
- A title request appears under Admin → Title Purchases. Admin grant verifies the customer UID, title and price before deducting the balance.

### 8. Test shared service configuration

- Admin changes a harmless test service description or setting and saves.
- Open the customer site in another browser profile/private window. The public storefront configuration should update after the Firestore listener receives the change.
- Restore the intended shop configuration after the test.

## Data preservation

- This package does not run migration, delete collections, reset Firestore, or remove old Firebase projects.
- The target project is `thanh-minh-cac-41666`. Documents in the earlier `thanh-minh-cac` project are not automatically copied into it.
- The previous localStorage-only clone accounts are not Firebase Authentication accounts and cannot sign in with this new version. Since the owner chose to stop using those old test accounts, this version does not migrate them. The old project/database is left untouched.
- Existing documents in the target Firestore project are not deleted. New customer profiles use `users/{usernameLower}`. A username already claimed by another UID is rejected rather than overwritten.

## Important limits and security notes

- No Roblox password is collected or stored in an order. The order stores the Roblox username/account name and indicates that any sensitive access details must be handled separately and privately. Avoid sending passwords through shop messages or storing them in Firestore.
- This is a static GitHub Pages client. The order price guard and balance transactions run from the authenticated admin browser; it is not a trusted server-side payment system. For stronger protection against a compromised admin browser or privileged client logic, a trusted backend/Cloud Function should validate prices and perform wallet mutations. Do not treat this client-only version as payment-grade accounting.
- The free Firebase Spark plan has quotas and product limits. This package adds no paid service by itself, but actual usage is still subject to Firebase plan limits and current quotas.
- Firestore Rules are authorization checks, not query filters. Customer queries explicitly include `where('uid', '==', currentUid)`; do not remove that condition.

## Checks performed here

- Node.js syntax check passed for all local JavaScript files.
- All 28 local script references in `index.html` resolve to files in the package.
- A mocked Firestore smoke test passed: customer profile, order, card request and title request writes include the correct UID and normalized username.
- This environment cannot access the owner's live Firebase project, publish rules, or perform a real Firebase Emulator integration test. Complete the deployment tests above before relying on live transactions.
