---
name: sungen-gherkin-syntax
description: 'Sungen Gherkin patterns, selector types, and YAML key rules. Auto-loaded when writing .feature, selectors.yaml, or test-data.yaml.'
user-invocable: false
---

## Standard Syntax

```
[Keyword] User <Action> [Target Name] <Target Type> <in [Parent Name] <Parent Type>> <with {{Value}}> <is State>
```

- **Actor**: Always `User`, always active voice.
- **Value**: `with {{snake_case}}` — never hardcode static data.
- **State**: `is <keyword>` — never use `{{}}` for states.
- **Parent scope**: `in [Parent] parentType` — optional, only when page has 2+ similar blocks needing disambiguation.

## Keyword → Action Rules

```
GIVEN  →  is on
WHEN   →  click · fill · select · press · clear · check · uncheck · hover
         [⚠️ wait for — only for Spinner/Modal, minimize usage]
THEN   →  see
AND    →  inherits from preceding keyword
```

## Step Patterns (70 patterns)

### Setup / Form / Interaction

```
User is on [T] page | page with {{v}} | dialog
User fill [T] field | textarea | search | slider | date-picker with {{v}}
User fill [T] uploader with {{f}}
User clear [T] field
User check [T] checkbox | toggle | radio
User uncheck [T] checkbox | toggle
User select [T] dropdown with {{v}}
User click [T] button | tab | column | breadcrumb
User click [T] row with {{v}}
User double click [T] element
User hover [T] icon | row
User drag [T] to [T2]
User expand | collapse [T] row
```

**click + with {{Value}} rule**: NO value for static (`button`, `link`, `icon`, `tab`). WITH value only for dynamic lists (`row`, `item`, `card`, `option`).

### Alert / Keyboard / Wait / Scroll

```
User click [OK | Cancel] alert
User fill [T] alert with {{v}}
User see [message text] alert
User press Escape key | Enter on [T] field
User wait for N seconds | [T] dialog | [T] dialog is STATE | [T] page
User scroll to [T] section
User switch to [T] frame | [main] frame
```

> Alert steps must appear BEFORE the action that triggers the dialog.

### Assertions (8 patterns → determines Playwright assertion)

```
# 1. Visibility: User see [T] type (NEVER add "is visible") | is hidden
# 2. Text (toHaveText): User see [T] message | header | label with {{v}}
# 3. Partial (toContainText): User see [T] text contains {{v}}
# 4. Input (toHaveValue): User see [T] field | dropdown | date-picker | search | slider with {{v}}
# 5. State: User see [T] button is disabled | checkbox is checked | dialog with {{v}} is hidden
# 6. Attribute (toHaveAttribute): User see [T] image | link with {{v}}
# 7. Count: User see [T] row with {{count}}
# 8. Page: User see [T] page
```

### Collection / all-card (P5)

```
# Every element's TEXT matches a value (filter correctness, all items belong):
User see all [Result Product Name] text contains {{category_term}}
# Every CONTAINER holds a CHILD element (structural per-card proof — prove "each card has X"):
User see all [Product Card] contain [Product Name]
User see all [Product Card] contain [Add To Cart] button
```

Use the all-card form whenever a title claims *every / each* card/row exposes something — a single `User see [Add To Cart] button` does NOT prove "each card" and the harness Claim-Proof gate will flag it.

### Table

```
User see [Col] column in [Table] table
User see [Ref] row in [Table] table with {{v}}
User see [Ref] row in [Table] table with {{v}} is hidden
User see [Table] table with {{count}} | is empty
User see [Col] column with {{v}}
User click [Act] button in [Table] table with {{v}}
User see [Table] table match data:
    | Header1    | Header2    |
    | {{value1}} | {{value2}} |
```

Row scope: `see [Ref] row in [Table] table with {{v}}` enters scope. Subsequent `see [Col] column with {{v}}` checks cell in that row. Use `table match data:` for multi-row verification.

### States

`hidden` `visible` `disabled` `enabled` `checked` `unchecked` `focused` `empty` `loading` `selected` `sorted ascending` `sorted descending`

### Element Types

| Group | Types |
|---|---|
| **Context** | `page` `dialog` `modal` `drawer` `tab` `alert` `overlay` `step` |
| **Input** | `field` `textarea` `search` `dropdown` `option` `checkbox` `radio` `toggle` `uploader` `slider` `date-picker` |
| **Trigger** | `button` `link` `icon` `menuitem` `tag` |
| **Data** | `table` `row` `column` `cell` `list` `item` `card` `section` |
| **Feedback** | `message` `header` `label` `text` `tooltip` `badge` `breadcrumb` `image` |
| **System** | `key` `frame` `spinner` `progressbar` |

