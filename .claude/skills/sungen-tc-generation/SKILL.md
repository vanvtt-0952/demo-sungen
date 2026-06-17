---
name: sungen-tc-generation
description: 'Use when create-test needs to translate spec.md/Figma/UI into .feature + test-data.yaml. Invoke after requirements are read, before any selectors.yaml work.'
user-invocable: false
---

## ⚠️ Gotchas — read before generating

- `spec_figma.md` exists → read file only, **NEVER** call `mcp__figma__*`
  → PAT auth flow already done by `sungen-capture` (mode figma-pat); re-calling fails or duplicates work.

- `selectors.yaml` → do **NOT** generate — handled by `run-test`
  → Selectors need live DOM inspection via Playwright MCP, only `run-test` triggers it.

- `@steps:` scenarios → **NO** priority tag (setup blocks, not test cases)
  → Priority tags filter test runs; setup blocks must always run via `@extend:`, never be filtered out.

- Hardcode exact error messages in test-data.yaml — never leave `{{error}}` vague
  → Assertions are string-equal; vague placeholders produce false-positive passes.

- `@parallel` required when mixing `@auth:X` + `@no-auth` in the same feature
  → Playwright shares browser context per worker; auth state leaks across scenarios without isolation.

- XSS ≠ SQL injection — generate as **2 separate scenarios**, never merge
  → Different attack vectors (client render vs DB query) and different observable failures (alert popup vs DB error).

- **SQL injection has 2 layers — generate both when field reaches a backend query:**
  - Layer 1 → field UI: special chars blocked by input field → `@high` automated scenario
  - Layer 2 → API server: field accepts alphanumeric (e.g. LIKE/search field) → send payload like `1 OR 1=1` directly to API (curl/Postman, bypass UI) → verify server uses parameterized query, not string concat → `@high @manual`
  → Skipping Layer 2 = missing real attack vector even when field validation is correct.
  → Trigger: any free-text field whose value reaches a LIKE, partial-match, or dynamic WHERE clause.

- **Concurrent / race conditions — generate `@manual` when spec or viewpoint mentions multi-tab, multi-user, or simultaneous actions:**
  → Examples: two browser tabs same search with different conditions must not contaminate each other; double-click submit must not create duplicates.
  → `@normal @manual` by default — unless data integrity at risk → `@high @manual`.
  → Do NOT skip because "hard to automate" — document as `@manual` so it appears in the test plan.

- Spec mentions outcomes on a **different user-facing surface** (another URL, mobile app, user portal, widget)
  → "Single screen focus" means don't test other screens' UI patterns — it does NOT exempt you from documenting business outcomes on other surfaces.
  → **Always generate `@manual` scenarios for the output surface** — at minimum one `@high @manual` per cross-surface business rule.
  → If the output surface is reachable with a different auth role in the same test run, use `@auth:role` + `@extend` setup instead of `@manual`.
  → Skipping these entirely = zero test can catch "admin creates record correctly but user never sees it" — the most silent failure class.
  → Add `Display surfaces` + `Cross-surface rules` to the Coverage Map (see Step 2).

- Spec uses **inclusive boundary operators** (`<=`, `>=`, `≤`, `≥`, "at least N", "no more than N", "up to and including")
  → The boundary point itself **must** be a test case — not just "inside" and "outside" regions.
  → Generate: `boundary - 1` (must fail/not-display), `boundary` (must pass/display), `boundary + 1` (must pass or fail depending on direction).
  → Example: `end_at >= now` → test `end_at = now` (inclusive: display), `end_at = now - 1s` (exclusive: no display).
  → Off-by-one at inclusive boundaries is the most common display-logic bug.

- **AND condition in business rule — test each branch failing independently:**
  When spec defines "A AND B AND C must all be true", generate:
  (1) A fails while B/C pass, (2) B fails while A/C pass, (3) C fails while A/B pass.
  OR condition: generate 1 scenario per branch where that branch alone triggers the outcome.
  → Happy-path only = missing the most common multi-condition implementation bug.

---

## Tier System

| Tier | Priority | What to generate | When |
|---|---|---|---|
| **Tier 1** (default) | `@high` | Happy paths, required validation, core business rules, security basics | First run of `create-test` |
| **Tier 2** (expand) | `@normal` + `@low` | UI presence, optional validation, edge cases, cosmetic checks | User runs `create-test` with "Add viewpoints" mode |

**Tier 1 stops when:**
- Every core user task has a happy-path scenario
- Every validation rule has at least one negative case (required, format, boundary)
- Every business rule has at least one scenario
- Security basics covered (auth redirect, permission blocked, injection)

