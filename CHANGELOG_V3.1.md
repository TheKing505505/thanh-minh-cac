# Changelog 3.1

- Gộp toàn bộ source website vào một gói ZIP hoàn chỉnh.
- Gộp các file chẩn đoán từ patch 3.1 vào source đầy đủ.
- Đính kèm Firestore Rules với tên rõ ràng `firebaserulev3.rules`.
- Cập nhật thông báo lỗi đăng ký để hướng dẫn đúng tên file Rules.
- Giữ nguyên các file giao diện, cấu hình và dữ liệu tĩnh hiện có trong source.

Lưu ý: đây là gói source để triển khai/kiểm thử, không phải xác nhận đã chạy thành công trên Firebase project thật.

## V3.1.1 – Username login alias
- New customer registrations create Firebase Auth identities as `<username>@thanhminhcacuser.com`.
- Real contact Gmail is optional and is stored separately in the Firestore `email` field.
- Firestore profile stores `authEmail` for traceability; the matching Rules permit it on profile creation and keep it immutable for customers.
- Customer login accepts username only and appends `@thanhminhcacuser.com` automatically.
- Admin can continue signing in with the existing admin email address.
- Existing customers created before this change can continue signing in with their old Firebase Auth email; their accounts are not migrated or deleted by this update.
