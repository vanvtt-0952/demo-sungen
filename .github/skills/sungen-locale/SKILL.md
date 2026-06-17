---
name: sungen-locale
description: 'Bootstrap i18n for a screen/flow — audit hardcoded selector text, detect locale-switch mechanism via live Playwright, generate test-data overlay file. Auto-loaded by /sungen:locale command.'
user-invocable: false
---

## Goal

Take a screen/flow whose `selectors/*.yaml` and `.feature` files were authored against the default locale (usually Vietnamese) and prepare it to run against a second locale. Output:

1. `selectors/<feature>.yaml` — hardcoded `name`/`value` replaced with `{{var}}`
2. `test-data/<feature>.yaml` — base locale, complete with all new keys
3. `test-data/<feature>.<locale>.yaml` — overlay with only the keys that change
4. (Optional) `selectors/<feature>.yaml` Pages block updated when locale uses URL prefix or query param

After this skill finishes, `sungen run-test <name> --env <locale>` Just Works.

## Run mode — Live (preferred) vs Offline (fallback)

Pick mode **once at start**, based on whether MCP Playwright can reach the page.

```
Try: browser_navigate(baseURL)
  → succeeds + page renders content → LIVE MODE (all 6 phases)
  → fails (auth blocked, network down, app broken) → OFFLINE MODE
    (audit + scaffold template + ask user to fill, skip detection phases)
```

**Live mode is the value-add** — it auto-detects locale switch mechanism and auto-fills translations. Offline mode just makes the file structure right; user fills in text manually.

Announce which mode is being used before Phase 1.

## Phase 1 — Audit selectors (always, no MCP)

For each `.feature` file under the screen, read the matching `selectors/<feature>.yaml`. List every entry whose `name` or `value` field contains literal text WITHOUT `{{…}}` AND is not a CSS/href selector.

Classify each candidate:
- **`name` field of `role`-type selector** → very likely locale-dependent
- **`value` field of `text`-type selector** → very likely locale-dependent
- **`value` of `locator`-type selector** that contains `:has-text("…")` → check if text is in target language
- **`value` of `page`-type selector** → URL — handled in Phase 3
- **CSS / href / attribute selectors** (e.g. `a[href="/awards"]`) → skip, locale-invariant

Print the candidate list as a table:

```
selector key       | field | hardcoded value           | classification
-------------------+-------+---------------------------+------------------
nav about          | name  | Giới thiệu SAA 2025       | locale-dependent
nav awards         | name  | Thông tin giải thưởng     | locale-dependent
event date         | name  | 26/12/2025                | maybe (date format)
nav kudos          | name  | Sun* Kudos                | brand — skip
```

If zero candidates and zero `{{var}}` already in place → screen has no localizable text. Tell user, stop.

## Phase 2 — Capture base locale (LIVE only)

1. Read `playwright.config.ts` for `baseURL`. Read `Path:` from `.feature` for entry path.
2. If screen has `@auth:<role>` tags, load `specs/.auth/<role>.json` via `browser_set_storage_state` first.
3. `browser_navigate(baseURL + entryPath)` then `browser_wait_for` for something stable.
4. Capture:
   - `browser_snapshot()` — DOM accessibility tree
   - `browser_evaluate(() => location.href)` — full URL
   - `browser_evaluate(() => ({ localStorage: {...localStorage}, cookies: document.cookie }))` — storage state hash
5. For each Phase-1 candidate: verify the hardcoded text actually appears on the page. Drop ones that don't (stale selectors / false positives).

Save state in memory as `baseLocale = { url, snapshot, storage }`.

If page redirects to `/login` (auth blocker) → stop. Print: *"Auth blocked — cannot capture live page. Re-run with `--offline` flag, or unblock auth first."*

## Phase 3 — Switch locale (LIVE only) — detect mechanism + storage delta

Goal: identify (a) HOW to switch the app to the target locale, and (b) WHAT app-side storage state ends up holding the locale preference so a fresh BrowserContext can be primed identically without driving the UI.

Before triggering the switch, capture full storage baseline:

```js
const before = await browser_evaluate(() => ({
  sessionStorage: { ...sessionStorage },
  localStorage:   { ...localStorage },
  cookies:        document.cookie,
  url:            location.href,
}));
```