**Tier 2** only when the user explicitly chooses "Add viewpoints" or "Add new sections".

**Fast-path** — display-only screens (no form, no state machine, ≤2 sections):
skip Coverage Map (Step 2) entirely. Go straight to Output Format with Tier 1 VP-UI presence checks
and any obvious VP-SEC (auth redirect). Spec drives nothing here — viewpoint covers it.

## Update Mode

When `.feature` already has scenarios, summarize and ask:
1. **Add new sections** — append Tier 1 scenarios, continue numbering
2. **Add viewpoints** — expand existing sections with Tier 2 scenarios
3. **Replace all** — overwrite with fresh Tier 1 generation

For append: read highest `VP-<CAT>-<NNN>`, continue from next number. Never modify existing scenarios.

> **IDs are immutable & append-only.** The dashboard tracks each test case by its ID (namespaced at export as `<SCREEN>-<CAT>-<NNN>`, e.g. `LOGIN-SEC-001`). When updating a `.feature`:
> - **Never renumber** existing scenarios — even when earlier ones were deleted. Renumbering changes the dashboard key and loses that test's pass/fail history.
> - **New scenarios** take the next unused number per `VP-<CAT>` group (continue from the highest; do NOT fill gaps left by deletions).
> - **Deleting** a scenario retires its number permanently — never reuse it.
> - Editing a scenario's title text or steps is fine — the ID stays the same.

---

## Input Sources

Auto-detected by `create-test` before invoking this skill:
- `spec.md` — primary, always read if present
- `spec_figma.md` — Figma supplement (PAT flow already done — just read the file)
- `ui/*.png` — visual context
- `test-viewpoint.md` — test conditions checklist; scan entirely regardless of format.
  Format varies across projects: hierarchical table (Level 1–4 columns), flat checklist,
  prose, or mixed. Regardless of format:
  1. Scan entire file top to bottom.
  2. Each row / bullet / item = 1 viewpoint → add to `Viewpoint items` in Coverage Map.
  3. Do NOT pre-classify into buckets before scanning — classify only when
     writing the scenario.
  4. **If it declares viewpoint IDs** (e.g. `VP0`, `VP1`…`VP12`, `MS-HP-001`), capture each
     item WITH its ID and **reuse that ID as the scenario code** — do not invent a generic
     `VP-<CAT>` scheme (the harness Taxonomy-match gate FAILs on mismatch).
- `qa/context.md` — project-wide context set by the QA lead. Read ONCE before building the Coverage Map; apply to every screen. Extraction rules:
  - **Roles** → for each role in the table: add to the `@auth:X` tag pool; generate a VP-SEC blocked-access scenario for every role boundary relevant to this screen.
  - **Testing strategy → Focus areas** → if `security` listed: VP-SEC is mandatory Tier 1 for every free-text input regardless of spec risk level; if `ui` not listed: all VP-UI scenarios move to Tier 2 minimum.
  - **Testing strategy → Mandatory coverage** → each line is a hard override applied to this screen regardless of spec risk; document in `Context constraints` of the Coverage Map.
  - **Testing strategy → Deprioritize/skip** → record in `Context constraints`; suppress those VP categories from Tier 1 generation.
  - **Global business rules** → add each to the `Business rules` section tagged `[G]` (e.g. `[G1 – soft-delete only]`); treat as `HIGH` risk unless stated otherwise.
  - **Error patterns** → use as fallback only when `spec.md` does not give exact error text; never override spec-specified messages.
  - If `qa/context.md` is absent: proceed without it — no impact on the generation flow.

**Single screen focus**: one URL = one screen. Modals on same page = part of this screen.
This means: do not test other screens' UI layout or navigation. It does NOT mean skip documenting business outcomes that your screen's actions cause on other surfaces. Those cross-surface outcomes must appear in the Coverage Map and be covered by at least `@manual` scenarios.

**Capture real data** from live page or Figma: option labels, error messages, counter keywords. Hardcode in `test-data.yaml` — stale data that fails fast beats `@manual` that never runs.

---

## Generation Workflow

### Step 1 — Orient: patterns + risk

Identify core user tasks. Categorize page sections by UI pattern group using `sungen-viewpoint`:
data entry (A), data manipulation (B), data exploration (C), display/feedback (D), identity (E).

Proceed directly to Step 2. Pause to ask the user only when section priority is genuinely ambiguous from spec (e.g. multiple top-level forms without business context).

### Step 2 — Build Coverage Map

Read `spec.md` fully, then extract into a Coverage Map **before writing any scenario**. Nothing is skipped at this stage — risk only affects depth in Step 3.

