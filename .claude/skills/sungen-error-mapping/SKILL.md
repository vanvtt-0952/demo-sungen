---
name: sungen-error-mapping
description: 'Error diagnosis and fix strategy — systematic debugging flow, error patterns, fix priorities. Auto-loaded during run-test.'
user-invocable: false
---

## Diagnosis Flow (before fixing anything)

**Step 1: Read the error** — extract: error type, element name, expected vs actual, file:line.

**Step 2: Read error context** — check `test-results/` for the snapshot at failure time. This shows the exact page state when the test failed — more reliable than re-navigating with MCP.

**Step 3: Compare** — match the failing selector against the snapshot. Ask:
- Does the element exist on the page?
- Does the accessible name match exactly?
- Are there multiple matches (strict mode)?
- Is the element inside an iframe or dialog?
- Is the page in the expected state (correct URL, loaded)?

Then choose the fix from the patterns below.

---

## Fix Priority (try in order)

1. **Auth issue** — page redirected to login? Fix auth first, everything else is noise
2. **Element not found** — wrong name/type/value in selectors.yaml. Re-snapshot, copy exact name
3. **Multiple matches** — add `nth`, `exact: true`, or `scope` to narrow down
4. **Wrong assertion** — `toHaveText` vs `toHaveValue` mismatch, wrong expected data
5. **Timing** — SPA not loaded, async content. Add `wait for` step in .feature

---

## Playwright Errors

### Selector errors → fix in `selectors.yaml`

| Error | Diagnosis | Fix |
|---|---|---|
| strict mode violation | Multiple elements match | Add `nth: 0`, `exact: true`, or more specific `name` |
| Timeout / not found | Element doesn't exist or name wrong | Re-snapshot → copy exact accessible name. Check iframe/dialog scope |
| Element is not an input | Wrong element type targeted | Change `type` or `value` to match actual element |
| not a select | Custom dropdown, not native `<select>` | Set `variant: 'custom'` |
| Frame not found | iframe selector wrong or doesn't exist | Fix `frame` value, verify iframe in snapshot |

### Assertion errors → fix in `test-data.yaml` or `.feature`

| Error | Diagnosis | Fix |
|---|---|---|
| toHaveText mismatch | Expected text differs from actual | Fix value in test-data. If element is input type → change Gherkin type to `field`/`textarea` (triggers `toHaveValue` instead) |
| toHaveValue mismatch | Expected value differs from actual | Fix value in test-data |
| toContainText mismatch | Partial text not found | Fix expected partial text in test-data |
| toBeVisible timeout | Element exists but hidden, or name wrong | Check: is element conditionally visible? Wrong name? Inside dialog? |
| toHaveCount mismatch | Row count differs | Fix expected count in test-data. Verify: is table loaded? Filtered? |

### Assertion type rule

Sungen picks assertion based on element type:
- **Input** (`field`, `textarea`, `search`, `dropdown`, `slider`) → `toHaveValue()`
- **Text** (everything else: `message`, `heading`, `label`, `row`) → `toHaveText()`
- **Partial** (`contains` keyword) → `toContainText()`

If `toHaveText` fails on an input → the Gherkin step has wrong target type. Fix: change type in `.feature`.

---

## Table-Specific Errors

| Error | Diagnosis | Fix |
|---|---|---|
| `tableRow is not defined` | Column assertion without preceding row scope step | Add `User see [Ref] row in [Table] table with {{v}}` before `User see [Col] column with {{v}}` |
| `toHaveText` on cell fails (with columns) | Wrong column index in `columns` config | Re-count columns in snapshot (0-indexed). Fix `index` in selectors.yaml |
| `toBeVisible` on cell fails (no columns) | `filter({ hasText })` didn't match | Check exact cell text in snapshot. Fix value in test-data |
| Row filter matches 0 rows | Filter text doesn't match any row content | Re-snapshot → find actual row text. Fix filter value in test-data |
| Row filter matches multiple rows | Filter text is too generic (matches multiple rows) | Use more specific filter text (unique identifier like email, ID) |
| Table not found | Wrong table name or table not rendered | Re-snapshot → copy exact table accessible name |

