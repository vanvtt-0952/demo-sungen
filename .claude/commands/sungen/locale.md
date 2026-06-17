---
description: 'Bootstrap i18n for a screen/flow — audit selectors, detect locale switch mechanism via Playwright, generate test-data overlay so `sungen:run-test --env <locale>` works.'
argument-hint: "<name> <locale> [--base-locale <code>] [--offline]"
allowed-tools: Read, Grep, Bash, Glob, Edit, Write, AskUserQuestion, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_click, mcp__playwright__browser_storage_state, mcp__playwright__browser_set_storage_state
---

## Role

You are a **Senior QA Localization Engineer**. Use the `sungen-locale` skill — it contains the full phased strategy. Your job in this command is parameter parsing, context detection, and final hand-off.

## Parameters

Parse from `$ARGUMENTS`:
- **name** — screen or flow name (e.g. `home`, `awards`, `kudo-to-display-on-kudos`). If missing → AskUserQuestion.
- **locale** — target locale code (e.g. `en`, `ja`, `en-US`, `staging-ja`). If missing → AskUserQuestion. This becomes the suffix in `test-data/<feature>.<locale>.yaml` and `SUNGEN_ENV=<locale>` at run time.
- **`--base-locale <code>`** — optional. The locale of existing `test-data/<feature>.yaml`. Default `vi`. Used only for reporting/UX — files never get renamed.
- **`--offline`** — force OFFLINE mode (skip Playwright capture). Useful when you know the live page can't be reached or when prepping a test-only template.

Reject if name == locale (common typo).

## Auto-detect context

Same as `/sungen:run-test`:
- `qa/flows/<name>/` exists → flow mode (base path: `qa/flows/<name>/`)
- Else `qa/screens/<name>/` exists → screen mode (base path: `qa/screens/<name>/`)
- Neither exists → tell user and stop

## Steps

The `sungen-locale` skill defines 7 phases. Execute them in order:

1. **Phase 1 — Selector audit** (always, no MCP)
2. **Phase 2 — Capture base locale** (Live mode only)
3. **Phase 3 — Switch locale + detect mechanism** (Live mode only)
4. **Phase 4 — Diff base ↔ target** (Live mode only)
5. **Phase 5 — Confirm proposal** (always)
6. **Phase 6 — Apply files** (always, after confirmation)
7. **Phase 7 — Hand off** (always)

**Mode selection** happens at the start of Phase 2:

- If `--offline` flag → OFFLINE mode (skip Phases 2-4, Phase 5 shows empty `target text` column for user to fill manually).
- Else try `browser_navigate(baseURL)` — if it succeeds and page renders content → LIVE mode.
- If navigate fails / page redirects to login / shows blocker → fall back to OFFLINE mode automatically. Announce the fallback clearly so the user knows what they got.

## Enumerate features

For multi-feature screens (e.g. `home` has `home.feature` + `home-modal.feature`), run Phases 1, 4, 6 once **per feature file**; run Phases 2 & 3 (live capture + mechanism detection) **once per screen** — the mechanism doesn't change between features in the same screen.

Discover features the same way delivery does:

```bash
ls qa/screens/<name>/features/*.feature
# or
ls qa/flows/<name>/features/*.feature
```

## After Phase 7

Use `AskUserQuestion` to offer next steps:

- **`/sungen:run-test <name> --env <locale>`** — Run the tests against the new locale (Recommended)
- **`/sungen:locale <name> <other-locale>`** — Bootstrap another locale (e.g. add `ja` after `en`)
- **Open the overlay file** — Show `test-data/<feature>.<locale>.yaml` so user can review / edit before running
- **Done** — Stop

## Notes

- Do NOT run tests yourself. `/sungen:run-test` is the executor. This command only PREPS files.
- Do NOT modify `.feature` files. Localization happens entirely through `selectors/*.yaml` + `test-data/*.yaml`.
- Auth blocker on SAA staging? Use `--offline`. See [[saa-auth-blocker]] memory.
