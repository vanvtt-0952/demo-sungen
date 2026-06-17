---
name: sungen-tc-review
description: 'Test case review — 7-dimension rubric (100 pts), Syntax gate + Coverage matrix. Auto-loaded by review command.'
user-invocable: false
---

## How to use this skill

Review one `.feature` (plus `selectors.yaml` + `test-data.yaml` if present) in 3 steps:

1. **Syntax Gate (Layer A)** — check Sungen syntax. On a hard-fail, return to the author; do NOT proceed to detailed scoring.
2. **Coverage Matrix (Layer B)** — map against Sun Common Checklist viewpoints; list the gaps.
3. **Scoring (Layer C)** — score the 7-dimension/100-pt rubric. Layers A and B are *how* to evaluate each dimension, not separate bonus points.

> Scope: Sungen tests run through Playwright — **UI-only**. No DB/API/email-body/server-side. Out-of-scope viewpoints (see Out-of-scope) are NOT penalized; if required, mandate `@manual` + a technical reason.

---

## Scoring (7 dimensions, 100 points)

**≥ 70**: PASS | **50–69**: CONDITIONAL (fix before execution) | **< 50**: FAIL (revise & re-review)

**Scoring convention**: Each row in a dimension table is scored independently. Full points if satisfied across all in-scope TCs; otherwise deduct ~1 pt per distinct violation, floor 0 per row (never negative). A row whose technique has no relevant case → 0 for that row only, it does not zero the whole dimension. Sum the rows for the dimension total.

| Dimension | Pts |
|---|---|
| Structure & Format | 15 |
| Coverage (6 sub-dimensions) | 30 |
| Assertion Quality | 20 |
| Test Data | 10 |
| Security & Permission | 10 |
| Automation Readiness | 10 |
| Maintainability | 5 |
| **Total** | **100** |

---

## Layer A — Syntax Gate (against `sungen-gherkin-syntax`)

Hard-fail gate. Any ✗ is a syntax error — must be fixed; do not score further while errors remain.

### A1. Structure & Keyword

- [ ] Correct shape: `User <Action> [Target] <Type> [in [Parent] pType] [with {{v}}] [is State]`
- [ ] Actor is always `User`, active voice
- [ ] `Given` → only `is on` · `When` → action (click/fill/select/press/clear/check/uncheck/hover/wait) · `Then` → only `see` · `And` inherits the preceding keyword
- [ ] NO `Given User see…` (→ `Then`, or entry assertion `Given User is on [X] page`)
- [ ] NO `When … And User is on [X] dialog` (→ `And User see` or a separate `Given`)
- [ ] NO literal-URL navigation (`navigate to "/x"`) → `User is on [X] page` + declare in `selectors.yaml`

### A2. Action → Element type

- [ ] checkbox/toggle → `check`/`uncheck` (NOT `click`)
- [ ] dropdown → `select … with {{v}}` · field/textarea/search → `fill … with {{v}}` · button/tab/link/icon → `click`
- [ ] radio: select another option via `check [Other] radio`, NOT `uncheck` a radio
- [ ] `press` only for keys (`press Enter key`), NOT `press [Submit] button`
- [ ] Element type is in the valid type table (Context/Input/Trigger/Data/Feedback/System)
- [ ] `wait for` only for Spinner/Modal, minimize usage

### A3. Value — State — click-rule

- [ ] Dynamic data: `with {{snake_case}}`, NO hardcoding (`with {{admin@mail.com}}` → ✗ `with {{invalid_email}}`)
- [ ] State: `is <state>` (hidden/visible/disabled/checked/empty/loading…), NOT `{{disabled}}`, NOT missing `is`
- [ ] **click + value**: static (`button/link/icon/tab`) takes NO value; dynamic (`row/item/card/option`) takes `with {{v}}`
- [ ] `fill` always has a target type (`fill [email] field with {{v}}`, not `fill [email] with {{v}}`)

