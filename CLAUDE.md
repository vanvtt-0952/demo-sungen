# Sungen AI Rules

You generate 3 files for sungen — a Gherkin compiler that produces Playwright tests.
**You do NOT write Playwright code.** You only write `.feature`, `selectors.yaml`, and `test-data.yaml`.

## Skills (auto-loaded when needed)

| Skill | Purpose |
|---|---|
| `sungen-gherkin-syntax` | All 70+ step patterns, selector types, YAML key rules, tags, element types |
| `sungen-error-mapping` | Playwright & sungen error → fix mapping |
| `sungen-tc-generation` | Test case generation strategy, output format |
| `sungen-test-design-techniques` | EP, BVA, Decision Table, State Transition — systematic scenario generation |
| `sungen-tc-review` | Review scoring, quality rules, checklist |
| `sungen-viewpoint` | 17 UI patterns x 4 viewpoints — coverage checklists |
| `sungen-selector-keys` | YAML key generation from `[Reference]` names, suffixes, lookup priority |
| `sungen-selector-fix` | Selector generation from live page, auto-fix strategy |
| `sungen-delivery` | Export Gherkin + Playwright results → CSV test case deliverable |
| `sungen-capture` | Acquire visual/design context — one skill, 4 modes: figma-mcp (Dev Mode MCP), figma-pat (URL → spec_figma.md), live (Playwright MCP scan), local (images in `requirements/ui/`) |
| `sungen-locale` | Bootstrap i18n — audit selectors, detect locale switch mechanism, generate test-data overlay |

## Workflow (7 AI commands)

| Command | What it does |
|---|---|
| `/sungen:add-screen <name> <path>` | Scaffold `qa/screens/<name>/` directories |
| `/sungen:add-flow <name> [--path <url>]` | Scaffold `qa/flows/<name>/` directories for E2E cross-screen testing |
| `/sungen:create-test <name>` | Generate `.feature` + `test-data.yaml` (auto-detects screen or flow) |
| `/sungen:review <name>` | Score syntax, coverage, viewpoint quality (auto-detects screen or flow) |
| `/sungen:run-test <name>` | Generate `selectors.yaml`, compile, run, auto-fix (auto-detects screen or flow) |
| `/sungen:delivery [name...]` | Export test cases → CSV for QA delivery (all screens if no arg) |
| `/sungen:locale <name> <locale>` | Bootstrap i18n for a screen — audit selectors, detect locale switch, generate overlay (run before `/sungen:run-test --env <locale>`) |

**Screen path:** add-screen → create-test → review → run-test → delivery.
**Flow path:** add-flow → create-test → review → run-test → delivery.
**i18n path:** (after run-test passes for base locale) → locale → run-test --env <locale> → delivery --env <locale>.

`create-test`, `review`, and `run-test` auto-detect context: if `qa/flows/<name>/` exists → flow mode, else `qa/screens/<name>/` → screen mode.

After each command completes, use `AskUserQuestion` to present the next actions as selectable options. Never just print text — always give clickable choices so the user can continue the workflow seamlessly.

## File Structure

### Screen (single-screen testing)

```
qa/screens/<screen-name>/
├── features/<screen>.feature      # Gherkin scenarios
├── selectors/<screen>.yaml        # Element locators (generated during run-test)
├── test-data/<screen>.yaml        # Test data variables (loaded at runtime)
├── test-data/<screen>.staging.yaml    # Environment override (optional)
├── test-data/<screen>.production.yaml # Environment override (optional)
└── requirements/
    ├── spec.md                    # Screen specification (primary source)
    └── ui/                        # Screenshots, mockups
```

### Flow (E2E cross-screen testing)

```
qa/flows/<flow-name>/
├── features/<flow>.feature        # Gherkin with @flow tag, [Screen:Element] refs
├── selectors/<flow>.yaml          # Namespaced keys: "login:submit", "awards:title"
├── test-data/<flow>.yaml          # Namespaced data: login.email, submission.nominee
├── test-data/<flow>.staging.yaml      # Environment override (optional)
├── test-data/<flow>.production.yaml   # Environment override (optional)
└── requirements/
    ├── spec.md                    # Flow specification (screens, steps, transitions)
    └── ui/                        # Screenshots, mockups
```

Flows are **independent** from screens — own selectors, own test-data. Selectors use colon-namespaced keys (`"login:submit":`) to avoid duplicate element names across screens.

```
qa/deliverables/<name>-testcases.csv   # Exported test cases (from /sungen:delivery)
qa/deliverables/<name>-testcases.xlsx  # Styled workbook for client hand-off
```

## Test Data

`{{variable}}` references in `.feature` map to keys in `test-data/<screen>.yaml`. Data is loaded **at runtime** — the same generated `.spec.ts` works across environments without recompiling.

**Environment overrides**: `SUNGEN_ENV=staging npx playwright test` merges `<screen>.staging.yaml` on top of `<screen>.yaml`. Create `<screen>.<env>.yaml` for environment-specific values (different credentials, URLs, test users).

**i18n support**: for multilingual sites, use `{{variable}}` in selector `name`/`value` fields to reference locale-dependent text from test-data. Create locale overlay files (e.g., `<screen>.vi.yaml`, `<screen>.staging-ja.yaml`) and run with `SUNGEN_ENV=vi`. One feature file + one selector file works across all locales. See `sungen-selector-keys` skill for details.

## CLI Commands

```bash
# Screen
sungen add --screen <name> --path <url-path>               # Scaffold screen directories
sungen add --screen <name> --path <path> --feature <name>   # Scaffold with sub-feature
sungen generate --screen <name>                              # Compile .feature → .spec.ts (runtime data)
sungen generate --screen <name> --inline-data                # Compile with hardcoded data (legacy)

# Flow
sungen add-flow --flow <name> --path <start-url>            # Scaffold flow directories
sungen generate --flow <name>                                # Compile flow .feature → .spec.ts

# All
sungen generate --all                                        # Compile all screens and flows
sungen delivery                                              # Export all → CSV + XLSX
sungen delivery <name>                                       # Export a single screen or flow
```
