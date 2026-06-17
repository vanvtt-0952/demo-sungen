# Project Context

> Read by the AI before generating test cases for any screen in this project.
> Fill in what applies — leave sections empty if not relevant.
> **The more specific you are, the more accurate the generated test cases.**

---

## Project Overview

**Application:**
S-Ask là nền tảng Q&A nội bộ (internal knowledge-sharing) dành cho nhân viên Sun*, cho phép đặt câu hỏi ẩn danh hoặc có danh tính, nhận câu trả lời chính thức qua luồng duyệt đa cấp (CC → Department → LM → Published).

**Target users:**
- **USER** — Nhân viên Sun*: đặt câu hỏi, vote, xem câu trả lời, quản lý profile.
- **MANAGER (CC Member)** — Thành viên tổ C&C: tiếp nhận câu hỏi, viết câu trả lời chính thức, chuyển tiếp cho phòng ban.
- **DEPARTMENT LEAD** — Trưởng phòng ban: nhận câu hỏi chuyển tiếp, soạn câu trả lời chuyên biệt.
- **LM (Line Manager)** — Quản lý cấp trên: review & phê duyệt câu trả lời trước khi publish.
- **ADMIN** — Quản trị viên: quản lý danh mục, văn phòng, người dùng, cấu hình hệ thống.

---

## Domain Notes

- **Question statuses (lifecycle):** `DRAFT → WAITING → PENDING_DEPARTMENT_ANSWER → CC_REVIEW → LM_REVIEW → DONE → ACCEPTED`
  - TH1 (có phòng ban): WAITING → PENDING_DEPARTMENT_ANSWER → CC_REVIEW → LM_REVIEW → DONE → ACCEPTED
  - TH2 (không có phòng ban): WAITING → LM_REVIEW → DONE → ACCEPTED
  - Câu hỏi được ACCEPT sau khi admin/manager chấp nhận sau trạng thái DONE.
- **S-Ask module:** Tên module nghiệp vụ cho workflow hỏi-đáp nội bộ (khác với tên dự án). SAsk prefix trong DB (SAskDepartment, SAskUserRole, …).
- **Locale:** Hỗ trợ `vi` (Vietnamese) và `en` (English). Route có prefix `[locale]`.
- **WSM SSO:** Đăng nhập chính qua WSM (edev.sun-asterisk.vn). Google OAuth là tuỳ chọn phụ.

---

## Auth Roles

| Role | Can do | Cannot do |
|------|--------|-----------|
| **USER** | Đặt câu hỏi (ẩn danh hoặc có tên), vote/react, xem danh sách & chi tiết câu hỏi, edit profile, quản lý notification settings của bản thân | Viết official answer, quản lý danh mục/văn phòng/người dùng, xem audit log, xem inbox của CC/Dept/LM |
| **MANAGER (CC Member)** | Mọi quyền của USER + tiếp nhận câu hỏi (CC inbox), viết official answer, chuyển tiếp câu hỏi đến phòng ban, pin câu hỏi, gán manager cho câu hỏi, edit câu hỏi đã được accept | Quản lý hệ thống (danh mục, văn phòng, user), xem audit log toàn hệ thống |
| **DEPARTMENT LEAD** | Xem inbox câu hỏi được forward đến phòng mình, soạn câu trả lời phòng ban | Quản lý hệ thống, can't publish trực tiếp (cần LM duyệt) |
| **LM (Line Manager)** | Review câu trả lời từ CC/Dept, approve hoặc reject với lý do, xem LM inbox | Không tạo câu trả lời mới, không quản lý hệ thống |
| **ADMIN** | Mọi quyền + quản lý danh mục (category), văn phòng (office), người dùng (role, activate/deactivate), cấu hình S-Ask, xem audit log, xem contact points | (Không bị giới hạn) |

---

## Testing Strategy