Then try mechanisms in order. First one that produces visibly different text wins. For EACH attempt, capture `after` state and diff against `before`.

**3a. URL prefix**
- `browser_navigate(baseURL + '/' + locale + entryPath)`
- Wait, snapshot
- Compare a known Phase-1 candidate's text vs baseLocale
- If text differs and page didn't 404 → **URL prefix mechanism**. Save `localePrefix = '/' + locale`.

**3b. Query param** (only if 3a failed)
- `browser_navigate(baseURL + entryPath + '?lang=' + locale)` (also try `?locale=`, `?lng=`, `?l=`, `?language=`)
- Same diff check
- If text differs → **Query param mechanism**. Save the variant that worked.

**3c. Language switcher UI** (only if 3a + 3b failed)
- Look in base-locale snapshot for buttons matching: `'Select language'`, `'Language'`, `'言語'`, `'Ngôn ngữ'`, role=combobox
- If found, ask user before clicking
- `browser_click` the switcher, then the locale option
- Verify text changed
- If yes → **UI switcher mechanism**.

**3d. None detected** — ask user how to proceed manually.

### Phase 3.5 — Storage diff (always run after Phase 3 succeeds)

After locale text confirmed switched, capture `after` state and diff per area:

```js
const after = await browser_evaluate(() => ({
  sessionStorage: { ...sessionStorage },
  localStorage:   { ...localStorage },
  cookies:        document.cookie,
}));
const sessionDiff = diffEntries(before.sessionStorage, after.sessionStorage);
const localDiff   = diffEntries(before.localStorage,   after.localStorage);
const cookieDiff  = diffCookies(before.cookies, after.cookies);
```

**Filter noise** — only keep entries where:
- Key name contains `lang|locale|language|i18n|intl` (case-insensitive), OR
- Value matches `^[a-z]{2}(-[A-Z]{2})?$` or equals the target locale code

Drop noise: auth tokens (`sb-*`, `*-token`, `*-jwt`), analytics (`_ga*`, `_gid`, `_fbp`), app state (`csrf*`, `last-*`).

**Auto-confidence per entry:**
- High: key name contains locale-related word AND value is a locale code → KEEP, no prompt
- Medium: only one signal matches → ask user
- Low: neither matches but key changed → ask user, default skip

### Phase 3.6 — Verification

For each high/medium-confidence storage entry, verify by setting it manually + reloading:

```js
await browser_evaluate(`() => sessionStorage.setItem('saa-language-preference', 'en')`);
await browser_navigate(baseURL);  // reload triggers app to read storage on boot
await browser_snapshot();
// confirm a known target-locale string appears
```

Caveat: hard reload kills any in-memory JWT (auth blocker amplifies failure surface). Skip verification if the screen has `@auth:*` tags and JWT persistence is known broken in the app.

If verification fails → drop confidence one tier, ask user.

Save mechanism + verified storage delta to memory for Phase 6.

## Phase 4 — Diff base ↔ target (LIVE only)

For each candidate from Phase 1 that survived Phase 2:
- Find the SAME element in target-locale snapshot (match by `role`+position, by `aria-label`, by neighbor structure)
- Extract its text → `targetText`
- Pair: `(selectorKey, hardcoded baseText, observed targetText)`

If matching fails for a candidate → mark "needs manual" — flag for user input rather than skip silently.

Result: list of triples `{ selectorKey, baseText, targetText, confidence }`.

## Phase 5 — Confirm + edit (always)

Present the proposal table:

```
selector key       | base text                | target text          | proposed var     | apply?
-------------------+--------------------------+----------------------+------------------+-------
nav about          | Giới thiệu SAA 2025      | About SAA 2025       | nav_about        | [✓]
nav awards         | Thông tin giải thưởng    | Awards Info          | nav_awards       | [✓]
nav kudos          | Sun* Kudos               | Sun* Kudos           | —                | [skip — same]
event date         | 26/12/2025               | 26/12/2025           | —                | [skip — same]
```

Var names: snake_case the selector key. Avoid collisions with existing test-data keys.

Auto-skip rows where `baseText === targetText` (brand names, locale-invariant numbers).

