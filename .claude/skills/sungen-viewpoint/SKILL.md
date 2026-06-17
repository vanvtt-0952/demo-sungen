---
name: sungen-viewpoint
description: '17 UI patterns x 4 viewpoints — structured checklist for test case
  generation and review. Auto-loaded by create-test and review commands.'
user-invocable: false
---

## How to use this skill

This skill is a **router**. The detailed checklists live in 5 group files — load only the ones relevant to the screen under test.

1. Read the **4 Viewpoints** and **Shared Checks** below (always).
2. Identify which UI patterns the screen contains, resolve any overlap via **Pattern selection** below, then read **only** the matching group file(s) from the routing table.
3. Generate Tier 1 (`@high`) scenarios first, then Tier 2 (`@normal` + `@low`). Apply each Shared Check **once per screen**, not once per pattern.

> All checklist items are written in English. Render scenario names, step text, and test IDs in English.

## Routing table

| UI element on the screen | Pattern | Read file |
|---|---|---|
| Plain input form (settings, profile, contact) | 1. Form & Inputs **(base)** | `group-a-data-entry.md` |
| File picker / drop zone | 2. File Upload | `group-a-data-entry.md` |
| Bulk import / export | 3. Import / Export | `group-a-data-entry.md` |
| "Add" / "Create" / "New" | 4. Create / Add | `group-b-data-ops.md` |
| "Edit" / pencil icon / inline edit | 5. Update / Edit | `group-b-data-ops.md` |
| "Delete" / trash icon | 6. Delete | `group-b-data-ops.md` |
| Rows + columns grid | 7. Data Table | `group-c-data-explore.md` |
| Search box / search bar | 8. Search | `group-c-data-explore.md` |
| Filter controls (dropdown, date range, checkboxes) | 9. Filter | `group-c-data-explore.md` |
| Card / list grid, infinite scroll, "Load More" | 10. List / Card View | `group-c-data-explore.md` |
| Charts / KPI cards / dashboard | 11. Chart / Analytics | `group-d-display.md` |
| Overlay panel on top of the page | 12. Modal / Dialog | `group-d-display.md` |
| Side menu / tabs / breadcrumb / top nav | 13. Navigation | `group-d-display.md` |
| Toast / snackbar / alert / banner | 14. Notification / Toast / Alert | `group-d-display.md` |
| Login form / logout button | 15. Login / Logout | `group-e-identity.md` |
| Sign-up form / SSO | 16. Register | `group-e-identity.md` |
| Forgot / reset / change password | 17. Password Management | `group-e-identity.md` |

## Pattern selection (precedence & inheritance)

A screen often matches several patterns at once — a login screen is *both* a form and an authentication flow. Use these rules so the choice is deterministic and scenarios are never duplicated:

1. **Most specific wins.** Pick the most specialized pattern as the screen's primary section. Auth and CRUD forms route to their specific pattern, NOT to Form & Inputs:
   - Login/logout → **15**, sign-up → **16**, forgot/reset/change password → **17**
   - Create form → **4**, edit form → **5**
2. **Form & Inputs (1) is a BASE pattern, not a sibling.** Generate it as its own section only for a plain form with no more-specific role (settings, profile, contact). When a specialization applies, do NOT also create a separate "Form & Inputs" section.
3. **Inheritance.** A specialized form pattern (4, 5, 15, 16, 17) **inherits** Form & Inputs field-level validation (required, format, maxlength, whitespace, real-time error clear) and adds its own rules. Apply the inherited checks inside the specialized section — generate each check once, never twice.
4. **Genuinely parallel pairs** — these cover different concerns; choose per the table:

   | If the screen has… | Decision |
   |---|---|
   | A grid of records | Pick **7. Data Table** *or* **10. List/Card** by layout (rows+columns → Table; cards/tiles/infinite-scroll → List/Card) — not both for the same surface |
   | Both a keyword box and filter controls | Apply **8. Search** *and* **9. Filter** (Search = free-text match; Filter = structured narrowing) + one combined AND-logic scenario |
   | A form rendered inside an overlay | Apply the form's pattern (1/4/5/15…) for fields/submit **and** **12. Modal/Dialog** for open/close/focus-trap/backdrop |

## 4 Viewpoints

| VP | Focus | Tag |
|---|---|---|
| **UI/UX** | Interface state, layout, visual feedback | VP-UI |
| **Data & Validate** | Input constraints, data integrity, error messages | VP-VAL |
| **Logic** | Business rules, interactions, state changes | VP-LOGIC |
| **Security** | Authentication, authorization, injection | VP-SEC |

**Classification rules:**
- VP-UI = state that is always true regardless of what the user does (element present, layout, label)
- VP-VAL = outcome depends on the input *value* (valid / invalid / boundary)
- VP-LOGIC = outcome depends on the user's *action* (click, submit, navigate)
- VP-SEC = checks access control and malicious input

---

## Shared Checks

Generate **once per screen**, do not repeat for each pattern.
Each pattern only points back with "Shared checks applied: [name]".

| Check | Condition → Expected | VP | Priority |
|---|---|---|---|
| **Loading State** | Data fetch in progress → spinner/skeleton shown, user cannot interact | UI | @normal |
| **Empty State** | Query returns 0 records → clear message shown, layout does not break | UI | @normal |
| **XSS** | Script tag entered into a field → rendered as literal text, not executed | SEC | @high |
| **SQL injection** | SQL payload entered into a field → DB unaffected, no data exposed | SEC | @high |
| **URL Manipulation** | URL params wrong/missing/out-of-range → fallback to default, no 500 crash | SEC | @high |

> **SQL injection — 2 layers for search/LIKE fields**: (1) field-level: UI blocks special chars → `@high` automated; (2) API-level: if the field reaches a LIKE query (search, partial-match), send `1 OR 1=1` straight to the API endpoint (bypassing the UI) → verify a parameterized query is used → `@high @manual`. Missing layer 2 = a real attack vector is overlooked even when field validation is correct.

---

## Security Tag Rules

For VP-SEC scenarios testing **unauthorized access** (no login, wrong role, direct URL):
- Use the **`@no-auth`** tag — runs without authentication to verify the redirect/block.
- Do NOT use `@manual` for these — they are automatable.

```gherkin
@high @no-auth
Scenario: VP-SEC-001 Unauthenticated user cannot access admin page
  Given User is on [Admin] page
  Then User see [Login] page
```

Use `@manual` only when the environment truly cannot be set up automatically.