### A4. Assertion (8 patterns → determines the Playwright assertion)

- [ ] Visibility `see [T] type` → NO redundant `is visible`; hidden uses `is hidden`
- [ ] Correct pattern: text(`message/header/label with {{v}}`) · partial(`text contains {{v}}`) · input(`field/dropdown with {{v}}`) · state(`is …`) · attribute(`image/link with {{v}}`) · count(`row with {{count}}`) · page(`[T] page`)
- [ ] Table: `[Col] column in [Table] table`, `[Ref] row in [Table] table with {{v}}`, `table with {{count}}`/`is empty`, `table match data:`; row scope used correctly

### A5. Alert / Scope / Background

- [ ] Alert step appears **before** the action that triggers the dialog
- [ ] Scope-dependent flow (dialog/frame) → use `@steps`/`@extend`, do NOT cram into `Background`
- [ ] `@extend`: entry assertion must be `Given User is on [X] type`, NOT `Given User see`; name `@steps:module__action` (snake/kebab)
- [ ] Scenario name matches the step's element type (a scenario that says "modal" must use `[X] dialog/modal` consistently)

### A6. YAML & Variables

- [ ] Selector keys: lowercase, keep Unicode, use **spaces** (no underscores/dots); same label → `--type`/`--N` suffix; names >30 chars → shorten to 1–3 words
- [ ] Types requiring explicit YAML: `date-picker`, `uploader`, `overlay`, `frame`, `step`
- [ ] Every `{{var}}` in `.feature` exists in `test-data.yaml`; NO orphan keys
- [ ] Dynamic vars (`{{$timestamp}}`/`{{$uuid}}`/`{{$random:a:b}}`) used correctly for run-unique data (CRUD)
- [ ] `locator` (CSS) only as a last resort

### A7. Tags & Flow

- [ ] Exactly **one** priority tag per scenario (`@high`/`@normal`/`@low`…)
- [ ] `@manual`/`@auth:role`/`@no-auth`/`@cleanup:*`/`@parallel`/`@flow` used in the right context
- [ ] `@parallel` is REQUIRED when a feature mixes auth groups (`@auth:user` + `@no-auth`)
- [ ] `@flow`: `[Screen:Element]` namespace is consistent; YAML keys quoted with the colon (`"login:submit":`)

---

## Layer B — Coverage Matrix (against Sun Common Checklist for QA)

Build a mapping table: for each applicable group, does the feature have a matching scenario → list the **gaps**. Each group maps to a Sungen VP classification.

| Category | Sub-viewpoint to check | VP map | Sungen representation |
|---|---|---|---|
| **Check Accessing** | Not logged in → redirect login; logged in with correct role; wrong role → access denied/hide menu | VP-SEC | `@no-auth` (→ login), `@auth:role` (right/wrong role) |
| **Check Initial** | Default field state; autofocus; tab order; display per spec | VP-UI | `Then User see [T] field is empty/focused`, `see [T] page` |
| **Check Required** | Submit with one / multiple required fields blank | VP-VAL | empty `fill` → `see [Err] message with {{v}}` |
| **Check Format** | Email/phone… invalid format; leading/trailing space; uppercase | VP-VAL | `with {{invalid_email}}` → error |
| **Check Maxlength** | Exceed maxlength per field | VP-VAL | `with {{over_max_name}}` → error/blocked input |
| **Check Exist/Duplicate** | Duplicate email/username | VP-VAL | `with {{existing_email}}` → "already exists" |
| **Check Valid** | Happy path: all valid fields; required-only | VP-UI/LOGIC | real data → success message + post-action state |
| **Check Expire** | OTP/token/link expired | VP-LOGIC | usually `@manual` (time-dependent) |
| **Behavior Handling** | Rapid double-click; slow network; reload keeps/loses data; copy-paste; Enter in field | VP-LOGIC | `double click`, `wait for [Spinner]`, `press Enter key` |
| **Account Status** | Deleted / blocked / inactive account login | VP-LOGIC | corresponding account data → error message |
| **Security** | SQL Injection; XSS; Data Integrity (edit dropdown/remove `disabled` via DevTools → server rejects). SQL on LIKE/search fields → 2 TCs per the `sungen-viewpoint` SQL 2-layer rule. | VP-SEC | `with {{xss_*}}`/`{{sql_*}}`; data-integrity usually `@manual` |
| **Cross-surface outcomes** | Admin action → outcome on user-facing surface (portal, mobile, widget); spec defines display condition on another URL | VP-LOGIC-CS | `@high @manual` per surface per business rule — at minimum 1 per cross-surface rule; use `@auth:role` + `@extend` if surface reachable in same test run |