### Auto-infer (no YAML entry needed)

Most elements auto-infer from `[Label] type` → `getByRole(type, { name: 'Label' })`. Only add YAML when the accessible name differs, needs `nth`, or needs `testid`. Full auto-infer table → see `sungen-selector-keys` skill.

**Types requiring YAML entry:** `date-picker`, `uploader`, `overlay`, `frame`, `step` - these have no standard ARIA role and need explicit selectors.

## YAML Keys

`[Reference]` → **lowercase, keep Unicode**: `[Search Content]` → `search content:`, `[Thời gian]` → `thời gian:`

- Keys use **spaces** (not dots) as word separators
- Same label, different element types → add `--type` suffix
- Same label, nth occurrence → add `--N` suffix
- Target Name > 30 chars → shorten to 1–3 meaningful words

## Dynamic Variables (test-data YAML)

Use `{{$var}}` in test-data YAML for values that must be unique per test run. Resolved at **runtime** by `TestDataLoader` — the compiler passes them through unchanged.

| Variable | Example | Output |
|---|---|---|
| `{{$timestamp}}` | `"User-{{$timestamp}}"` | `"User-1714000000"` |
| `{{$uuid}}` | `"{{$uuid}}"` | `"a1b2c3d4-..."` |
| `{{$random:min:max}}` | `"{{$random:1:100}}"` | `"42"` |
| `{{$date}}` | `"{{$date}}"` | `"2026-04-24"` |
| `{{$datetime}}` | `"{{$datetime}}"` | `"2026-04-24T10:30:00.000Z"` |

**Rules:**
- `$timestamp` and `$uuid` → same value across all keys in one `load()` call (stable within a test file)
- `$random` → unique per occurrence (each key gets a different random)
- Resolved once at load time → every `get()` returns the same resolved value
- Use for CRUD flows to avoid data collision between parallel runs

```yaml
# test-data/crud-award.yaml
award:
  name: "Award-{{$timestamp}}"
  email: "test+{{$uuid}}@example.com"
  score: "{{$random:1:100}}"
```

## Selectors (priority order)

| type | value | name | use |
|---|---|---|---|
| `testid` | data-testid | — | when exists |
| `role` | button/heading/link… | accessible name | interactive elements |
| `placeholder` | placeholder text | — | inputs |
| `label` | label text | — | labeled inputs |
| `text` | — | — | static text |
| `locator` | CSS selector | — | last resort |
| `page` | relative URL | — | navigation |
| `upload` | — | — | file inputs |
| `frame` | iframe selector | — | iframes |

Options: `nth` `exact` `scope` `match` `variant` `frame` `contenteditable` `columns`

## Tags

### Functional tags (affect code generation)

| Tag | Effect |
|---|---|
| `@manual` | Skip in generation |
| `@auth:role` | Use auth storage state for role |
| `@no-auth` | Disable inherited auth |
| `@steps:name` | Define reusable step block (base scenario) |
| `@extend:name` | Prepend Given→When from @steps block (skip Then) |
| `@cleanup:overlay` | Auto-cleanup: dismiss dialogs/overlays after each test (cleanupPage) |
| `@cleanup:forms` | Auto-cleanup: clear form fields after each test (cleanupPage) |
| `@cleanup:scroll` | Auto-cleanup: scroll to top after each test (cleanupPage) |
| `@cleanup:storage` | Auto-cleanup: clear sessionStorage after each test (cleanupPage) |
| `@screenshot:on-failure` | Auto-capture screenshot when test fails (base.ts fixture) |
| `@parallel` | Opt-out: fresh page per test instead of serial default (for independent scenarios) |
| `@beforeAll` | Hook: runs once before all tests → `test.beforeAll()` |
| `@afterEach` | Hook: runs after each test → `test.afterEach()` (custom cleanup) |
| `@afterAll` | Hook: runs once after all tests → `test.afterAll()` |
| `@flow` | Mark feature as E2E flow (cross-screen testing) |

### Pass-through tags (filter at runtime via Playwright --grep)

Any tag not listed above passes through to Playwright `{ tag: [...] }`. Feature-level tags inherit to all scenarios.

