---
name: sungen-selector-fix
description: 'Selector fixing strategy — phased execution, priority-first diagnosis, targeted MCP exploration. Auto-loaded by run-test command.'
user-invocable: false
---

## Strategy: Phased Execution

Run tests in priority waves — catch fundamental issues early, fix critical paths first, let shared fixes cascade to lower-priority tests.

**Never run all tests blindly.** Always start with selector pre-generation, then a smoke check.

---

## Phase 0: Pre-run Selector Generation (Playwright MCP)

**Before any `sungen generate` or test run**, populate `selectors.yaml` from the live page so tests don't fail on missing keys in Phase 1.

### When to run Phase 0

- `selectors.yaml` missing, empty, or contains only the page selector
- The `.feature` file has `[Reference]` keys without corresponding YAML entries and the referenced element can't be auto-inferred (see `sungen-selector-keys` § Auto-Infer)
- User explicitly re-scans after UI changes

If existing selectors already cover the feature file, **skip Phase 0** and go straight to compile + Phase 1.

### Flow Mode: Screen Selector Reference

When running Phase 0 for a **flow** (`qa/flows/<name>/`), check existing screen selectors first before snapshotting live pages. Screen selectors are already verified and proven — reuse them to save time and reduce errors.

**Steps (before the standard Phase 0 steps):**

1. **Parse screen references**: read the `.feature` file for `[Screen:Element]` references. Group by screen name (e.g., `Login`, `Awards`, `Dashboard`).
2. **For each referenced screen**, check `qa/screens/<screen>/selectors/<screen>.yaml`:
   - **If exists** → copy matching entries to the flow's `selectors.yaml`, remapping keys to namespace format:
     - Screen key `submit` with screen `login` → flow key `"login:submit"`
     - Screen key `email-field` with screen `login` → flow key `"login:email-field"`
     - Preserve the full selector definition (type, value, name, etc.)
     - Mark these entries as **verified** (no `@needs-live-verify` comment needed)
   - **If not found** → add this screen to the "needs live snapshot" list