**Tier-aware**: if the suite only has `@high` (Tier 1) → do NOT penalize missing pure VP-UI (deferred to Tier 2). Require full VP coverage only on a Full review.

### EP/BVA rules when mapping

- **EP**: keep only **one representative** per invalid class; same-class duplicates → flag as redundant.
- **BVA**: spec defines min/max → cover `min-1`, `min`, `max`, `max+1` (Maxlength, counts…).
- Error messages must match the spec **word-for-word**, not generic.

---

## Layer C — Dimension details

### Structure & Format (15)

| Check | Pts |
|---|---|
| ID format `VP-<CAT>-<NNN>` (e.g. `VP-LOGIC-001`, `VP-VAL-001`); deleted IDs never reused | 3 |
| Clear title: `[object] + [result/behavior] + [condition]` | 3 |
| Correct module/screen + exactly **one** priority tag | 2 |
| `Given` = state (`User is on [T] page`), not an action | 3 |
| `When`/`And` = atomic steps (1 action), no vague words, last step is the trigger | 2 |
| `Then` is specific & measurable (`see [T] type with {{v}}`/`is state`), not mere existence | 2 |

### Coverage (30) — 6 sub-dimensions

| Sub | Technique | Pts | What to check |
|---|---|---|---|
| Happy paths | — | 5 | ≥1 happy path per core function; realistic data; full result assertions |
| Negative | EP | 6 | one representative per invalid class, no duplicates; error matches spec |
| Edge | EP | 5 | empty/whitespace, special chars (XSS/SQLi), long strings, abnormal file uploads |
| Boundary | BVA | 6 | `min-1/min/max/max+1` per range |
| State transition | ST | 4 | all valid transitions + ≥3 blocked transitions (**UI-only**; full points if all spec states covered) |
| Condition combo | DT | 4 | decision table for ≥2 dependent conditions; test only rules with distinct outcomes |

> Use the quick estimate `(VPs_covered / 6) * 30` ONLY when cases can't be inspected in depth (portfolio scan); never combine the two methods in one score.

### Assertion Quality (20)

| Check | Pts |
|---|---|
| Specific, not generic — "if this assertion PASSES, am I sure the feature works?" must be a confident yes | 6 |
| Avoids anti-patterns: re-asserting input just typed; exact-match on dynamic content; missing negative assertions | 6 |
| **Syntax compliance** — steps match `sungen-gherkin-syntax` patterns, correct `[Ref] type with {{v}}`, no bare `is visible` | 4 |
| Grouping — each case has 2–7 related assertions for the same action | 4 |

### Test Data (10)

| Check | Pts |
|---|---|
| No hardcoded env values in `.feature` — use `{{variables}}` | 3 |
| **Allow test credentials** in `test-data.yaml` if: (a) `.feature` uses `{{var}}` not hardcoded, (b) dedicated test accounts (not prod/personal), (c) env-specific values via `<screen>.<env>.yaml` overrides | 3 |
| Idempotent — has teardown or unique data (`{{$timestamp}}`/`{{$uuid}}`) so it can run repeatedly | 2 |
| Realistic data — accented names, real formats, not `abc`/`1` | 2 |

### Security & Permission (10) — UI-level