| Tag | Purpose |
|---|---|
| `@smoke` | Quick sanity check — run after every deploy |
| `@regression` | Full test suite — run nightly or before release |
| `@high` | Priority: must pass — login, auth, core CRUD, primary business flow |
| `@normal` | Priority: important — validation rules, secondary features, search/filter |
| `@low` | Priority: minor/cosmetic — tooltips, hover states, element presence |
| `@auto` | Standard scenario, ready for automation |
| Any custom | e.g., `@sprint-42`, `@team-payment` — any tag works |

**Assign priority by user impact** (canonical mapping — override only when context differs):

| Scenario type | Tag |
|---|---|
| Auth redirect / unauthenticated access | `@high` |
| CRUD happy path (create / update / delete — success) | `@high` |
| Core business rule, state transition | `@high` |
| XSS, SQL injection, permission blocked | `@high` |
| Required field error, unique/duplicate constraint | `@high` |
| Format validation (email, phone, date…) | `@normal` |
| Boundary value — inclusive (`<=`, `>=`) → `@high`; standard range → `@normal` | `@normal` |
| Secondary features (search, filter, sort, pagination) | `@normal` |
| Element presence, label, placeholder, tooltip | `@low` |

**Run filtered:**
```bash
npx playwright test --grep "@smoke"          # only smoke tests
npx playwright test --grep "@high"           # only high priority
npx playwright test --grep "@smoke|@high"    # smoke OR high
```

### Serial vs Parallel (test execution mode)

**Default: serial** — `test.describe.serial()` with shared page. Background runs once in `beforeAll`. Fail → skip remaining.

**`@parallel` opt-out** — `test.describe()` with fresh page per test. Background runs as `beforeEach`. Use when scenarios are truly independent (validation rules, permission tests).

| Mode | Generated | Page | Background | On fail |
|---|---|---|---|---|
| Serial (default) | `test.describe.serial()` | Shared | `beforeAll` (1 goto) | Skip remaining |
| `@parallel` | `test.describe()` | Fresh per test | `beforeEach` (N goto) | Continue |

**`@parallel` is required** when a feature has multiple auth groups (e.g., `@auth:user` + `@no-auth` scenarios). Serial mode uses one shared browser context and cannot mix auth roles. The compiler will error if `@parallel` is missing in this case.

### `@flow` tag (E2E cross-screen testing)

`@flow` marks a feature as a **flow** — an E2E journey spanning multiple screens. Flows live in `qa/flows/<name>/` with their own selectors, test-data, and requirements.

**Key differences from screen tests:**

| Aspect | Screen (`qa/screens/`) | Flow (`qa/flows/`) |
|---|---|---|
| Scope | Single page | Multiple pages |
| Selectors | `[Element]` → own YAML | `[Screen:Element]` → own YAML (namespaced) |
| Test data | `{{variable}}` | `{{phase.variable}}` (namespaced by phase) |
| Tag | `@auto` / `@smoke` etc. | `@flow` (required at feature level) |
| Multi-domain | N/A | Absolute URL in selector `path:` skips baseURL |

**Selector namespace format:** `[Screen:Element]` where colon separates screen prefix from element name. The YAML key is `"screen:element"` (quoted, lowercase).

```gherkin
# Feature file
When User fill [Login:Email] field with {{login.email}}
And User click [Login:Submit] button
Then User see [Dashboard] page
When User click [Dashboard:Awards] link
```

```yaml
# selectors.yaml — keys are namespaced, quoted due to colon
"login:email":
  type: 'testid'
  value: 'email-input'

"login:submit":
  type: 'role'
  value: 'button'
  name: 'Login'

dashboard:
  type: 'page'
  value: '/dashboard'

"dashboard:awards":
  type: 'role'
  value: 'link'
  name: 'Awards'
```

**Flow structure:**
- `Background:` — set starting page only (e.g., `Given User is on [Login] page`)
- Each `Scenario:` — one phase/step of the flow (login, navigate, submit, etc.)
- Page navigation between scenarios uses `[Screen] page` references

**CLI:** `sungen add-flow --flow <name>`, `sungen generate --flow <name>`, `sungen generate --all` (includes flows)

### @extend behavior