3. **Elements not found in any screen selector** → also added to the "needs live snapshot" list
4. **If "needs live snapshot" list is empty** → Phase 0 screen-reference covered everything, skip to compile
5. **If "needs live snapshot" list is non-empty** → continue with the standard Phase 0 steps below, but only generate selectors for the missing elements (don't re-snapshot elements already copied from screens)

**Merge rule**: screen-referenced entries take priority over provisional (Figma-sourced) entries. If an element was previously generated from Figma with `@needs-live-verify`, the screen-verified entry replaces it.

**Important**: flow selectors remain private — they live in the flow's own YAML file. This is just initialization from screen data, not a runtime dependency.

### Steps

1. **Confirm with the user** via `AskUserQuestion`: *"Generate selectors from the live page via Playwright MCP now?"* — offer **Yes, scan live page** / **Skip (use existing selectors.yaml)** / **Cancel**.
2. **Collect references**: parse the `.feature` file for every `[Reference]` element + its type (e.g. `[Submit] button`, `[Email] field`). Deduplicate.
3. **Ensure page selector**: if missing, ask user for URL path and write it first.
4. **Navigate**:
   - Read `baseURL` from `playwright.config.ts`.
   - `browser_navigate` to the page URL.
   - If redirected to login → run **Phase 0.5: Auth Persistence** first (see below), then re-navigate to the target page.
5. **Snapshot**: Wait for the page to fully load before snapshotting.
   - Check if the page is still loading (spinner visible, skeleton placeholders, empty table with 0 rows). If so, use `browser_wait_for` to wait until content is rendered.
   - Then take **ONE** `browser_snapshot`. All Phase 0 selectors come from this single snapshot.
6. **Generate YAML entries**:
   - Keys: follow `sungen-selector-keys` (lowercase, Unicode preserved, `--type` / `--N` suffixes).
   - Selector priority: follow the table in **Diagnosis & Fix § Step 3** (`testid` > `role`+name > `label` > `placeholder` > `text` > `locator` CSS last resort).
   - Copy names **character-for-character** from the snapshot. Never infer from the Gherkin label.
   - If an element is auto-inferable per `sungen-selector-keys` § Auto-Infer, **omit it** from YAML — keep the file minimal.
   - **i18n sites**: if the site supports multiple languages, use `{{variable}}` in `name`/`value` fields instead of hardcoded text. Add corresponding `lbl_*` keys to `test-data.yaml` + locale overlay files (see `sungen-selector-keys` § i18n).
   - **Selector quality rule**: the Playwright MCP accessibility tree snapshot gives you roles and accessible names directly — use them. Do NOT write XPath or class-based CSS selectors. Only write `type: locator` when no role/text/label/placeholder/testid is available, and restrict the CSS to `#id` or `[data-*]` / `[aria-*]` attribute selectors.
6b. **Cross-verify Gherkin labels vs snapshot** (prevents the #1 production failure):
   - For **every** `[Reference]` in the `.feature` that will rely on auto-infer (not written to YAML), check the snapshot:
     - `[X] button` — is there a button with accessible name **exactly** `X`?
     - `[X] field` — does an input have placeholder **exactly** `X`? Does it even have a placeholder?
     - `[X] heading` / `text` / `message` — is that text literally visible in the snapshot?
   - If any mismatch → write an explicit YAML entry using the real DOM name. Do not leave a mismatch to be caught at runtime.
   - **Typical mismatch cases**: Gherkin uses English label (`[Submit]`) but app displays Vietnamese (`"Gửi"`); placeholder is descriptive (`"Nhập email của bạn"`) not a bare field name (`"Email"`); button text includes an icon glyph before/after the word.
7. **Substring ambiguity check**: for each `role` + `name` selector, check if any other element in the snapshot has a name that **contains** this name as a substring (e.g., `"Đăng ký"` vs `"Đăng ký bằng Google"`). If yes → add `exact: true` to prevent strict mode violation at runtime.
8. **Merge, don't overwrite**: preserve the page selector and any user-authored entries in `selectors.yaml`. Only add missing keys.
9. **Show summary + confirm**: list the keys that will be added, ask the user to approve, then write the file.
10. **Compile**: **Screen**: `sungen generate --screen <screen>`. **Flow**: `sungen generate --flow <flow>`. Then proceed to Phase 1.

### Common Phase 0 pitfalls

- Writing keys inferred from the Gherkin label instead of the snapshot name → Phase 1 will fail with `No element found`.
- Skipping Phase 0.5 when an auth redirect happened → snapshot captures the login page, all selectors wrong.
- Taking snapshot while page is still loading (spinner visible, table empty) → selectors for dynamic content will be missing or wrong.
- Skipping step 6b for "simple" elements like buttons → silent mismatch between Gherkin label and DOM name fails at runtime.
- Using `browser_evaluate` alone to scrape cookies → misses httpOnly session cookies. Always use `browser_storage_state` (or the `browser_run_code` fallback).
- Writing XPath or class-based CSS selectors → breaks on DOM/style refactoring. Use role/testid/text/label/placeholder from the accessibility tree.
- Falling back to `locator: 'div.some-class > span'` when the element IS visible in the accessibility snapshot with a role + name → the snapshot gives you `getByRole` for free; use it.
- Overwriting user-authored selectors → always merge.

---

## Phase 0.5: Auth Persistence (MCP alternative to `sungen makeauth`)

Capture an authenticated session from the MCP browser into `specs/.auth/<role>.json` — the same path `sungen makeauth` writes to, which compiled tests already reference via `test.use({ storageState })` based on `@auth:<role>` tags. No `playwright.config.ts` edits needed. Run once per auth lifetime, not on every selector fix.

### When to run Phase 0.5

- Phase 0 navigation hit a login redirect and `specs/.auth/<role>.json` is missing or expired
- A scenario tagged `@auth:<role>` is about to run and its auth file is absent
- User asks to refresh auth

Skip if `specs/.auth/<role>.json` already exists and a probe navigation reaches an authenticated page without redirecting to login.

### Steps

1. **Resolve the role**:
   - Look at the `.feature` file for `@auth:<role>` tags (feature-level or scenario-level). Pick the role for the scenario being run. If no tag exists, default to `user`.
   - Target file: `specs/.auth/<role>.json`. Create `specs/.auth/` if missing.
   - If the file already exists → use `AskUserQuestion` to confirm overwrite (mirrors the `(y/N)` prompt in `sungen makeauth`).
2. **Navigate to login**:
   - Read `baseURL` from `playwright.config.ts` (fall back to `APP_BASE_URL` env, then `http://localhost:3000` — same resolution order as `sungen makeauth`).
   - `browser_navigate` to `<baseURL>/login`. If the app uses a different login path, ask the user.
   - If the URL doesn't stay on `/login` after load → user is already signed in. Skip step 3.
3. **Ask the user to log in manually** in the MCP browser (username, password, MFA, SSO — whatever the app needs). Never type credentials via `browser_type` or script the login. Wait for the user to confirm in chat that they're signed in.
4. **Verify login** — check the current URL or take a `browser_snapshot`; confirm the page is no longer on `/login`.
5. **Export storage state** (preferred → fallback):
   - **Preferred** — `browser_storage_state` with `filename: "specs/.auth/<role>.json"` (native Playwright MCP tool; captures cookies including httpOnly + localStorage + sessionStorage via the Playwright context — same output format as `context.storageState({ path })` used by `sungen makeauth`).
   - **Fallback** — if `browser_storage_state` isn't available in this MCP version, use `browser_run_code` to execute `await context.storageState({ path: 'specs/.auth/<role>.json' })`.
   - **Do NOT** use `browser_evaluate` for auth export — it misses httpOnly cookies and session auth will fail silently.
6. **Gitignore** — ensure `specs/.auth/` (or `specs/.auth/*.json`) is in `.gitignore`. Add it if missing.
7. **Return to Phase 0 step 4** — re-`browser_navigate` to the target page; the session is now active.

### Phase 0.5 pitfalls

- Writing to a path other than `specs/.auth/<role>.json` → compiled tests won't find the file. Always match `sungen makeauth`'s convention.
- Committing `specs/.auth/*.json` → leaks a live session. Always gitignore.
- Scripting the login with `browser_type` → bypasses MFA/CAPTCHA and risks account lockout. Always manual.
- Running Phase 0.5 on every `run-test` invocation → unnecessary; reuse the file until tests start redirecting to login.
- Mismatch between `<role>` in the auth file and `@auth:<role>` tag → compiled tests reference a nonexistent file.

---

## Phase 1: Smoke Check (catch fundamentals)

Run **up to 5 scenarios** — pick the first `@high` scenarios in the feature file.

```bash
npx playwright test --grep "VP-.*-001|VP-.*-002|VP-.*-003|VP-.*-004|VP-.*-005" --reporter=line
```

**Purpose:** Detect broken fundamentals before running 50+ tests:
- Page selector wrong → ALL tests would fail (1 fix, not 50 diagnoses)
- Auth redirect → need `@no-auth` or user login
- Base `@steps:` scenario broken → all `@extend:` scenarios would fail

**If all 5 pass** → skip to Phase 2.
**If failures** → diagnose and fix (see Diagnosis & Fix below), then re-run smoke. Max 2 attempts here.

---

## Phase 2: Priority Wave (@high)

Run all `@high` scenarios:

```bash
npx playwright test --grep "@high" --reporter=line
```

If your Playwright config doesn't support tag grep, use scenario name grep from the feature file — collect VP IDs of `@high` scenarios.

**Fix only failures from this wave.** Most shared selectors (buttons, headings, navigation) get fixed here because critical/high scenarios exercise them.

Max 2 fix attempts in this phase.

---

## Phase 3: Full Run (@normal + @low)

Run remaining scenarios:

```bash
npx playwright test --reporter=line
```

Many selectors already fixed from Phase 2 (shared elements). Only diagnose **new** failures — selectors that only appear in lower-priority scenarios.

Max 1 fix attempt. If `@low` scenarios still fail after fix → **report and move on**, don't loop.

---

## Phase 4: Regression

One final full run to confirm all phases together:

```bash
npx playwright test --reporter=line
```

Report results. Do NOT enter another fix loop here.

---

## Diagnosis & Fix (used in each phase)

### Step 1: Parse Failures

| Error pattern | Root cause | Fix target |
|---|---|---|
| `No element found` / `strict mode violation` | Selector mismatch | `selectors.yaml` |
| `toBeVisible` timeout | Wrong name or missing element | `selectors.yaml` |
| `toHaveText` / `toHaveValue` mismatch | Wrong expected data | `test-data.yaml` |
| `page.goto` error | Wrong URL | page selector in `selectors.yaml` |
| `frame` error | Element inside iframe | add `frame` field |

**Group by root cause** — if 5 tests fail because `[Submit]` button has a different name, that's 1 fix, not 5.

**Check `test-results/` first** — Playwright captures failure screenshots automatically. Use these to diagnose before any MCP exploration.

### Step 2: Targeted MCP Exploration

Only when `test-results/` screenshots are insufficient:

1. Read `baseURL` from `playwright.config.ts`
2. `browser_navigate` to target page
3. If redirected to login → run **Phase 0.5: Auth Persistence**, then re-navigate
4. Take **ONE** `browser_snapshot` — fix all broken selectors from this single snapshot

Never use `browser_evaluate` to inject or read cookies (misses httpOnly). For auth, use Phase 0.5 or `sungen makeauth`.

### Step 3: Fix Broken Selectors

Selector priority (use first applicable):

| Priority | type | When |
|---|---|---|
| 1 | `testid` | `data-testid` or any stable test attribute exists |
| 2 | `role` + exact name | Interactive elements with an accessible name |
| 3 | `label` | Form field with a visible `<label>` |
| 4 | `placeholder` | Input/textarea with a placeholder attribute |
| 5 | `text` | Static visible text content |
| 6 | `locator` (CSS) | Last resort — `#id` or `[attr=value]` **only** (see restrictions below) |

> ⚠️ **Playwright best practice** ([source](https://playwright.dev/docs/best-practices#use-locators)): user-facing locators (`role`, `label`, `text`, `placeholder`, `testid`) are resilient to refactoring and far less likely to break. CSS class selectors and XPath break whenever a developer renames a class or restructures the DOM — even without changing the UI.
>
> **Never write these in `selectors.yaml`**:
> - XPath: `xpath=//div[@class='...']` or `//button[contains(@class,'btn')]`
> - Class-based CSS: `div.btn-primary`, `.modal-footer > .submit-btn`
> - Deep structural CSS: `div:nth-child(3) > ul > li > button`
>
> **Acceptable CSS (last resort only)**:
> - Stable `id`: `#submit-button` (only if the id is truly stable and not dynamic)
> - Data attributes: `[data-id="123"]`, `[aria-controls="menu"]`
> - Input type: `input[type="file"]` (when no testid/label exists)

**Exact name rule**: copy name character-for-character from snapshot. Never infer from Gherkin label.

Check for `data-testid` attributes if role-based matching fails:
```js
Array.from(document.querySelectorAll('[data-testid]'))
  .map(e => ({ testid: e.dataset.testid, tag: e.tagName, text: e.textContent.trim().slice(0, 60) }))
```

Common fixes:
- Name mismatch → copy exact name from snapshot
- Multiple matches → add `nth` or `exact: true`
- Substring ambiguity (e.g., `"Submit"` matches `"Submit"` and `"Submit & Continue"`) → add `exact: true`
- No accessible name → use `testid`; only fall back to `locator` CSS as last resort
- Element in iframe → add `frame` field
- Dynamic content → use `testid` or `role` + `nth`

### Step 4: Recompile After Fix

Always recompile before re-running:
```bash
# Screen
sungen generate --screen <screen>

# Flow
sungen generate --flow <flow>
```

Then re-run only the current phase's failing tests, not all tests.

---

## Common Failure Patterns

Quick reference for the most frequent production failures:

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| `No element found` on button/link/heading | Gherkin `[Reference]` label ≠ DOM accessible name (different language or text) | Write explicit YAML: `type: role, value: button, name: "<exact DOM name>"` |
| `No element found` on `[X] field` | Field has no placeholder, or placeholder ≠ X | Write explicit YAML: `type: label, value: "Actual label"` or `type: placeholder, value: "Actual placeholder"` |
| `No element found` on `[X] text` / `message` | Visible text differs from Gherkin label, or text is dynamic | Write explicit YAML or use `{{variable}}` for dynamic content |
| `strict mode violation` | Multiple elements match the same name/text | Add `exact: true` to YAML entry, or add `nth` |
| `toBeVisible` timeout on dynamic content | Snapshot was taken while page was still loading | Wait for spinner/skeleton to clear before snapshotting; add `browser_wait_for` |
| All tests fail with page navigate error | Page selector URL wrong or baseURL mismatch | Re-check `playwright.config.ts` `baseURL` and page selector `value` path |
| Auth redirect on every test | `specs/.auth/<role>.json` missing or expired | Run Phase 0.5 to capture fresh session |
| Table row assertions fail | `columns` config has wrong indices | Count column headers left-to-right (0-indexed) from snapshot |
| Wrong text assertions on locale page | Hardcoded Vietnamese/English text in YAML `name`/`value` | Use `{{lbl_*}}` variables with locale overlay files |
| Element inside iframe not found | `frame` field missing in YAML entry | Add `frame: "iframe[src*='...']"` to the selector entry |
| Selector breaks after UI redesign with no functional change | CSS class or XPath used — brittle to style refactoring | Rewrite with `role`/`testid`/`label`/`text` from accessibility snapshot |

---

## Table Selectors

For table patterns, add table selectors with `columns` config:

```yaml
users:
  type: 'role'
  value: 'table'
  name: 'Users'
  columns:
    username:
      index: 0
      header: 'Username'
    email:
      index: 1
      header: 'Email'
    status:
      index: 2
      header: 'Status'
```

**How to build `columns`**: count column headers in snapshot (left to right, 0-indexed). Map each `[Col] column` reference from feature file to its index.

---

## Detail Screens with Dynamic IDs

For screens like `/admin/users/:id`:
1. Navigate to list page via MCP to find a real record ID
2. Hardcode the ID in page selector

```yaml
user detail:
  type: 'page'
  value: '/admin/users/de42d800-0f5a-490e-9dcf-344fedbd34a5'
```

---

## Attempt Budget Summary

| Phase | What runs | Max fix attempts | On failure after max |
|---|---|---|---|
| 0. Pre-gen | Playwright MCP snapshot → write selectors.yaml | 1 snapshot | Ask user — skip or retry navigation |
| 0.5. Auth | Manual login in MCP browser → `browser_storage_state` → `specs/.auth/<role>.json` | 1 login | Ask user — retry login or fall back to `sungen makeauth` |
| 1. Smoke | First 5 @high | 2 | Ask user — fundamentals broken |
| 2. Priority | All @high | 2 | Report failures, continue to Phase 3 |
| 3. Full | All tests | 1 | Report @low/@normal failures, continue |
| 4. Regression | All tests | 0 | Report final results |

**Total worst case: 5 fix attempts** (2+2+1), not unbounded loops. Phases 0 and 0.5 don't count toward fix budget.
