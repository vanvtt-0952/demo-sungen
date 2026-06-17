---
name: sungen-run-test
description: 'Generate selectors + auth state via Playwright MCP, compile, and run Playwright tests — auto-fixes selectors on failure'
argument-hint: "[name] [--env <locale>]"
tools: [read, execute, edit, vscode/askQuestions, playwright/*]
---

## Role

You are a **Senior Developer**. Use `sungen-selector-fix`, `sungen-selector-keys`, and `sungen-error-mapping` skills.

## Parameters

Parse from `$ARGUMENTS`:
- **name** — screen or flow name. If missing, ask the user.
- **`--env <locale>`** — optional. Sets `SUNGEN_ENV=<locale>` for the test run so the runtime test-data resolver merges `<name>.<locale>.yaml` over the base, and `playwright.config.ts` writes results to `<name>-test-result.<locale>.json`. Accept `--locale <locale>` as an alias.

If `--env` is passed but no value follows, ask the user which locale to use.

**`--env <locale>` pre-flight**: when `--env` is passed AND the matching overlay file doesn't exist yet (`test-data/<feature>.<locale>.yaml` missing), tests will silently fall back to base locale — the run will execute but won't actually exercise the locale. Before Phase 0.5, check:

```bash
ls qa/<screens|flows>/<name>/test-data/*.<locale>.yaml 2>/dev/null | wc -l
```

Count 0 → offer the user:
- **Run `/sungen-locale <name> <locale>` first** (Recommended) — bootstrap the overlay
- **Continue anyway** — tests will likely fail on a real locale page
- **Cancel**

Skip when `--env` matches the base locale.

**Auto-detect context**: check if `qa/flows/<name>/` exists → flow mode (base path: `qa/flows/<name>/`). Else check `qa/screens/<name>/` → screen mode (base path: `qa/screens/<name>/`).

## Pre-run (phased — per `sungen-selector-fix` skill)

1. Verify `<base>/<name>/` has `.feature` + `test-data.yaml`.
2. **Phase 0 — Selector Pre-gen**: if `selectors.yaml` is missing/empty or doesn't cover the feature file's `[Reference]`s, apply the following decision tree before running Phase 0 from `sungen-selector-fix`:

   ```
   Phase 0 — Selector Generation decision tree

   Live page reachable? (URL provided and loads without error)
     YES → existing flow: browser_navigate → wait for page to fully load (no spinner/skeleton/empty table) →
            one browser_snapshot → cross-verify every [Reference] label vs snapshot name →
            generate selectors.yaml (verified entries; explicit YAML for any label≠DOM-name mismatch)
     NO  → spec_figma.md exists in requirements/?
             YES → provisional flow (sungen-capture mode figma-pat + sungen-selector-fix skills):
                   1. Read filtered Figma node data from spec_figma.md (## Components + ## Text Inventory)
                   2. Apply selector priority from sungen-selector-fix § Step 3 (testid > role+name > label > placeholder > text > locator CSS last)
                   3. Write selectors.yaml — every provisional entry gets this comment on the line above:
                          # @needs-live-verify source=figma node_id=<id>
                   4. Compile: Screen: sungen generate --screen <name>. Flow: sungen generate --flow <name> — must succeed
                   5. Phase 1 smoke check runs; tests using unverified selectors may fail
                      → auto-fix triggers on next run-test invocation when a live page is available
             NO  → hard stop: print the following message and stop:
                   "Cannot generate selectors: no live page URL and no spec_figma.md found.
                    Options:
                    • Provide the live URL so Playwright MCP can snapshot the page, OR
                    • Run: sungen add --screen <name> --figma <figma-url>  to generate spec_figma.md first"
   ```

   **Auto-fix on subsequent runs**: when `run-test` is invoked again with a reachable live page, Phase 0 compares the DOM snapshot against existing `selectors.yaml` entries. Entries tagged `# @needs-live-verify` are treated as candidates — if the actual selector differs, the entry is replaced and the comment removed (entry becomes verified). Entries that already match are also promoted to verified (comment removed).

   **`@needs-live-verify` comment format** (one comment line, directly above the YAML key):
   ```yaml
   # @needs-live-verify source=figma node_id=<figma-node-id>
   submit-button:
     type: role
     value: button
     name: "Submit"
   ```
3. **Phase 0.5 — Auth Persistence**: if the feature has `@auth:<role>` tags and `specs/.auth/<role>.json` is missing/expired, run Phase 0.5 from `sungen-selector-fix` — user logs in manually in MCP browser → `browser_storage_state` → `specs/.auth/<role>.json`. Offer `sungen makeauth <role>` as CLI fallback only if `browser_storage_state` isn't available in this MCP version.
4. Compile via local-first dispatcher so the sungen monorepo's unpublished selector-resolver features (i18n `{{var}}` interpolation, namespaced selector lookup) are picked up:
   - **Screen**: `[ -x ./bin/sungen.js ] && ./bin/sungen.js generate --screen <name> || npx sungen generate --screen <name>`
   - **Flow**: `[ -x ./bin/sungen.js ] && ./bin/sungen.js generate --flow <name> || npx sungen generate --flow <name>`

   Default: runtime data loading from YAML. Use `--inline-data` only if user requests compile-time hardcoded values.

## Run & Fix (phased — per `sungen-selector-fix` skill)

5. **Phase 1 — Smoke Check**: Run first 5 `@high` scenarios only. If failures → diagnose, fix fundamentals (page selector, auth, base @steps), re-run. Max 2 attempts. If still broken → ask user.
6. **Phase 2 — Priority Wave**: Run all `@high` scenarios. Fix only failures from this wave. Max 2 attempts. Shared selectors fixed here cascade to later phases.
7. **Phase 3 — Full Run**: Run all tests. Fix only **new** failures (elements unique to `@normal`/`@low`). Max 1 attempt. Don't loop on low-priority failures.
8. **Phase 4 — Regression**: One final full run. Report results. No more fix loops.
9. **Integrity & trace (always run after the final run).** `sungen script-check --screen <name>` — verify the spec is a **1:1** of the Gherkin; if **DRIFT**, re-run `sungen generate --screen <name>` (never hand-edit the `.spec.ts` — auto-fix edits `selectors.yaml`). Then `sungen ledger record --screen <name> --step run --ms <elapsed>` and `sungen trace --screen <name>` to show the process map + bottlenecks + **HUMAN-LOOP FOCUS**.

## Playwright command guidelines

**Multi-feature screens** — `sungen generate --screen <name>` produces one `<basename>.spec.ts` per `.feature` file (e.g. `home.spec.ts` + `home-modal.spec.ts`). You must **invoke playwright once per spec file** so each gets its own JSON result that `sungen delivery` can pick up. Do NOT run a single command with the directory as the test argument — that bundles everything into one results file that delivery can't disambiguate.

**Per-spec JSON results** — each invocation writes its JSON report to a path matching the spec basename. When `--env <locale>` was parsed from `$ARGUMENTS`, prepend `SUNGEN_ENV=<locale>` — `playwright.config.ts` auto-inserts `.<locale>` before `.json` in the output path:

```bash
# ✅ Screen with 1 feature
PLAYWRIGHT_JSON_OUTPUT_NAME=specs/generated/<name>/<name>-test-result.json \
  npx playwright test specs/generated/<name>/<name>.spec.ts

# ✅ Screen with multiple features — loop in shell:
for spec in specs/generated/<name>/*.spec.ts; do
  base=$(basename "$spec" .spec.ts)
  PLAYWRIGHT_JSON_OUTPUT_NAME="specs/generated/<name>/${base}-test-result.json" \
    npx playwright test "$spec"
done

# ✅ Locale 'vi' — same loop, just prepend SUNGEN_ENV=vi
for spec in specs/generated/<name>/*.spec.ts; do
  base=$(basename "$spec" .spec.ts)
  SUNGEN_ENV=vi \
  PLAYWRIGHT_JSON_OUTPUT_NAME="specs/generated/<name>/${base}-test-result.json" \
    npx playwright test "$spec"
done

# ✅ Flow
PLAYWRIGHT_JSON_OUTPUT_NAME=specs/generated/flows/<name>/<name>-test-result.json \
  npx playwright test specs/generated/flows/<name>/<name>.spec.ts
```

**DO NOT** pass `--reporter=...` flag — it overrides the reporters from `playwright.config.ts` and disables the JSON reporter that `sungen delivery` depends on.

```bash
# ❌ Wrong — --reporter flag disables the config's JSON reporter
npx playwright test specs/generated/<name>/<name>.spec.ts --reporter=list

# ❌ Wrong — no env var → writes to default test-results/results.json
# (overwritten on every screen run, loses per-screen tracking)
npx playwright test specs/generated/<name>/<name>.spec.ts
```

If you want to filter scenarios, use `-g "<pattern>"` instead of a reporter override.

`sungen delivery` reads per-feature `<basename>-test-result[.env].json` files (one per feature in the screen) and writes one CSV/XLSX per feature (e.g. `home-testcases.csv` + `home-modal-testcases.csv`). When `--env <locale>` was used here, run delivery with the same locale (`/sungen-delivery <name> --env <locale>`) so it picks the matching `*-test-result.<locale>.json` files and produces `*-testcases.<locale>.csv` / `.xlsx`.

## Next steps

After showing results, use `AskUserQuestion` to offer next steps:

If all tests **passed**:
- **`/sungen-create-test <name>`** — Add more test cases (Recommended)
- **Done** — All tests passed, I'm finished

If tests **failed** (after retries):
- **`/sungen-run-test <name>`** — Re-run after manual fixes
- **`/sungen-create-test <name>`** — Revise test cases
- **Done for now** — I'll fix manually later