Ask user: *"Review the table. Confirm to apply / edit individual rows / re-run capture / cancel."*

If user wants to edit a row → fall through to a per-row prompt for `var name` or `targetText` correction.

OFFLINE mode: same table but `target text` column blank — user fills via subsequent prompts or by editing the overlay file after the skill finishes.

## Phase 6 — Apply changes (always, after confirmation)

For each confirmed row:

**6a. Update `selectors/<feature>.yaml`**

Replace `name: '<baseText>'` with `name: '{{<varName>}}'`. Preserve quoting style.

**6b. Update `test-data/<feature>.yaml`** (base locale, complete dictionary)

Append new keys at the end, grouped under a `# === i18n: <screen> ===` comment:

```yaml
# === i18n: home ===
nav_about: 'Giới thiệu SAA 2025'
nav_awards: 'Thông tin giải thưởng'
```

**6c. Create `test-data/<feature>.<locale>.yaml`** (overlay, only diffs)

```yaml
# home — <locale> overlay. Only keys that change vs base.
# Run with: SUNGEN_ENV=<locale> npx playwright test ...

nav_about: 'About SAA 2025'
nav_awards: 'Awards Info'
```

**6d. (URL/query mechanism only) Update Pages selectors**

URL prefix:

```yaml
home:
  type: 'page'
  value: '{{base_path}}/'
awards:
  type: 'page'
  value: '{{base_path}}/awards'
```

Add to test-data:
```yaml
# base
base_path: ''

# overlay
base_path: '/en'
```

Query param mechanism: append `query_suffix` similarly.

UI switcher: do NOT modify Pages. Write storage delta into `specs/generated/locale-config.json` (sibling of generated `base.ts` + `locale-fixture.ts`) (6f).

**6f. Storage injection config — `specs/generated/locale-config.json` (sibling of generated `base.ts` + `locale-fixture.ts`)**

Always write `specs/generated/locale-config.json` (sibling of generated `base.ts` + `locale-fixture.ts`) with the verified storage delta from Phase 3.5/3.6. Consumed by `specs/locale-fixture.ts` (auto-generated alongside `specs/base.ts`), which wraps Playwright's context and calls `addInitScript` + `addCookies` BEFORE the first navigation.

Schema:

```json
{
  "$schema": "sungen-locale-config-v1",
  "sessionStorage": {
    "saa-language-preference": "${SUNGEN_ENV}"
  },
  "localStorage": {},
  "cookies": [],
  "notes": "Detected by /sungen:locale on YYYY-MM-DD. ..."
}
```

Use `"${SUNGEN_ENV}"` (or `"{{SUNGEN_ENV}}"`) as placeholder for runtime substitution. Use hardcoded literals when the stored value is fixed regardless of locale. Drop auth tokens / session IDs even if the Phase 3.5 diff captured them.

Multi-locale projects use the same file — placeholder gets substituted at runtime per locale.

**6e. Compile**

Run `sungen generate --screen <name>` (or `--flow`) and report any compile errors. Selectors changed → compile MUST succeed before run-test.

## Phase 7 — Hand off

Print summary:
- N selectors converted to `{{var}}`
- M base keys added to `test-data/<feature>.yaml`
- K overlay keys written to `test-data/<feature>.<locale>.yaml`
- Pages selectors updated: yes/no
- Locale-switching mechanism: URL prefix `/en` / query `?lang=en` / UI switcher / manual

Suggest:

```
/sungen:run-test <name> --env <locale>
```

## Multi-feature screens

If the screen has multiple `.feature` files (e.g. `home.feature` + `home-modal.feature`), repeat Phase 1 → Phase 6 for each feature file with its own selectors + test-data pair. Phase 2 + 3 run **once per screen** — mechanism is the same. Phase 4 runs per feature because UI scope differs.

## What NOT to do

- Do not edit `.feature` files. The i18n shape is already correct there (`{{var}}` was the convention from the start). Only selectors + test-data need surgery.
- Do not write a separate selectors file per locale (`home.en.yaml`). One selectors file with `{{var}}` works across all locales.
- Do not delete keys from the base `test-data/<feature>.yaml`. Always append.
- Do not run tests in this skill. Hand off to `/sungen:run-test`.
- Do not commit. Hand off to user.
