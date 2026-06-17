---
name: sungen-selector-keys
description: 'Rules for generating correct YAML selector keys from Gherkin [Reference] names. Auto-loaded when creating or fixing selectors.yaml files.'
user-invocable: false
---

## Key Generation: `[Reference]` → YAML key

Copy the text from `[Reference]` as-is, then lowercase. Unicode characters (Vietnamese, Japanese, etc.) are preserved.

```
[Submit]              → submit
[Search Content]      → search content
[User's Profile]      → user's profile
[Thời gian]           → thời gian
[Địa điểm]            → địa điểm
[ログイン]              → ログイン
[パスワード]            → パスワード
[Page 2]              → page 2
[Kudos Detail Modal]  → kudos detail modal
```

**Rules:**
1. Lowercase the text
2. Trim leading/trailing whitespace
3. Collapse multiple spaces into one
4. **Keep all Unicode characters as-is** (Vietnamese diacritics, Japanese, etc.)
5. **Keys use spaces** (not dots) as word separators

## Flow Namespaced Keys

In `@flow` features, selectors are namespaced by screen using colon: `[Screen:Element]` → YAML key `"screen:element"` (quoted).

```
[Login:Email]        → "login:email"
[Login:Submit]       → "login:submit"
[Dashboard:Awards]   → "dashboard:awards"
[Awards:Submit]      → "awards:submit"
```

**Rules:**
1. Same lowercase + Unicode rules as standard keys
2. Colon separates screen prefix from element name
3. **YAML keys must be quoted** because of the colon: `"login:email":`
4. Page references don't need prefix: `[Login]` → `login:` (page type)
5. Prevents duplicate names across screens (e.g., `"login:submit"` vs `"awards:submit"`)

```yaml
# Flow selectors — each screen section namespaced
login:
  type: 'page'
  value: '/login'

"login:email":
  type: 'testid'
  value: 'email-input'

"login:submit":
  type: 'role'
  value: 'button'
  name: 'Login'

awards:
  type: 'page'
  value: '/awards'

"awards:submit":
  type: 'role'
  value: 'button'
  name: 'Submit Award'
```

**Type and nth suffixes still apply:** `"login:submit--button"`, `"awards:item--3"`

## Type-Suffixed Keys

When the same label is used for different element types, add `--type` suffix:

```yaml
# [Add Campaign] button AND [Add Campaign] text
add campaign--button:
  type: 'role'
  value: 'button'
  name: 'Add Campaign'

add campaign--text:
  type: 'text'
  value: 'Add Campaign'
```

Type aliases (normalized automatically):
| Gherkin type | Normalized suffix |
|---|---|
| title, label, caption, message | `text` |
| heading, header | `heading` |
| logo, image, icon | `img` |
| btn | `button` |
| input, textbox, textarea, editor | `field` |
| search | `searchbox` |
| toggle | `switch` |
| alert | `alertdialog` |
| modal, drawer | `dialog` |
| column | `columnheader` |
| list-item | `listitem` |

## Nth-Suffixed Keys

When targeting a specific occurrence by index, add `--N` suffix:

```yaml
# [Gửi lời cảm ơn] button 3
gửi lời cảm ơn--3:
  type: 'role'
  value: 'button'
  name: 'Gửi lời cảm ơn'
```

## i18n: Template Variables in Selectors

For multilingual sites without `data-testid`, use `{{variable}}` in `name` or `value` fields to reference locale-dependent text from `test-data.yaml`.

```yaml
# selectors — one file for all locales
submit:
  type: role
  value: button
  name: "{{lbl_submit}}"

search:
  type: placeholder
  value: "{{lbl_search}}"

logo:
  type: testid
  value: app-logo            # testid is locale-independent — no variable needed
```

```yaml
# test-data/login.yaml (base — English)
lbl_submit: "Sign in"
lbl_search: "Search..."

# test-data/login.vi.yaml (Vietnamese)
lbl_submit: "Đăng nhập"
lbl_search: "Tìm kiếm..."
```

Run: `SUNGEN_ENV=vi npx playwright test`

**Rules:**
1. Prefix i18n keys with `lbl_`, `msg_`, `txt_` to separate from test data
2. Prefer `data-testid` — only use `{{variable}}` when no stable selector exists
3. Feature file stays identical across locales
4. Requires runtime data mode (default, not `--inline-data`)

## Lookup Priority