- Tool executes **only Given→When** of `@steps` scenario (skips Then)
- The `Given` in `@extend` scenario is the **entry assertion** (confirms state after base steps)
- **Entry assertion MUST use `Given User is on [X] type`** — NEVER `Given User see [X] type`
- `Given` keyword ONLY allows `is on` action. `see` = `Then` only.
- If `@steps` scenario fails, `@extend` scenario is **skipped**
- Name format: `snake_case` or `kebab-case` with module prefix: `@steps:kudos__open_modal`

## Common Syntax Errors

| Error | Wrong | Correct |
|---|---|---|
| Wrong keyword | `Given User click [T] button` | `When User click [T] button` |
| `see` after Given | `Given User see [T] heading with {{v}}` | `Then User see [T] heading with {{v}}` (or `Given User is on [T] page` for entry assertion) |
| Name ≠ step type | Scenario name says "modal" but step uses `dialog` | Use the **same element type** in both: "...dialog opens" + `[X] dialog` |
| Wrong action for type | `When User click [T] checkbox` | `When User check [T] checkbox` |
| press wrong target | `When User press [Submit] button` | `When User press Enter key` |
| uncheck radio | `When User uncheck [Male] radio` | `When User check [Female] radio` |
| Hardcode data | `with {{admin@mail.com}}` | `with {{invalid_email}}` |
| Missing `is` for state | `with {{text}} hidden` | `with {{text}} is hidden` |
| State as value | `with {{disabled}}` | `is disabled` |
| Missing target type | `fill [email] with {{v}}` | `fill [email] field with {{v}}` |
| Background with scope | `Background: ... And User is on [X] dialog` | Use `@steps` + `@extend` for scope-dependent flows |
| `is on` after When | `When ... And User is on [X] dialog` | `And User see [X] dialog` or separate Given |
| Literal URL navigate | `User navigate to "/dashboard"` | `User is on [Dashboard] page` (add page selector in `selectors.yaml`) |

## Background vs @steps/@extend

Both `Background` and `@steps`/`@extend` are valid — they serve different purposes.

| Pattern | Use when | Generates |
|---|---|---|
| `Background` | Simple shared setup (navigate to page) | `test.beforeEach()` |
| `@steps`/`@extend` | Complex reusable flows with scope (dialog, frame) | Inline merged steps in `test()` |

**Use `Background` for simple navigation:**
```gherkin
Background:
  Given User is on [Dashboard] page

Scenario: View stats
  Then User see [Revenue Chart] section
```

**Use `@steps`/`@extend` when scope matters (dialog, frame):**
```gherkin
@steps:open_modal
Scenario: Open modal
  Given User is on [Kudos] page
  When User click [Open] button
  Then User see [Modal] dialog

@extend:open_modal
Scenario: VP-UI-001 Title visible
  Given User is on [Modal] dialog
  Then User see [Title] heading
```

**Avoid `Background` with scope-dependent steps** — `When` + `And User is on [X] dialog` creates keyword mismatch (`is on` = Given, not When). Use `@steps`/`@extend` instead.

## Hooks & Cleanup

Two layers for test lifecycle management. Prefer `@cleanup:*` tags (Layer 1) — they work with base.ts automatically. Use hook scenarios (Layer 2) only for custom logic.

### Layer 1: `@cleanup:*` tags (automatic via base.ts)

Feature-level tags that activate cleanup fixtures in base.ts. No Gherkin steps needed.

```gherkin
@auth:admin
@cleanup:overlay
@cleanup:forms
Feature: User Management
  Path: /users

  Background:
    Given User is on [User Management] page

  Scenario: Create user shows form
    When User click [Add User] button
    Then User see [Create User] dialog

  Scenario: Search user by name
    When User fill [Search] field with {{search_name}}
    Then User see [User Row] row
```

| Tag | What base.ts does after each test |
|---|---|
| `@cleanup:overlay` | Press Escape, click body, dismiss fixed overlays |
| `@cleanup:forms` | Clear all input/textarea fields, reset selects |
| `@cleanup:scroll` | Scroll to top of page |
| `@cleanup:storage` | Clear sessionStorage |

### Layer 2: `@afterEach` scenario (custom cleanup)

Only when `@cleanup:*` tags aren't enough — feature-specific logic.

### Layer 3: `@beforeAll` / `@afterAll` (optional)

For one-time setup/teardown.

**Rendering order in `.spec.ts`:**
`test.describe` → `test.use(storageState)` → `test.use(autoCleanup)` → `test.beforeAll` → `test.beforeEach` → `test.afterEach` → `test.afterAll` → `test()` blocks