| Check | Pts |
|---|---|
| Authentication — `@no-auth` → redirect login; expired/forged token tests are `@manual` + reason | 3 |
| Authorization — via `@auth:role`: each role sees the correct elements/pages | 3 |
| Viewpoint classification — VP-UI/VAL/LOGIC/SEC assigned correctly | 2 |
| Input security — XSS/SQLi via `{{xss_*}}`/`{{sql_*}}` | 2 |

### Automation Readiness (10)

| Check | Pts |
|---|---|
| `@manual` has a valid **technical** reason (not "don't know how to automate" — document as `# TODO: automate when...` comment instead) | 3 |
| Stable selectors — per `sungen-selector-keys`: keys use spaces, standard types, `locator` only as last resort | 3 |
| Each step names a concrete element by name/label/role (enough to implement without asking) | 2 |
| Idempotent + no fixed waits (`wait for [T] dialog` instead of `wait N seconds`) | 2 |

### Maintainability (5)

| Check | Pts |
|---|---|
| Title reflects the **assertion**, not the action (reading the title tells you when it FAILS) | 2 |
| No duplicate TCs; remove obsolete tests when a feature is removed; no same-class VP/EP redundancy | 1 |
| Short enough: `Background` ≤2 lines, scenario ≤10 steps, 2–7 assertions | 1 |
| Comments where needed: `# --- Section:` for VP grouping; `@manual` explains why | 1 |

---

## Out-of-scope (UI-only Sungen)

Do NOT deduct points when a `.feature` lacks the following viewpoints (Playwright UI cannot verify them). If required → `@manual` + reason, or move to another test layer:

- `API Behavior` (direct status/body response)
- `Email Verification` content (header/from/to/body/link) — only the post-click UI is verifiable
- Server-side `Data Integrity` (DevTools edits payload → server rejects)
- `Performance/Load`, `Rate limit`
- DB/record verification after an action

---

## Quick Scan (run first, ~2 minutes)

10 questions; many "No" → return to author, skip detailed review.

1. ID unique + correct format `VP-<CAT>-<NNN>`?
2. Title understandable immediately, no context needed?
3. Every step uses the right keyword (`Given`=is on / `When`=action / `Then`=see)?
4. Every `{{var}}` exists in `test-data.yaml`?
5. At least one happy path?
6. Negative cases for invalid classes (EP)?
7. Boundary covers the 4 points (`min-1/min/max/max+1`)?
8. `Then` specific, not generic, no redundant `is visible`?
9. Test data doesn't hardcode env/static values?
10. Exactly one priority tag + valid functional tags?

**Interpret**: 9–10 Yes → detailed review | 6–8 Yes → review with caveats | <6 Yes → return for revision.

---

## Auto-fix (on detection → suggest fix)

> **Never renumber existing `VP-<CAT>-<NNN>` IDs while fixing** (e.g. after removing an EP duplicate). IDs are the dashboard's tracking key — renumbering survivors loses their pass/fail history. Leave gaps; only assign the next unused number to genuinely new scenarios.

1. **Wrong keyword/action-type** → correct it (`click checkbox` → `check checkbox`; `Given … see` → `Then …`).
2. **Hardcoded data** → `with {{snake_case}}` + add the key to `test-data.yaml`.
3. **Redundant `is visible` / state as value** → drop `is visible`; `{{disabled}}` → `is disabled`.
4. **Missing target type** → add the type (`fill [email] field with {{v}}`).
5. **click static with value** → remove value; **click dynamic missing value** → add `with {{v}}`.
6. **Same-class EP duplicates** → keep one representative.
7. **Generic expected result** → rewrite to assert specific field/element/state.
8. **Missing BVA** → add `min-1/min/max/max+1`.
9. **Missing negative path** → map invalid classes, add scenarios.
10. **All `@high`** → reset by user impact per the `sungen-gherkin-syntax` priority table (auth/CRUD/security/required → `@high`; format/standard-range boundary/search → `@normal`; cosmetic → `@low`).
11. **`@manual` without reason** → add a technical reason comment explaining why automation is not possible.
12. **Orphan var in test-data** → delete or reconnect.
13. **Unnecessary CSS/locator selector** → switch to role+name/label/text; keys use spaces.
14. **Scope crammed into `Background`** → split into `@steps`/`@extend`.
15. **Mixed auth groups missing `@parallel`** → add `@parallel`.
16. **Missing secondary behaviors** — spec defines tiebreaker, fallback rule, or secondary sort but no scenario tests it? Add 1 `@high` TC per rule.
17. **Missing concurrency scenarios** — spec or test-viewpoint mentions multi-tab, multi-user, or simultaneous actions but no `@manual` scenario exists? Add 1 `@manual` TC per risk (`@normal` by default; `@high` if data integrity at risk).