---

## Auth Errors

| Symptom | Fix |
|---|---|
| Redirect to login page | Auth expired. Ask user to log in manually via MCP browser |
| `storageState` file not found | Ask user to log in manually via MCP browser, then save storage state |
| Most tests timeout on first step | Auth expired — ask user to re-authenticate via MCP browser |
| Page shows home instead of target | SPA + expired auth. Re-authenticate + add `wait for` step |

**Never use `sungen makeauth`.** Always let the user log in manually via the MCP browser.

---

## Sungen Compile Errors

| Error | Fix |
|---|---|
| Unknown step pattern | Rewrite step to match `sungen-gherkin-syntax` patterns |
| Missing selector | Add key to `selectors.yaml` |
| Missing variable | Add key to `test-data.yaml` |
| Invalid selector type | Use: role/testid/placeholder/label/text/locator/page/upload/frame |

---

## Flow-Specific Errors

| Error | Diagnosis | Fix |
|---|---|---|
| Navigation timeout between screens | Cross-screen transition takes too long or URL mismatch | Add explicit `wait for page` step between screen transitions in `.feature`. Verify target URL path |
| Selector `"screen:element"` not found | Namespace key missing or wrong format | Ensure colon-namespaced key in `selectors.yaml` is **quoted**: `"login:submit":`. Check screen prefix matches `[Screen:Element]` ref in Gherkin |
| Test data `screen.key` undefined | Phase namespace mismatch | Verify `test-data.yaml` uses dot-namespaced keys: `login.email`, `submission.nominee`. Keys must match `{{screen.key}}` refs in `.feature` |
| State lost between screens | Auth/session expired during multi-screen flow | Ensure all screens in the flow share the same `@auth:role` tag. Check if the app invalidates sessions on navigation |
| Duplicate selector key across screens | Two screens use same element name without namespace | Always use `[Screen:Element]` format in flow `.feature`. Selectors must use `"screen:element":` quoted keys |

---

## Performance & Infrastructure Errors → Fix in `specs/base.ts`

All generated `.spec.ts` import from `specs/base.ts` — shared context caching, navigation, overlay cleanup. AI **can and should** tune `base.ts` to match the project.

| Symptom | Root cause | Fix |
|---|---|---|
| Server 429 (rate limited) | Too many browser contexts | Fix `contextCache` to reuse sessions per `storageState` |
| Tests slow with `--workers=1` | Redundant navigation | Fix goto patch: skip if `currentPath === url` |
| Previous test's modal blocks next | Overlay not cleaned up | Add/improve Escape + backdrop click in cleanup hook |
| All tests fail on first navigation | `page.url()` is `about:blank` | Add try/catch in goto patch |
| Flaky timeouts on SPA pages | Default timeout too short for app | Increase `actionTimeout` / `navigationTimeout` |
| Tests pass individually but fail in batch | Shared state leaking between tests | Isolate context per test or reset state in `beforeEach` |

### What AI CAN fix in `base.ts`

- Timeout tuning (increase for slow APIs, decrease for fast apps)
- Custom overlay/modal dismiss logic (project has unique close patterns)
- Navigation wait strategy (`networkidle` vs `domcontentloaded` vs custom)
- Context caching strategy (per-role, per-session)
- Cookie/localStorage cleanup between tests

### What AI should NOT move into `base.ts`

- Individual selector fixes → belong in `selectors.yaml`
- Test data values → belong in `test-data.yaml`
- Single-test workarounds → belong in the `.spec.ts` directly

---

## Smart Fix Strategy

### When multiple tests fail on the same element
Fix the **root cause once** — don't fix each test individually. Group by selector key, fix selectors.yaml, recompile, re-run batch.

### When you're unsure about the fix
**Re-snapshot** — `browser_navigate` to the failing page, take `browser_snapshot`, compare the live state against what the test expects. This is faster than guessing.

### When the fix might break other tests
After fixing selectors.yaml, run ALL tests (not just the failing one) to catch regressions from renamed/changed selectors.

### When nothing works after 3 attempts
Ask the user. The issue might be: dynamic content, race condition, environment-specific state, or a real application bug.