**Risk tags:** HIGH = complex business rules, cascading fields, multi-step state changes, auth/integration. LOW = display-only, static labels, read-only fields.

```
Context constraints: [populated from qa/context.md before writing any scenario]
                     roles: [list roles, e.g. admin / manager / staff]
                     strategy: [active overrides, e.g. "VP-SEC mandatory T1", "VP-UI → T2 only"]
                     global rules: [G1 – ...] → also appear in Business rules below tagged [G]
                     → leave empty if qa/context.md is absent or has no entries applicable to this screen
User journeys:       [J1 – ...], [J2 – ...]
Validation rules:    [V1 – field → "exact error text"], [V2 – ...]
Business rules:      [B1 HIGH – ...], [B2 LOW – ...]
Secondary behaviors: [SB1 – tiebreaker: when X identical → sort by Y DESC]
                     [SB2 – default state when no condition applies: ...]
                     → capture "otherwise", "when tied", "secondary sort", "fallback" rules here
States:              [StateA → StateB], [blocked: StateC → StateA]
Security:            [S1 HIGH – OAuth/SSO flow], [S2 HIGH – free-text inputs → XSS + SQL injection]
Concurrency risks:   [C1 – spec/viewpoint mentions multi-tab, concurrent edit, or simultaneous action]
                     → leave empty if neither spec nor viewpoint mentions concurrency
Display surfaces:    [Surface1 – /url, auth:role], [Surface2 – /url, auth:user]  ← list every surface spec mentions as output
Cross-surface rules: [B1 – action on /admin → outcome on /user (3-condition AND logic)]  ← mandatory if Display surfaces exist
Inclusive bounds:    [start_at <= now → boundary: start_at=now must display], [end_at >= now → boundary: end_at=now must display]
Viewpoint items:     [TV-01 – <exact wording from test-viewpoint row 1>]
                     [TV-02 – <exact wording from test-viewpoint row 2>]
                     → one entry per row/bullet in test-viewpoint.md, regardless of format
                     → leave empty if no test-viewpoint.md present
Spec gaps:           [G1 – behavior undocumented → verify with dev]
```

**Example — login screen (2 sections, 5 validation rules):**
```
User journeys:       [J1 – account login with valid credentials]
Validation rules:    [V1 – empty email → "Invalid email address"],
                     [V2 – short password → "Password must be at least 6 characters"],
                     [V3 – invalid format → "Invalid email address"],
                     [V4 – wrong credentials → "Invalid email or password"]
Business rules:      [B1 HIGH – toggle is same-page state, not route change]
States:              [Default → Account form], [Account form → Google login],
                     [Account form → Loading → Success/Error]
Security:            [S1 HIGH – free-text email/password → XSS + SQL injection]
Display surfaces:    [Login page – /login, no-auth]  ← same surface, no cross-surface rules needed
Cross-surface rules: (none)
Inclusive bounds:    (none)
Spec gaps:           [G1 – auth error on 401 unconfirmed on live]

Tier 1 output:    VP-LOGIC-001 (toggle reveals form), VP-LOGIC-002 (restore Google state),
                  VP-LOGIC-003 (login success → redirect), VP-VAL-001 (empty fields),
                  VP-VAL-002 (invalid format), VP-VAL-003 (short password),
                  VP-VAL-004 (wrong credentials), VP-SEC-001 (XSS), VP-SEC-002 (SQL injection)
```

**Example — admin notice management screen (cross-surface + inclusive bounds):**
```
User journeys:       [J1 – create notice], [J2 – edit notice], [J3 – toggle active], [J4 – delete notice]
Validation rules:    [V1 – title empty → "必須項目です"], [V2 – end_at <= start_at → "終了日時は開始日時より後に…"],
                     [V3 – title > 255 chars → "255文字以内で入力してください"]
Business rules:      [B1 CRITICAL – notice displays on user-facing portal only when: is_active=ON AND start_at<=now AND end_at>=now],
                     [B2 HIGH – is_active=ON by default on create; not on form],
                     [B3 HIGH – toggle not blocked by date range]
States:              [Scheduled → Live → Expired], [any → OFF via toggle]
Security:            [S1 HIGH – free-text title/content → XSS + SQL injection], [S2 HIGH – admin-only, non-admin blocked]
Display surfaces:    [Admin panel – /admin/notices, auth:admin], [User portal – /user-facing-url, auth:user]  ← TWO surfaces
Cross-surface rules: [B1 – admin creates/toggles → user portal shows/hides banner; 8-combination decision table]
Inclusive bounds:    [start_at <= now → boundary: start_at=now must display], [end_at >= now → boundary: end_at=now must display]
Spec gaps:           [G1 – exact content max length unconfirmed]

Tier 1 output (admin surface):    VP-LOGIC-001 to VP-LOGIC-013, VP-VAL-001 to VP-VAL-007, VP-SEC-001 to VP-SEC-003
Cross-surface output (user portal): VP-LOGIC-CS-001 @manual (M-01: all 3 ON → display),
                                    VP-LOGIC-CS-002 @manual (M-05: is_active=OFF → no display),
                                    VP-LOGIC-CS-003 @manual (M-03: start_at future → no display),
                                    VP-LOGIC-CS-004 @manual (M-02: end_at past → no display),
                                    VP-LOGIC-CS-005 @manual (boundary: start_at=now → display),
                                    VP-LOGIC-CS-006 @manual (boundary: end_at=now → display)
```

