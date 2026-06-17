@parallel @auth:user
Feature: contact-points Screen

  As an authenticated Sun* employee
  I want to view the contact points list
  So that I can identify the right department contact person per office location
  Path: /vi/contact-points

  # Viewpoint skip decisions (test-viewpoint.md):
  # VP-VAL: Skip — read-only screen, no input fields or validation rules
  # VP-LOGIC: Skip — no client-side business logic
  # Global Header (nav, notifications, language, logout): covered by Global Header suite
  # Logout: part of Global Header suite — not tested here

  Background:
    Given User is on [contact-points] page

  # --- Section: Contact Points Table — VP-UI (Tier 1) ---

  @high
  Scenario: VP-UI-001 Bảng hiển thị đúng với tiêu đề trang khi tải
    # Source: VP-UI — Bảng hiển thị đúng cấu trúc (test-viewpoint.md > Priority Viewpoints)
    When User wait for [Contact Points Table] table is visible
    Then User see [Page Title] header with {{page_title}}
    And User see [Contact Points Table] table

  @high
  Scenario: VP-UI-002 Bảng hiển thị đủ 5 cột khi tải
    # Source: VP-UI — Bảng hiển thị đúng cấu trúc (test-viewpoint.md > Priority Viewpoints)
    # NOTE: 2-level colspan ("Liên lạc" spanning DaNang/HCMC/Hanoi) is DSL limitation — verify via DevTools (th[colspan=3])
    When User wait for [Contact Points Table] table is visible
    Then User see [Contact Points Table] table
    And User see [Liên lạc] column in [Contact Points Table] table
    And User see [Vị trí] column in [Contact Points Table] table
    And User see [Vấn đề] column in [Contact Points Table] table
    And User see [DaNang Office] column in [Contact Points Table] table
    And User see [HCMC Office] column in [Contact Points Table] table
    And User see [Hanoi Office] column in [Contact Points Table] table

  # --- Section: Auth — VP-AUTH (Tier 1) ---

  @high @no-auth
  Scenario: VP-AUTH-001 Session required — unauthenticated direct access is redirected
    # Source: VP-AUTH-1 — Screen yêu cầu đăng nhập (test-viewpoint.md > Priority Viewpoints)
    # Redirect target: /vi/auth (login page — selector key avoids "login" to prevent catalog page-type false positive)
    Then User see [Auth] page
    And User see [Contact Points Table] table is hidden
    # ^ Contact-points table absent on /vi/login — contrast assertion: if redirect fails and table stays
    #   visible, isHidden() returns false and this step FAILS (provides real test signal)

  # --- Section: Data Display — VP-DATA (Tier 1) ---

  @high @manual
  Scenario: VP-DATA-001 Ô chứa nhiều tên hiển thị đầy đủ không truncate
    # Source: VP-DATA — Ô nhiều tên hiển thị đầy đủ (test-viewpoint.md > Edge Cases + Priority Viewpoints)
    # MANUAL: Cannot assert exact DB values — data loaded from division table at runtime
    # Tester verifies:
    #   1. Setup: Authenticated session established via Background (@auth:user, user-test-e2e@s-ask.com)
    #   2. Action: Navigate to /vi/contact-points; wait for table to load
    #   3. Action: Find a cell with multiple names (C&B rows have 2+ contacts per spec snapshot)
    #   4. Observable: All names visible in full — no "..." truncation; names separated by newline
    #   5. Oracle: Visual inspection + DevTools computed style (overflow:hidden / text-overflow:ellipsis)
    Then User see [Contact Points Table] table
    And User see [Multi-name Contact Cell] cell
    # ^ Selector targets cells with newline-separated names (created during run-test)
    #   Existence check only — actual no-truncation verified via oracle above

  @normal
  Scenario: VP-DATA-003 Ô dash placeholder tồn tại trong bảng liên hệ
    # Source: test-viewpoint.md > Edge Cases > Ô không có contact ("–")
    Then User see [Contact Points Table] table
    And User see [No Contact Cell] cell with {{no_contact_placeholder}}

  @normal @manual
  Scenario: VP-DATA-002 Bảng rỗng hiển thị đúng mà không lỗi khi DB không trả dữ liệu
    # Source: test-viewpoint.md > Edge Cases > Bảng rỗng
    # SPEC-GAP: No documented behavior for empty-table state in spec.md — verify with dev
    # MANUAL: Requires DB-level setup (empty division table or mocked API response)
    # Tester verifies:
    #   1. Setup: Configure DB to return 0 rows for division table BEFORE navigating
    #            (Background's User is on [contact-points] page will land on empty table)
    #   2. Action: Navigate to /vi/contact-points as authenticated user
    #   3. Observable: Page renders; table is empty or shows empty-state placeholder; no JS errors
    #   4. Oracle: Visual inspection + browser console (no uncaught exceptions)
    Then User see [Contact Points Table] table is empty
