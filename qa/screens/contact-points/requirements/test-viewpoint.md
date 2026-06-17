# contact-points — Test Viewpoints

## Edge Cases

- **Ô chứa nhiều tên (multi-name cell):** Hiển thị toàn bộ text as-is, không parse, không truncate.
  Ví dụ: `"Ms Hồ Thị Thu Hiền B\nMs Lê Thị Đăng Phúc"` hiển thị đầy đủ cả hai tên trong cùng một ô.
  → **Manual test** (không thể assert giá trị cụ thể vì data lấy từ DB; chỉ assert ô không rỗng và text không bị cắt).
- **Ô không có contact (`–`):** Một số ô hiển thị dấu `–` khi office đó không có người phụ trách — assert cell tồn tại, không assert nội dung cụ thể.
- **Bảng rỗng:** Nếu DB không trả về dữ liệu, bảng có thể rỗng — cần kiểm tra trường hợp này (hiện chưa có spec xử lý).

## Known Issues

<!-- Chưa ghi nhận bug nào liên quan đến screen này. -->

## Design Decisions

- **Data source là DB, không phải hardcode:** Tên department, issue, contact person đều lấy từ bảng `division` trong DB.
  Test case KHÔNG được assert exact text — chỉ assert cấu trúc bảng (số cột, bảng visible, có ít nhất 1 row dữ liệu).
- **Skip Global Header:** Các element thuộc Header (nav links: Trang chủ, Điểm liên hệ; Notifications; Language switch; Logout) được cover bởi test suite riêng của Global Header. Không gen test case cho các element này trong screen contact-points.
- **Skip Logout:** Logout thuộc Global Header — bỏ qua, không gen test case tại đây.

## UI Patterns Identified

Only applicable patterns are listed. Patterns not listed are not applicable to this screen.

| # | Pattern | Applicable? | Notes |
|---|---------|-------------|-------|
| 2 | Data Table | ✓ | Bảng chính của screen, read-only, data từ DB |

## Priority Viewpoints

| VP | Priority | Reason |
|---|----------|--------|
| VP-UI-1 | High | Bảng hiển thị đúng cấu trúc (tiêu đề cột, số cột, có dữ liệu) |
| VP-AUTH-1 | High | Screen yêu cầu đăng nhập; unauthenticated user bị redirect |
| VP-DATA-1 | Medium | Ô nhiều tên hiển thị đầy đủ, không truncate — manual verify |
| VP-VAL-1 | Skip | Màn hình chỉ hiển thị dữ liệu, không có chức năng nhập liệu hay kiểm tra |
| VP-LOGIC-1 | Skip | Không có business logic phía client |
| VP-SEC-1 | Low | Chỉ cần verify auth redirect; không có action nào gây rủi ro |