**❌ Bad Coverage Map — silently misses validation rules AND cross-surface outcomes:**
```
User journeys:    [J1 – create notice], [J2 – edit notice]
Business rules:   [B1 – display logic: is_active + date range]
Security:         [S1 – admin only]
```
→ Output misses VP-VAL-* entirely (validation rules not listed with exact messages).
→ Output misses user portal scenarios entirely (no `Display surfaces` or `Cross-surface rules` field).
→ Output misses boundary tests for `start_at <= now`, `end_at >= now` (no `Inclusive bounds` field).
→ Root cause: Coverage Map only captured admin CRUD journeys; spec section on "display flow" and "user-facing surface" was not scanned into the map.

**✅ Good** — see admin notice example above: `Display surfaces` lists every URL spec mentions as output, `Cross-surface rules` maps each admin action to its user-facing outcome, `Inclusive bounds` flags every `<=`/`>=` for BVA. Every item maps to a VP-ID in `Tier 1 output`.

#### Critical business-viewpoint pre-gate — pass `sungen audit` on the FIRST pass

> The harness gate FAILS (and forces repair rounds → wasted tokens) when a page-type's critical **business** viewpoints are missing or **shallow**. Generate them correctly the first time. A business-critical `Then` must assert **DATA**, never just `see [X] page/section/modal`.

**By page-type, generate a DEEP scenario for each (before expanding UI/validation/subscription):**

| Page-type | Must-cover viewpoints (each with a data assertion) |
|---|---|
| **e-commerce list / home** | list-data (card has image+name+price+add) · product-detail-consistency · cart-correctness · category-filter-correctness · **brand-filter-correctness (separate from category)** · add-to-cart success · nav-core |
| **form** | required-validation · format/boundary · submit-success |
| **auth** | valid-login · invalid-credential · access-control |

**Required assertion shapes (use these, not bare visibility):**
- Card info: assert at **card level** (image+name+price together), e.g. `User see all [Product Card] contain {{...}}` — not `see [Section]` (section-level passes even if one card lacks price).
- Cross-screen consistency (detail/cart): **capture then compare** —
  ```gherkin
  When User remember [Product Name] text as {{selected_product_name}}
  And User remember [Product Price] text as {{selected_product_price}}
  And User click [View Product] link
  Then User see [Detail Product Name] header with {{selected_product_name}}
  And User see [Detail Product Price] text contains {{selected_product_price}}
  ```
  Cross-screen target → tag `@manual` + `# Deferred to a flow (home -> detail)`.
- Filter result (category AND brand, separately): `Then User see all [Result Product Name] contain {{selected_category}}` — proves EVERY item belongs, not one.

