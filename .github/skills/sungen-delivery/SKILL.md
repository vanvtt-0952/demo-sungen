---
name: sungen-delivery
description: 'Export Gherkin scenarios + Playwright results → CSV test case deliverable. Auto-loaded by delivery command.'
user-invocable: false
---

## Purpose

Export test cases from Sungen screens and flows to a standardized CSV file (format BM-2-901-13) for QA delivery.

**This skill delegates all heavy work to the `sungen delivery` CLI.** The CLI is the single source of truth for parsing logic — do NOT re-parse files in AI. Your role is only to:

1. Invoke the CLI
2. Show its output verbatim
3. Help the user react to pre-flight failures

---

## Architecture

```
User → /sungen:delivery [name...]
       │
       ▼
  sungen delivery CLI  (deterministic — no AI tokens)
  ├─ Scope detection (no-arg = all screens + flows)
  ├─ Auto-detect: qa/flows/<name>/ → flow, qa/screens/<name>/ → screen
  ├─ Pre-flight source checks per target
  ├─ Parse .feature (metadata)
  ├─ Parse .spec.ts (resolved Playwright code — source of truth)
  ├─ Parse test-data.yaml (resolve {{vars}})
  ├─ Parse test-results/results.json (match test titles)
  ├─ Merge sources + generate CSV rows
  └─ Write qa/deliverables/<name>-testcases.csv
```

Source modules: `src/exporters/*.ts`

---

## Required sources (CLI pre-flight checks these)

| # | Source | Screen path | Flow path | Created by |
|---|--------|-------------|-----------|------------|
| 1 | Feature file | `qa/screens/<name>/features/<name>.feature` | `qa/flows/<name>/features/<name>.feature` | `add-screen`/`add-flow` + `create-test` |
| 2 | Test data | `qa/screens/<name>/test-data/<name>.yaml` | `qa/flows/<name>/test-data/<name>.yaml` | `create-test` |
| 3 | Selectors | `qa/screens/<name>/selectors/<name>.yaml` | `qa/flows/<name>/selectors/<name>.yaml` | `run-test` |
| 4 | Compiled spec | `specs/generated/<name>/<name>.spec.ts` | `specs/generated/flows/<name>/<name>.spec.ts` | `sungen generate` |
| 5 | Test results | `specs/generated/<name>/<name>-test-result.json` or `test-results/results.json` | `specs/generated/flows/<name>/<name>-test-result.json` or global fallback | `run-test` |

**Sources 1-4 are blocking** — CLI aborts if any is missing.
**Source 5 is optional** — CSV is still generated but Test Result/Date/Executor/Env columns are empty (all tests show as Pending).

The CLI reads the **per-target result file first** (co-located with `.spec.ts`), then falls back to the global `test-results/results.json`. Per-target is preferred because the global file gets OVERWRITTEN each time Playwright runs, losing results from earlier targets.

---

## Column mapping (handled by CLI)

| CSV Column | Source |
|------------|--------|
| TC ID | Generated, namespaced per screen/flow: `<SCREEN_UPPER>-<CAT>-<NNN>` (e.g. `VP-SEC-001` on screen `login` → `LOGIN-SEC-001`). The namespace makes it globally unique — the stable key the dashboard tracks each test case by. |
| Category 1 | Scenario name with VP prefix stripped |
| Category 2 | VP group: `VP-SEC`→Accessing, `VP-UI`→GUI, `VP-VAL`/`VP-LOGIC`→Function |
| Category 3 | Feature name (first line of `.feature`) |
| Category 4 | Screen name |
| Pre-condition | Auth tag → "Logged in as X" / "Not authenticated" + Given steps (natural language) |
| Test Data | `{{vars}}` from scenario resolved via test-data.yaml → `key: value; key2: value2` |
| Steps | `.spec.ts` code comments for interactions (numbered) |
| Expected results | `.spec.ts` `expect(...)` comments (numbered) |
| Priority | Tag: `@high`/`@normal`/`@low` (default: Normal) |
| Testcase type | `@manual` → Manual, else Auto. Not compiled → "Not compiled" |
| Test Result | results.json status: passed→Passed, failed/timedOut→Failed, skipped→N/A, else Pending |
| Executed Date | results.json startTime formatted as `dd/mm/yyyy` |
| Test Executor | `git config user.name` |
| Test Environment | `playwright.config.ts` baseURL + project name |
| Note | Error message + trace path (for failed tests) |

---

## XLSX sheets — Auto / Manual split

The `.xlsx` is split into two sheets so QA manages the sets separately:
- **`Auto`** — automatable test cases (`Auto` + `Not compiled`).
- **`Manual`** — `@manual` test cases (always present, header-only when there are none).

Multi-locale (no `SUNGEN_ENV`): one **`<LOCALE> Auto`** sheet per locale + a single shared **`Manual`** sheet (manual TCs are locale-invariant). The **CSV stays one file with every row** — the `Testcase type` column distinguishes Auto vs Manual.

---

## Excluded from CSV

- `@steps:<name>` **base** scenarios — these are setup-only, inlined into `@extend:...` scenarios at compile time
- Default scaffold `Sample scenario for <screen>` — not a real test

---

## CLI command reference

```bash
# Export all screens and flows
sungen delivery

# Export specific targets (auto-detects screen vs flow)
sungen delivery kudos awards nomination-flow

# Skip pre-flight (CI only)
sungen delivery --skip-preflight

# Skip targets with blocking misses
sungen delivery --continue-on-missing
```

Output: `qa/deliverables/<name>-testcases.csv` (UTF-8 with BOM)
