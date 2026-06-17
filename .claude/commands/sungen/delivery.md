---
name: delivery
description: 'Export Gherkin scenarios + Playwright results to CSV test case file for QA delivery.'
argument-hint: "[screen-name...] [--env <locale>] (omit screens for all; --env for locale-specific export)"
allowed-tools: Bash, Read, AskUserQuestion
---

## Role

You are a **QA Test Delivery Engineer**. Your job is to invoke the deterministic `sungen delivery` CLI that performs all parsing and CSV export. Your role is minimal — just run the CLI and help the user if pre-flight checks fail.

## Parameters

Parse from `$ARGUMENTS`:
- **screens** — zero or more screen/flow names. Empty → CLI processes all targets in `qa/screens/` + `qa/flows/`.
- **`--env <locale>`** — optional. Sets `SUNGEN_ENV=<locale>` for the run so the CLI merges `<name>.<locale>.yaml` over the base test-data and writes `<name>-testcases.<locale>.csv` / `.xlsx`. Accept `--locale <locale>` as an alias.

If `--env` is passed but no value follows, ask the user which locale to use.

## Steps

### 1. Invoke the CLI

Run via Bash (single command, no extra parsing). Prefer the local `./bin/sungen.js` when it exists — the sungen monorepo ships local-only features the global npm package doesn't have yet (multi-sheet locale aggregation, `.<env>` filename suffix, locale-aware step rendering). Fall back to `npx sungen` in downstream projects.

```bash
# No env — local-first dispatcher:
[ -x ./bin/sungen.js ] && ./bin/sungen.js delivery <screens> || npx sungen delivery <screens>

# Locale-specific:
[ -x ./bin/sungen.js ] && SUNGEN_ENV=<locale> ./bin/sungen.js delivery <screens> || SUNGEN_ENV=<locale> npx sungen delivery <screens>
```

- If no screen args → omit `<screens>` (CLI processes all targets).
- If `--env <locale>` was provided → prepend `SUNGEN_ENV=<locale>` to the command. Do NOT pass `--env` to the CLI itself — it's not a CLI flag, only a slash-command convenience.

The CLI handles:
- Scope detection (all screens + flows vs specific)
- Pre-flight source checks with colorful output
- Parsing `.feature`, `.spec.ts`, `test-data.yaml` (+ `<name>.<env>.yaml` overlay when `SUNGEN_ENV` is set), and per-target `<name>-test-result[.<env>].json`
- Generating CSV/XLSX at `qa/deliverables/<name>-testcases[.<env>].csv` / `.xlsx`
- Printing summary table

### 2. Handle pre-flight failures (if CLI exits non-zero)

If the CLI exits with blocking issues, it will have already printed a clear table showing exactly what's missing per screen.

Use `AskUserQuestion` to offer next steps:

**Options:**
- **Fix missing sources** (Recommended) — Print the suggested commands from CLI output and stop. User will run those commands manually, then re-invoke `/sungen:delivery`.
- **Continue with available screens** — Re-run as `npx sungen delivery <screens> --continue-on-missing` to skip screens with blocking issues.
- **Cancel** — Exit.

### 3. Show summary + offer next steps (on success)

Forward the CLI's summary table to the user verbatim. Then use `AskUserQuestion`:

- **Open a specific CSV** — Help user inspect one of the exported files with Read tool.
- **Run tests to refresh results** — Suggest `/sungen:run-test <screen>` to update `test-results/results.json`, then re-run delivery.
- **Export another screen** — User can run `/sungen:delivery <other-screen>`.
- **Done** — Exit.

## Important notes

- **Do NOT parse files yourself** — the CLI is the source of truth for parsing logic. Your job is orchestration + user interaction.
- **Do NOT modify feature/spec.ts/test-data files** — the delivery is read-only.
- **The CLI already respects `@manual` tags, skips `@steps:` base scenarios, groups by Category 2, and generates UTF-8 BOM CSV for Excel compatibility with Vietnamese.**
- **Pre-flight check is built into the CLI** — use `--skip-preflight` only in CI/automated pipelines where checks are done externally.

## CLI Reference

```
sungen delivery [screens...]
  [--skip-preflight]          Skip pre-flight checks (not recommended)
  [--continue-on-missing]     Skip screens with blocking misses

# Locale-aware export (env var, not a CLI flag):
SUNGEN_ENV=<locale> sungen delivery [screens...]
  → reads <name>.<locale>.yaml overlay, picks <name>-test-result.<locale>.json,
    writes <name>-testcases.<locale>.csv / .xlsx
```