**Depth is a GATE dimension (harness-roadmap P1) — self-raise, never silently go shallow:**
- For every data-correctness theme the catalog marks `depth.requires: data-assertion`, emit its `depth.template` shape by **default** — don't wait for the repair loop. `sungen audit` measures `businessDepth` (ratio of these scenarios that assert data) against an intent threshold (functional ≥ 0.70); below it the **gate FAILs**.
- `depth.cross_screen: true` (cart / detail / filter / brand correctness) → write the deep capture/compare shape but tag `@manual` + `# Deferred to a flow (...)`. These are excluded from the ratio (they're correctly deferred), so they don't hurt depth.
- **If the spec lacks the concrete value** a deep assertion needs (exact message, price, count): still write the deep shape with a `{{var}}` placeholder and leave a `# SPEC-GAP: <field> value not in spec` comment — do **not** downgrade to `see [X] section`. A visible gap is better than a silent shallow pass.
- **Blind-Spot Memory:** before finishing, run `sungen blindspot list --prompt` (Bash) and make sure the suite satisfies each recorded pattern (e.g. "for any Add/Create action: check success + resulting data state + duplicate/double-submit"). These are gaps QA hit before — don't repeat them.

**First-pass anti-patterns (these are exactly what the gate/reviewer reject — avoid them):**
- Title↔steps mismatch: e.g. a "no-result state" scenario that clicks a query which **returns** products. Steps must create the condition the title claims.
- Tautology `Then`: `click [Next Slide]` → `see [Carousel] section` (always visible, proves nothing). Assert the change (new slide title differs).
- Business-critical scenario ending at `see [Added] modal` / `see [Cart] page` / `see [Category Products] page` with no data assertion.
- Brand filter covered only as navigation (must assert products belong to the brand).

**Balance:** cover all the above (deep) BEFORE expanding subscription / UI-presence / extra validation edge cases. Do not over-invest in subscription while cart/detail/filter correctness are shallow.

#### Harness gates — satisfy on the FIRST pass (don't make the repair loop fix them)

`sungen audit` enforces these. Generate compliant output up front:

1. **Taxonomy-match** (`VP-TAXONOMY-MISMATCH`, gate-FAIL) — when `test-viewpoint.md` declares its own viewpoint IDs (e.g. `VP0`, `VP1`, … `VP12`, `MS-HP-001`, `MS-EH-001`), **reuse those IDs verbatim as the scenario codes**. Do NOT invent a generic `VP-UI / VP-LOGIC / VP-VAL` scheme — that breaks the coverage matrix. Only fall back to `VP-<CATEGORY>-<NNN>` when the viewpoint file declares no IDs.
2. **Spec-coverage triggers** (`TRIGGER-UNCOVERED`, gate-FAIL) — the Validation-Rules table lists a **trigger** per constraint (e.g. `blur, submit`). Generate one scenario **per (constraint × trigger)** — a `format` rule validating *on blur AND on submit* needs BOTH a blur scenario (`press Tab`) and a submit scenario (`click [Submit]` / `press Enter`). Never collapse the trigger × input matrix to one representative case.
3. **Claim-Proof** (`CLAIM-UNPROVEN`) — a title claiming `all`/`only`/`every`/`single`/`correct`/`same`/`changes`/`hidden`/`cleared`/`restored`/`independent`/`sanitized`/`announces` MUST have the matching assertion (`see all …`, count, `remember`+compare, `is hidden`, return-and-assert-empty, etc.). If the title promises it, the steps must prove it.
   - **Negative / absence claims** (`does not` / `no` / `never` / `prevents` / `không` / `chưa` — any language; `no-side-effect/no-duplicate`, `negative-claim/absence`): the `Then` must **differ** between the claim holding and not holding. A terminal `see [X] page` that looks identical whether or not the bad thing happened proves nothing. For a side-effect that should NOT repeat (re-submit on back, re-charge, duplicate order, resend OTP), assert the **count is unchanged** (`User see [Records] table with {{one}}` / `row with {{count}}`); if it's not UI-observable, mark `@manual` with a request-count oracle (shape below). This is general — it covers any side-effect, not a fixed verb list.
4. **Downstream-scope** (`DOWNSTREAM-SCOPE-MISSING`) — when the spec's Navigation Flow / success target is **another screen** (e.g. a confirmation/sent page), don't stop at a terminal `see [X] page`. Either cover that screen's content/guards (if its viewpoint items are in scope — they often have their own `MS-*` IDs), or scaffold it (`sungen add --screen <name>`) and note the handoff. Do not silently drop the downstream surface.
5. **Manual-oracle** (`MANUAL-STEPS-INSUFFICIENT`) — every `@manual` scenario needs **setup · action · observable expected · oracle/tool**, not a one-line note. Use this comment shape:
   ```gherkin
   @high @manual
   Scenario: VP-… <claim>
     # MANUAL: <why it can't be automated — needs network capture / inbox / screen-reader / multi-tab>
     # Tester verifies:
     #   1. <setup>            e.g. seed a registered email; throttle the network
     #   2. <action>           e.g. click [Submit] with the request in flight
     #   3. <observable>       e.g. only ONE POST is dispatched
     #   4. Oracle: <tool>     e.g. DevTools Network panel / mail-catcher / NVDA
   ```

#### Tier 1 guard — minimum before writing scenarios

| Spec section | Minimum requirement | Tag |
|---|---|---|
| Required field | 1 required-error TC per field | `@high` |
| Validation rule | 1 exact-message TC per rule | `@high` |
| Business rule | 1 behavioral TC per rule | `@high` |
| **Secondary behavior / tiebreaker** | **1 TC per tiebreaker or fallback rule in `Secondary behaviors`** | **`@high`** |
| Auth / OAuth / permissions | 1 VP-SEC TC | `@high` |
| Free-text input | 1 XSS TC **and** 1 SQL injection TC (separate) | `@high` |
| **Free-text LIKE / partial-match field** | **1 field-level SQL TC + 1 API-level SQL `@manual` TC** | **`@high`** |
| Lifecycle states | 1 key state transition TC | `@high` |
| Public page | 1 accessible-without-auth TC | `@high` |
| **Cross-surface business rule** | **1 `@high @manual` TC per affected surface per rule** — even if not automated today | **`@high`** |
| **Inclusive boundary condition** (`<=`, `>=`) | **4 TCs per range: `min-1` (fail), `min` (pass), `max` (pass), `max+1` (fail)** — never skip the exact boundary point | **`@high`** |
| **Concurrency risk (from `Concurrency risks`)** | **1 `@manual` TC per risk — `@normal` unless data integrity at risk → `@high`** | **`@normal`** |
| States row (Default / Loading / Error / Success) | 1 visual state TC per named state — separate from lifecycle transition TC | `@normal` |
| Actions secondary (cancel, reset, export) | 1 behavior TC per secondary action | `@normal` |

> **Completeness check** — after generating all scenarios, scan Coverage Map line by line.
> Every spec item must map to at least one scenario. Every `Viewpoint items` entry must be mapped to a VP-ID or marked `[covered: VP-ID]`. Do NOT silently skip either source.
> Specifically verify: `Display surfaces` each have ≥1 scenario; `Inclusive bounds` each have a boundary-point TC.

#### Tier 2 strategy

Walk `spec.md` top-to-bottom and apply `sungen-viewpoint` Tier 2 checklist for each identified pattern. Depth by risk: high-risk section → all items; low-risk → presence checks only. Skip items already covered by Tier 1.
For HIGH-tagged sections: use the same depth as Step 3 (full BVA + Decision Table) when generating new Tier 2 VP-VAL items not already covered by Step 3. For LOW-tagged sections: EP valid + EP invalid only — skip BVA and Decision Table. Do NOT re-generate scenarios already created in Step 3.

**When `test-viewpoint.md` is present — mandatory line-by-line scan:**
Every item in `test-viewpoint.md` must appear in `Viewpoint items` of the Coverage Map (done in Step 2). In Tier 2, walk `Viewpoint items` line by line:
- Item already covered by Tier 1 → mark `[covered: VP-ID]`, skip.
- Item automatable → generate `@normal` scenario.
- Item requires DB setup / network manipulation → `@normal @manual`.
- Item marked as known bug → `@manual` with comment `# Known issue: <ID>`.

> **Viewpoint completeness check** — after Tier 2, every `Viewpoint items`
> entry must be mapped to a VP-ID or marked `[covered: VP-ID]`.
> If any item has neither → generate missing scenario before finishing.
> Do NOT silently skip viewpoint items because they seem redundant or
> hard to automate.

### Step 3 — Apply test design techniques

Delegate to `sungen-test-design-techniques` for technique selection and depth.
Risk level from Coverage Map drives depth: HIGH section → full BVA / Decision Table; LOW section → EP valid+invalid only.

**BVA constraint:** Use compact 4-point mode only (min-1, min, max, max+1). Do not apply Full 6-point mode.

### Step 4 — Supplement with viewpoint checklists

Use `sungen-viewpoint` for defect-prone patterns spec never documents. Skip items already covered by spec-driven scenarios.

> **XSS and SQL injection** are generated at Tier 1 guard (Step 2). Skip them when applying `sungen-viewpoint` Shared Checks — do not generate again.

#### 4a. Shared Checks — generate ONCE per screen

Apply the **Shared Checks table in `sungen-viewpoint`** (single source). Generate each at most once per screen, not per pattern. Since XSS and SQL injection are already covered at the Tier 1 guard (Step 2, above), at this step generate only the remaining ones that fit the screen: **Loading State** (any async fetch), **Empty State** (any list/table/card that can return 0 records), **URL Manipulation** (URL params affecting displayed data).

#### 4b. Pattern Tier 1 / Tier 2

**Gap check rule — Step 4b fills gaps from Step 3, not a new generation source:**
- **VP-VAL BVA/EP items**: skip if Step 3 already generated scenarios for that field. Generate only if Step 3 missed the field entirely.
- **VP-LOGIC, VP-UI, VP-SEC items**: generate normally — Step 3 does not cover these.

- **Tier 1**: all items from `#### Tier 1 — @high` → VP-LOGIC, VP-VAL, VP-SEC
- **Tier 2**: items from `#### Tier 2 — @normal + @low` → VP-UI

Risk weighting: high-risk section → all Tier 1 items. Low-risk (e.g. read-only table) → only clearly applicable items.

#### 4c. Cross-pattern interactions — where spec-invisible bugs live

For every pair of patterns present on the screen, walk the **⚡ Cross-pattern interactions** list in each `sungen-viewpoint` group file (single source). Never-miss pairs:
- **Create / Update / Delete × Data Table** — new record missing or count not updated; row shows stale data; last-record delete → blank page.
- **Search / Filter × Pagination** — results don't reset to page 1.
- **Form × Modal/Dialog** — modal stays open on success / data wiped on failure.
- **Import × Data Table** — table not refreshed / count wrong after import.
- **Sort × Data Table** — all cells in a row must reorder together (data must not shift to wrong columns).
- **Filter (≥2 active)** — generate 1 scenario with all filters active simultaneously to verify AND logic.

Cross-pattern: `@high` by default.

**Assert values, not existence.** Never bare "is visible". Capture exact error messages into test-data.yaml.

---

## Priority Tags

Every scenario **MUST** have exactly one priority tag. Assign by user impact per the **"Assign priority by user impact"** table in `sungen-gherkin-syntax`; override only when context differs.

Quick fallback: auth / CRUD / security / required-field / unique-constraint → `@high`; format validation / standard-range boundary / search / filter / sort → `@normal`; presence / label / placeholder / cosmetic → `@low`. (Inclusive-operator or critical boundary → `@high`.)

---

## SPA Wait-For Steps

```gherkin
Given User is on [Screen] page
And User wait for [Page Title] heading is visible
```

---

## Cleanup & Hooks

Add cleanup tags per the `sungen-gherkin-syntax` Cleanup table. Key rules:
- **Always `@cleanup:overlay`** if ANY section opens a dialog; **always `@cleanup:forms`** if the screen has inline search, filter, or editable forms.
- **`@parallel`** is required when mixing auth groups (`@auth:X` + `@no-auth`); recommended for validation-heavy features needing a clean form state per scenario.
- **`@afterEach`** hook only when `@cleanup:*` tags aren't enough (feature-specific reset logic).

---

## Output Format

**Files:** `qa/screens/<screen>/features/<screen>.feature` + `qa/screens/<screen>/test-data/<screen>.yaml`

Use step patterns and element types from `sungen-gherkin-syntax`.
**Naming**: reuse the **project's `test-viewpoint.md` IDs** when it declares them (e.g. `VP0`, `MS-HP-001`); otherwise `VP-<CATEGORY>-<NNN>`. Scenario name must use the **same element type** as the steps.

**Test data** — grouped by section, loaded at runtime:

```yaml
# login.yaml (base)
valid_email: admin@dev.example.com
valid_password: DevPass123

# login.staging.yaml (override)
valid_email: admin@staging.example.com
valid_password: StagingPass456
```

**DataTable vs Row Scope:**

| Pattern | Use when |
|---|---|
| `table match data:` + DataTable | Verifying **multiple rows** exist with expected values |
| `row in [Table] table with {{v}}` + `column with {{v}}` | Single row detail or action on a row |

---

## Worked Example — spec → Coverage Map → output

A minimal end-to-end pass. Use this to calibrate output: every Coverage Map line below maps to exactly one scenario, and every `{{var}}` exists in the YAML.

**① Input — `spec.md` (excerpt):**
```
## Coupon Form
- Code: required, free text, max 20 chars, must be unique.
- Discount %: required, integer 1–100 inclusive.
- Submit creates a coupon; it appears at the top of the Coupon List.
- Only authenticated admins can create coupons.
```

**② Coverage Map (Step 2 output):**
```
User journeys:       [J1 – admin creates coupon → appears top of list]
Validation rules:    [V1 – code empty → "Code is required"],
                     [V2 – code > 20 chars → "Code must be 20 characters or less"],
                     [V3 – duplicate code → "Code already exists"],
                     [V4 – discount empty → "Discount is required"]
Business rules:      [B1 HIGH – new coupon sorts to top of list]
States:              (none — no lifecycle)
Security:            [S1 HIGH – free-text code → XSS + SQL injection], [S2 HIGH – admin-only]
Display surfaces:    [Coupon admin – /admin/coupons, auth:admin]  ← single surface
Cross-surface rules: (none)
Inclusive bounds:    [discount 1–100 inclusive → BVA: 0, 1, 100, 101]
Spec gaps:           (none)

Tier 1 output:  VP-LOGIC-001 (create → top of list), VP-VAL-001 (code empty),
                VP-VAL-002 (code > 20), VP-VAL-003 (duplicate code), VP-VAL-004 (discount empty),
                VP-VAL-005 (discount=0 reject), VP-VAL-006 (discount=1 accept),
                VP-VAL-007 (discount=100 accept), VP-VAL-008 (discount=101 reject),
                VP-SEC-001 (XSS), VP-SEC-002 (SQL injection), VP-SEC-003 (non-admin blocked)
```
> Note how `Inclusive bounds` line forces 4 BVA scenarios (0/1/100/101), not just "valid + invalid".

**③ Output — `coupons.feature` (excerpt, 4 of 12 scenarios):**
```gherkin
@parallel @auth:admin
@cleanup:overlay
@cleanup:forms
Feature: Coupons Screen

  Background:
    Given User is on [Coupons] page

  @steps:open_create_form
  Scenario: Open create form
    When User click [Create Coupon] button
    Then User see [Create Coupon] dialog

  # --- Section: Create Coupon (Tier 1) ---

  @high @extend:open_create_form
  Scenario: VP-LOGIC-001 Submit valid coupon adds it to top of list
    Given User is on [Create Coupon] dialog
    When User fill [Code] field with {{valid_coupon.code}}
    And User fill [Discount] field with {{valid_coupon.discount}}
    And User click [Save] button
    Then User see [Create Coupon] dialog is hidden
    And User see [Coupon List] row in [Coupon List] table with {{valid_coupon.code}}

  @high @extend:open_create_form
  Scenario: VP-VAL-005 Discount of 0 is rejected (boundary min-1)
    Given User is on [Create Coupon] dialog
    When User fill [Code] field with {{valid_coupon.code}}
    And User fill [Discount] field with {{discount_zero}}
    And User click [Save] button
    Then User see [Discount Error] message with {{error.discount_range}}

  @high @extend:open_create_form
  Scenario: VP-VAL-006 Discount of 1 is accepted (boundary min)
    Given User is on [Create Coupon] dialog
    When User fill [Code] field with {{valid_coupon.code}}
    And User fill [Discount] field with {{discount_min}}
    And User click [Save] button
    Then User see [Create Coupon] dialog is hidden

  @high @no-auth
  Scenario: VP-SEC-003 Unauthenticated user is redirected to login
    Then User see [Login] page
```

**④ Output — `coupons.yaml` (excerpt):**
```yaml
valid_coupon:
  code: "SAVE-{{$uuid}}"
  discount: "20"
discount_zero: "0"      # boundary min-1 (reject)
discount_min: "1"       # boundary min (accept)
discount_max: "100"     # boundary max (accept)
discount_over: "101"    # boundary max+1 (reject)
error:
  discount_range: "Discount must be between 1 and 100"
```

---

## Flow Test Generation

> **Auto-detect**: if path is `qa/flows/<name>/` → use this section. Skip Steps 1–4 above.

| Aspect | Screen | Flow |
|---|---|---|
| Section focus | UI patterns per section | Journey phases across screens |
| Selector format | `[Element]` | `[Screen:Element]` (namespaced) |
| Test data keys | `{{variable}}` | `{{phase.variable}}` |
| Feature tag | `@auto` / `@smoke` etc. | `@flow` (required) |
| Viewpoints | VP-UI/VAL/LOGIC/SEC per section | VP-LOGIC (transitions), VP-SEC (auth persistence), VP-VAL (cross-screen data) |

**Scenarios to generate:**

| Category | What to test |
|---|---|
| Happy path | Complete flow end-to-end with valid data |
| Auth persistence | Auth state maintained across screen transitions |
| Error recovery | Invalid input mid-flow → fix → continue |
| Cross-screen data | Data entered on screen A visible on screen B |

```gherkin
@flow @auth:user
Feature: Award Submission Flow

  Background:
    Given User is on [Login] page

  @high
  Scenario: User logs in successfully
    When User fill [Login:Email] field with {{login.email}}
    And User fill [Login:Password] field with {{login.password}}
    And User click [Login:Submit] button
    Then User see [Dashboard] page

  @high
  Scenario: User submits nomination
    When User click [Dashboard:Awards] link
    Then User see [Awards] page
    When User fill [Awards:Nominee] field with {{submission.nominee}}
    And User click [Awards:Submit] button
    Then User see {{success_message}} message
```

```yaml
# flows/<name>/test-data/<name>.yaml
login:
  email: "admin@example.com"
  password: "secret123"
submission:
  nominee: "John Doe"
success_message: "Award submitted successfully"
```

**Do NOT generate**: `selectors.yaml` (created during `run-test`), Playwright code (sungen compiles).
