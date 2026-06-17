# contact-points Screen Specification

## Overview
- **URL Path:** /vi/contact-points
- **Live URL:** https://ask.awesome-services.net/vi/contact-points
- **Figma URL:** <!-- optional -->
- **Auth Required:** yes (session cookie + HTTP Basic Auth: BASIC_AUTH_USER/BASIC_AUTH_PASS từ .env.qa file)
- **Platform:** web
- **Page Title:** Danh sách điểm liên hệ

## Sections

### Section: Header / Navigation Bar
- **Type:** navigation
- **Description:** Sticky top bar shared across all pages.

#### Elements
| Element | Type | Content / Behavior |
|---------|------|--------------------|
| S-Ask logo | link | Navigates to `/` (home) |
| Trang chủ | nav link | Navigates to `/` |
| Điểm liên hệ | nav link | Navigates to `/contact-points` (active page) |
| Notifications bell | button | Shows notification badge (e.g. "99+"); opens notification panel on click |
| User info button | button | Shows username "User Test" and email; possibly opens account menu |
| Language switcher | button | Shows 🇻🇳 flag; toggles locale (vi/en/ja) |
| Đăng xuất | button | Logs the user out and redirects to login/home |

### Section: Contact Points Table
- **Type:** table
- **Description:** Read-only reference table listing company departments, issues/topics, and their corresponding contact persons per office location. No sorting, filtering, pagination, or interactive row actions — pure display.

#### Table Structure
Multi-level header:
- **Row 1:** Vị trí | Vấn đề | Liên lạc
- **Row 2 (under Liên lạc):** DaNang Office | HCMC Office | Hanoi Office

So the table has **5 effective columns**: Department (Vị trí), Topic (Vấn đề), Contact-DaNang, Contact-HCMC, Contact-Hanoi.

#### Table Data — Departments & Topics
> **Data source:** Rows are loaded dynamically from the `division` database table — department names, issue topics, and contact person names are NOT hardcoded. Do NOT assert exact text values in test cases. Instead assert structural properties: table has at least 1 row, each row has 5 cells (Vị trí, Vấn đề, DaNang, HCMC, Hanoi), the table is visible and non-empty.

Current snapshot (for reference only — values may change as DB data changes):
| Department (Vị trí) | Example Issues (Vấn đề) |
|---|---|
| Compensation & Benefit (C&B) | Bảo hiểm xã hội, Phúc lợi & Quy định công ty, Mã số thuế, Hợp đồng lao động, Timesheet, Payroll, Công đoàn |
| Culture & Communication (C&C) | Câu lạc bộ, Hòm thư góp ý, Sự kiện nội bộ, Sun*News |
| Finance & Accounting (F&A) | Doanh thu/hợp đồng, Chuyển khoản nhà cung cấp, Chuyển khoản nhân viên, Công tác phí, Tạm ứng tiền mặt |
| General Affairs (GA) | Bảo hiểm Aon, Đặt phòng họp, Đặt xe, In ấn, Quản lý tài sản, Vận hành văn phòng, Thủ tục công tác, Tìm nhà người Nhật, Văn phòng phẩm, Vệ sinh VP, Vé xe, Xin visa Nhật |
| Human Resource Business Partner (HRBP) | Phụ trách chung nhân sự tại CEV |
| Infra Support | Infra Support |
| ISO | Quản lý quy trình |
| Learning & Development (L&D) | Đào tạo nội bộ, Quy chế đào tạo, Tài trợ học tập, Thưởng GVNB |
| Legal | Các vấn đề pháp lý |
| Organization Design (OD) | Tư vấn IDP và career path |
| Risk Management (LRM) | Quản trị rủi ro |
| Talent Acquisition (TA) | Chế độ giới thiệu nhân sự (Referral Policy) |

#### Actions
> **Inherit from Global Header** — Navigation links (Trang chủ, Điểm liên hệ), Notifications button, Language switch, and Logout button are part of the shared Header/Navbar component. Do NOT generate test cases for these here — they are covered by the global header test suite.

#### States
| State | Condition | Visual |
|-------|-----------|--------|
| Default | Page load (authenticated) | Table displays all rows; no loading indicator observed |
| Unauthenticated | No session / expired cookie | Redirected to login or 401; table not displayed |
| Unauthenticated | User not logged in | Redirects to `/vi/login` |

## Business Rules
- The table is read-only — no add/edit/delete actions exist for regular users.
- Contact persons are organized by department group (Vị trí spans multiple rows).
- Some cells contain multiple contact names separated by newline (e.g. "Ms A\nMs B").
- Some cells contain "–" when no contact exists for that office.

## Accessibility
- Tab order: Logo → Trang chủ → Điểm liên hệ → Notifications → User info → Language switcher → Đăng xuất → (table is not interactive)
- Table has proper `<thead>` / `<tbody>` structure with `<th>` column headers.

## Notes
- Login via test API: `GET https://ask.awesome-services.net/api/login/test/{EMAIL_USER}` with Basic Auth sets `__Secure-next-auth.session-token` cookie.
- Test user: `user-test-e2e@s-ask.com`
- No pagination — all rows are rendered at once.
- No search or filter functionality on this page.
- Contact names in cells appear as plain text (no links to profiles observed).
- Notification badge shows "99+" indicating many unread notifications for the test account.