**Focus areas:**
- `functional` — Luồng đặt câu hỏi → duyệt → publish là core flow, cần coverage kỹ nhất.
- `security` — Role-based access (người dùng thường không được vào CC/LM/Admin routes), ẩn danh đặt câu hỏi không được lộ tên.
- `ui` — Form validation (rich text editor, file upload), trạng thái loading/error/empty state.

**Mandatory coverage:**
- Mọi route/action chỉ dành cho ADMIN hoặc MANAGER PHẢI có test case với user không có quyền (expect 403 hoặc redirect).
- Mọi status transition của câu hỏi PHẢI có test case validate trạng thái hợp lệ (không thể nhảy từ DRAFT thẳng sang ACCEPTED).
- Form tạo câu hỏi PHẢI có test XSS trên trường title và content (rich text editor).
- Sau bất kỳ thao tác write (create/update/delete) nào, danh sách/detail PHẢI được refresh/hiển thị đúng data mới.

**Deprioritize / skip:**
- Skip kiểm tra cosmetic UI (màu sắc, font, khoảng cách) — handled bởi design review.
- Skip test login flow qua WSM SSO trực tiếp trong E2E — dùng test login API (`/api/login/test/[email]`) thay thế.
- Giảm priority cho các màn hình Data Migration (Feature 010) — đây là one-time operation.

---

## Global Business Rules

- **Soft-delete only:** Câu hỏi, danh mục, văn phòng, người dùng không bị xóa cứng, chỉ bị deactivate/ẩn.
- **Timezone & Timestamps:** Tất cả timestamps lưu UTC, hiển thị UTC+7 (Asia/Ho_Chi_Minh).
- **Pagination:** Default 20 items/page; max 100.
- **File uploads:** Lưu trên S3/MinIO. Accepted types check ở backend qua MIME type. URL trả về là presigned URL hoặc proxy qua `/api/images/[...path]`.
- **Anonymous posting:** User có thể ẩn danh khi đặt câu hỏi. Tên tác giả không hiển thị với USER thường; chỉ ADMIN/MANAGER mới xem được.
- **Reactions:** Polymorphic (UPVOTE, LIKE, LOVE, DISLIKE) — áp dụng chung bảng cho cả Question và Answer.
- **AuditLog:** Mọi action quan trọng (create/update/delete/role change/login) đều được ghi nhận.
- **UI Refresh:** Sau bất kỳ thao tác write nào (create/edit/delete/status change), list view/detail phải tự refresh hiển thị data mới.
- **Slack Bot (Feature 016):** Chỉ gửi notification khi cấu hình đủ `SLACK_BOT_TOKEN` và `SLACK_CC_CHANNEL_ID`. Cron job nhắc deadline chạy tự động: Dept (Thứ Năm 9AM), LM (Thứ Sáu 10:30AM) theo giờ Asia/Ho_Chi_Minh.
- **Test login:** Endpoint `/api/login/test/[email]` chỉ hoạt động khi `NODE_ENV !== 'production'`.

---

## Error Message Patterns

> Các validation error message theo chuẩn i18n (key trong `src/locales/vi.json` và `en.json`).

- Required field: `"Trường này là bắt buộc"` / `"This field is required"`
- Max length: `"Tối đa {n} ký tự"` / `"Must be {n} characters or less"`
- Min length: `"Tối thiểu {n} ký tự"` / `"Must be at least {n} characters"`
- Invalid format: `"Định dạng không hợp lệ"` / `"Invalid format"`
- Unique constraint: `"Đã tồn tại"` / `"Already exists"`
- Not found: `"Không tìm thấy"` / `"Not found"`
- Unauthorized: `"Bạn không có quyền thực hiện hành động này"` / `"You do not have permission to perform this action"`
- Status transition invalid: `"Trạng thái không hợp lệ cho thao tác này"` / `"Invalid status for this action"`
- File too large: `"File vượt quá kích thước cho phép"` / `"File exceeds the maximum allowed size"`