Resolver searches in this order:
1. `key--N` (nth-suffixed)
2. `key--type` (type-suffixed, normalized)
3. `key` (base key)
4. Auto-infer from element type if no YAML entry
5. Any `key--*` (first suffixed match)

## Auto-Infer (no YAML entry needed)

If no YAML key exists, the resolver infers from the Gherkin element type:

> ⚠️ **Auto-infer pitfall — the #1 cause of selector failures in production.**
>
> `[X] button` auto-infers as `getByRole('button', { name: 'X' })`. This **only works** when the button's accessible name in the DOM is **exactly `X`** — same language, same text, same casing.
>
> The Gherkin `[Reference]` is your human label for the element, **not** the DOM name. If the app is in Vietnamese (or any language where the Gherkin label differs from DOM text), auto-infer will produce `No element found` at runtime. **Write an explicit YAML entry** with the real DOM name instead.
>
> **Decision rule**: auto-infer is safe ONLY when you have confirmed in the snapshot that the DOM element's accessible name / placeholder text is literally `X`. When in doubt → write YAML.

| Gherkin | Inferred locator | Safe when… |
|---|---|---|
| `[X] button` | `getByRole('button', { name: 'X' })` | Button's accessible name = X |
| `[X] link` | `getByRole('link', { name: 'X' })` | Link text = X |
| `[X] heading` / `header` | `getByRole('heading', { name: 'X' })` | Heading text = X |
| `[X] checkbox` | `getByRole('checkbox', { name: 'X' })` | Checkbox label = X |
| `[X] radio` | `getByRole('radio', { name: 'X' })` | Radio label = X |
| `[X] field` | `getByPlaceholder('X')` | Placeholder text = X AND field has a placeholder |
| `[X] text` / `message` / `label` | `getByText('X')` | Visible text = X (partial match) |
| `[X] logo/image/icon` | `getByRole('img', { name: 'X' })` | Image alt = X |
| `[X] search` | `getByRole('searchbox', { name: 'X' })` | Searchbox label = X |
| `[X] option` | `getByRole('option', { name: 'X' })` | Option text = X |
| `[X] slider` | `getByRole('slider', { name: 'X' })` | Slider label = X |
| `[X] toggle` | `getByRole('switch', { name: 'X' })` | Toggle label = X |
| `[X] tab` | `getByRole('tab', { name: 'X' })` | Tab text = X |
| `[X] table` | `getByRole('table', { name: 'X' })` | Table aria-label = X |
| `[X] list` | `getByRole('list', { name: 'X' })` | List aria-label = X |
| `[X] column` | `getByRole('columnheader', { name: 'X' })` | Column header text = X |
| `[X] dialog` / `modal` / `drawer` | `getByRole('dialog', { name: 'X' })` | Dialog aria-label/heading = X |
| `[X] dropdown` / `select` | `getByRole('combobox', { name: 'X' })` | Combobox label = X |
| `[X] menuitem` | `getByRole('menuitem', { name: 'X' })` | Menu item text = X |
| `[X] progressbar` | `getByRole('progressbar', { name: 'X' })` | Progressbar label = X |
| `[X] section` | `getByRole('region', { name: 'X' })` | Section aria-label = X |
| `[X] card` | `getByRole('article', { name: 'X' })` | Card aria-label = X |
| `[X] item` | `getByRole('listitem', { name: 'X' })` | List item text = X |
| `[X] cell` | `getByRole('cell', { name: 'X' })` | Cell text = X |
| `[X] spinner` | `getByRole('status', { name: 'X' })` | Spinner aria-label = X |
| `[X] breadcrumb` | `getByRole('navigation', { name: 'X' })` | Navigation aria-label = X |
| `[X] badge` / `tooltip` / `tag` | `getByText('X')` | Visible text = X |

**Special note on `[X] field`**: `getByPlaceholder('X')` only works when (1) the field has a placeholder attribute AND (2) the placeholder text equals X. For fields without placeholders (floating labels, aria-label), write explicit YAML: `type: label, value: "Actual label text"`.

**Only add a YAML entry when** auto-infer cannot work: DOM name differs from Gherkin label, need `testid`, need `nth`, need `exact: true`, or the field type requires explicit config.

### Types requiring YAML entry (no auto-infer)

These types need explicit `selectors.yaml` entries:

| Type | Reason |
|------|--------|
| `date-picker` | Custom component, needs testid or CSS |
| `uploader` | File input, needs upload type selector |
| `overlay` | No standard ARIA role, needs CSS/testid |
| `frame` | Needs iframe selector |
| `step` | Custom stepper component, needs testid |