---

## Unverified Selectors (non-scoring metric)

If `selectors/<name>.yaml` exists, count lines matching `@needs-live-verify` (provisional selectors from Figma, not yet checked against a live page).
- Report the count in the review output; **never** deduct points — the suite can PASS with unverified selectors.
- If the count > 0, add to the summary: `⚠ <N> selectors flagged @needs-live-verify — run run-test against a live URL to verify.`
- If `selectors.yaml` does not exist yet (not generated) → omit this metric entirely.

---

## Output Format

```markdown
## Review: <screen / feature>
**Date**: YYYY-MM-DD  |  **Total TCs**: <n>  |  **Tier**: <1/2>  |  **Unverified selectors**: <n / n/a>

| Dimension              | Score | Max | Notes |
|------------------------|-------|-----|-------|
| Structure & Format     |       | 15  |       |
| Coverage               |       | 30  | x/6 sub-dimensions |
| Assertion Quality      |       | 20  |       |
| Test Data              |       | 10  |       |
| Security & Permission  |       | 10  |       |
| Automation Readiness   |       | 10  |       |
| Maintainability        |       | 5   |       |
| **Total**              |       | 100 | **PASS / CONDITIONAL / FAIL** |

### Syntax Gate (Layer A — hard-fail)
- [ ] Keyword→Action correct
- [ ] Action→Type correct; click-rule correct
- [ ] Assertions follow the 8 patterns, no redundant `is visible`
- [ ] Every {{var}} exists in test-data.yaml; no orphan keys
- [ ] Selector keys follow sungen-selector-keys; locator only as last resort
- [ ] Tags valid; @parallel when mixing auth groups
- Syntax errors found: <n>

### Coverage Matrix (Layer B)
| Category | Has scenario? | Gap |
|---|---|---|
| Check Accessing | ✓/✗ | ... |
| Check Required/Format/Maxlength/Duplicate/Valid | ... | ... |
| Behavior Handling / Account Status | ... | ... |
| Security (XSS/SQLi) | ... | ... |
| Cross-surface outcomes | ... | ... |

### ✗ Must-fix
1. [DIMENSION] VP-XXX issue description
   → Fix: ...

### ⚠ Suggested
1. [TEST-DATA] ...

### ✓ Strengths
- ...

### Recommendations (if CONDITIONAL/FAIL)
- ...
```

---

## Scope & Maintenance

- **When NOT to apply**: exploratory charters, performance/load scripts, pure NFR specs — this rubric grades functional test cases.
- **Adapting weights**: a project may rebalance the 7 dimensions (e.g. security-critical service: Security→15, Maintainability→0) as long as the total stays 100 and the PASS/CONDITIONAL/FAIL thresholds are restated. Record any change in this section.
- **References**: detailed syntax → `sungen-gherkin-syntax`; selector keys → `sungen-selector-keys`; VP classification → `sungen-viewpoint`; generation workflow → `sungen-tc-generation`.
- **Owner / version**: Owner: `<QA Lead>` · Version: `2.0` · Last updated: `2026-06-03`.
