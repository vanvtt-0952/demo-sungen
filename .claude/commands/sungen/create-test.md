---
name: create-test
description: 'Create or update test cases for a Sungen screen — generates feature + test-data files (tier-based: critical+high first, expand later)'
argument-hint: [screen-name]
allowed-tools: Read, Grep, Bash, Glob, Write, AskUserQuestion, Skill, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_take_screenshot
---

## ⛔ HARD RULE — No Figma MCP when PAT data exists

If `spec_figma.md` exists OR the user provides a Figma URL for the PAT flow:
- Do NOT call any `mcp__figma__*` tool. The PAT flow uses the `sungen` CLI, not MCP.
- Run `sungen add --screen <screen> --figma '<url>'` via Bash (**single-quote the URL**) then invoke the `sungen-capture` skill (**mode figma-pat**).

---

## Role

You are a **Senior QA Engineer** specialized in test case design. You structure test cases by viewpoint categories and translate UI into Gherkin test cases following `sungen-gherkin-syntax` and `sungen-tc-generation` skills. **Tier 1 (critical+high) first** — expand coverage later. Focus on **Gherkin scenarios and test data only** — selectors are handled during `/sungen:run-test`.

**Quality is built in, not a second command.** After generating, you run a **harness loop**: `sungen audit` measures the output (viewpoint gate, assertion depth, balance, duplicates, traceability) and you **repair the findings** until critical viewpoints are covered — the user does not need to ask for this. Auto-load the `sungen-harness-audit` skill for how to read the report and map each finding to a repair. (`/sungen:design` is an **alias** of this command.)

## Parameters

Parse **name** from `$ARGUMENTS`. If missing, ask the user.

**Auto-detect context**: check if `qa/flows/<name>/` exists → flow mode. Else check `qa/screens/<name>/` → screen mode. This determines paths, generation strategy, and CLI commands.

## Steps

1. **Flow**: Verify `qa/flows/<name>/` exists. If not → `/sungen:add-flow` first.
   **Screen**: Verify `qa/screens/<name>/` exists. If not → `/sungen:add-screen` first.
2. Check if `.feature` file already has scenarios.
   - If yes → use `AskUserQuestion` to ask the update mode (see `sungen-tc-generation` skill — mode depends on which tiers already exist).
   - If no → fresh creation. Use `AskUserQuestion` to ask generation scope:
     - **Tier 1 — Critical & High priority** — ~10-15 scenarios/section covering happy paths, core validation, security basics **(Recommended)**
     - **Full coverage — All tiers at once** — generates Tier 1 + 2 + 3 in one run. Large output (~40-60 scenarios/section), best for experienced users who want complete coverage immediately
3. **Read project context + screen requirements**

   **Project context** — check `qa/context.md` (project root, not screen-specific):
   - If exists → read it. Extract: roles, testing strategy directives, global business rules, error patterns.
   - Summarize what you found in one line (e.g. `"Roles: admin/staff/user | Strategy: focus security, skip VP-UI T1 | 2 global rules"`).
   - These are carried into the Coverage Map when invoking `sungen-tc-generation`.
   - If absent → continue without it, no action needed.

   **Screen requirements** — check `qa/<screens|flows>/<name>/requirements/`:
   - If `spec.md` exists → read it as PRIMARY source (sections, fields, validation rules, business rules, states).
   - If `test-viewpoint.md` exists → read it. If it only contains HTML comments (scaffold template), use `AskUserQuestion` to ask:
     - **Fill test-viewpoint.md first** — I'll help you identify edge cases, known issues, and design decisions for this screen before generating tests
     - **Continue without it** — generate tests from spec and other sources only

   **Context discovery (prefer an isolated agent).** Reading all sources here can flood this context. **Claude Code:** spawn the **`sungen-discovery`** sub-agent (Task tool, `subagent_type: sungen-discovery`) to read spec/figma/ui/live in isolation and return a **compact discovery report** (sources, completeness, conflicts, recommended route, key facts); use that report instead of pasting raw sources. **Copilot / no sub-agents:** do the reading inline as below.

   **Auto-detect visual source** — do NOT ask the user to pick a source. Instead, check what already exists and use it:
   1. If `spec_figma.md` exists → read it as Figma supplement (PAT flow already completed during `add-screen`). Do NOT call any `mcp__figma__*` tool.
   2. If `ui/` has images (`.png`, `.jpg`, etc.) → read them for visual context (layout, element positions, states).
   3. If neither exists → use `AskUserQuestion` to ask: *"No visual source found. Pick one:"* — then invoke the **`sungen-capture`** skill with the matching **mode** (read only that mode's file):
      - **Figma PAT** — ask for URL, run `sungen add --screen <screen> --figma '<url>'` via Bash, then `sungen-capture` **mode figma-pat**
      - **Figma MCP** — `sungen-capture` **mode figma-mcp**
      - **Live page scan** — `sungen-capture` **mode live**
      - **Skip** — generate from spec.md only

   (When `spec_figma.md` exists, that is also `sungen-capture` **mode figma-pat**; when `ui/` images exist, that is **mode local**.)

   **Cross-check**: if both `spec.md` and visual sources exist, flag any discrepancies (missing fields, different labels) before moving on. When `spec_figma.md` is present, follow the Figma supplement rules in `sungen-tc-generation` skill (reading order, Text Inventory, conflict handling).

   Summarize what you found in requirements and present to the user.

4. Follow the `sungen-tc-generation` skill for section identification, viewpoint generation, and output format. **Viewpoint loading discipline:** `sungen-viewpoint` is a **router** — from the page-type (form / list / detail / auth / dashboard …) read **only the matching group file(s)** (e.g. a login screen → group-e-identity; a product list → group-c-data-explore), never all five groups. This keeps the generation context lean. **For flows**, use the "Flow Test Generation" section in the skill. When requirements exist, use the "Requirements-Driven Generation" strategy. **For Tier 1**, apply the **Lightweight Guard** — verify required fields, validation rules, business rules, security checks, and key state transitions all have TCs after generation. **For Tier 2+**, **MUST** apply the full **Mapping Contract** — walk every `spec.md` section top-to-bottom and produce the indicated TCs per Table 1; handle `test-viewpoint.md` per Table 2. Do not silently skip sections.
5. Generate or update `.feature` + `test-data.yaml` following `sungen-gherkin-syntax` and `sungen-tc-generation` skills. **For flows**: use `[Screen:Element]` namespace format, namespace test-data by phase, add `@flow` tag.

5.5. **Quality gate & repair (harness — always run, do NOT skip).** Follow the `sungen-harness-audit` skill:
   - Run `sungen audit --screen <name>` (Bash) and read `gateStatus` + `findings` (deterministic, structural).
   - **Independent semantic review.** **Claude Code:** spawn the **`sungen-reviewer`** sub-agent (Task tool, `subagent_type: sungen-reviewer`) — it judges what the gate can't (does each scenario's steps PROVE its title/viewpoint, observable Thens, business-critical assertion depth) and returns `VERDICT` + `ISSUES` with concrete fixes. **Merge its NEEDS-REPAIR issues with the audit findings.** (Copilot / no sub-agents: run the same review inline using the `sungen-reviewer` criteria.)
   - Repair **both** the audit findings and the reviewer issues (budget 3 rounds), then re-audit:
   - If the gate FAILs or there are findings, **repair** (budget 3 rounds), then re-audit:
     - **GATE** missing critical theme → generate scenarios for it. If it is **cross-screen** (cart-correctness, product-detail-consistency, filter-result-correctness): write the scenario with **observable data assertions** (`... with {{value}}`, `table ... with {{value}}`), tag it `@manual`, and add a comment `# Deferred to a flow (<screen> -> <target>) for automation`. Do **not** fake a shallow single-screen pass.
     - **DEPTH** → replace `see [X] page/section` on business-critical scenarios with data assertions.
     - **BALANCE** → stop expanding secondary viewpoints; add business-core scenarios first.
     - **TRACE** → align `VP-` ids with the viewpoint-overview.
   - Stop when the gate PASSes and findings clear, **or** the budget is exhausted → report residual gaps honestly (never fake a pass).

5.6. **Record (reuse + observability).** Build the manifest and report usage:
   - `sungen manifest --screen <name>` — fingerprints for next-run change detection. On a **re-run**, start the whole command by `sungen manifest --screen <name> --diff` and only regenerate scenarios whose spec section changed (keep/regenerate/retire).
   - **Ledger each phase** (so `sungen trace` can map the whole process): pick one `runId` at the start (e.g. a timestamp) and append `sungen ledger record --screen <name> --run <runId> --step <discovery|viewpoint|gherkin|audit|repair:N> --ms <elapsed>` (add `--tokens-in/--tokens-out` if known). The `--run` id groups this invocation so `trace`/`ledger report` show THIS run, not a mix of past runs. Do this for **every** phase, not just repair.

6. **Converge — show the trace.** Run `sungen trace --screen <name>` and present to the user: the process map (phases + repair rounds), bottlenecks, and the **HUMAN-LOOP FOCUS** (@manual scenarios they must verify) + audit score & gate status & residual/cross-screen gaps. Then use `AskUserQuestion` to offer next steps based on which tier was just generated:

   > The harness gate + reviewer already ran above — you do **not** need `/sungen:review` as a next step (it's the independent checkpoint for hand/prompt-authored or pre-delivery cases). Recommend `run-test` or expanding coverage.

   **Optional — exploration mode (Loop 2).** The suite above is the deterministic, official output. If the user wants to push past "the machine always gives the same thing", offer to run the **challenge pass**: `sungen challenge --screen <name>` (deterministic structural critics) then the **`sungen-challenge` agent** (Task tool, `subagent_type: sungen-challenge`) for semantic + novelty candidates. It is **advisory** — surfaces blind spots + ≤20% novelty candidates, never auto-merges. When the user confirms a recurring miss, record it with `sungen blindspot add` so future runs don't repeat it.

   **After Tier 1 generation:**
   - **`/sungen:run-test <name>`** — Generate selectors and run tests now (Recommended)
   - **`/sungen:create-test <name>`** — Expand coverage: add @normal + @low scenarios (Tier 2)
   - **Done for now** — I'll come back later

   **After Tier 2 generation:**
   - **`/sungen:create-test <name>`** — Deep coverage: add BVA combos, cross-field validation, negative inputs, race conditions (Tier 3) (Recommended)
   - **`/sungen:run-test <name>`** — Generate selectors and run tests now
   - **Done for now** — I'll come back later

   **After Tier 3 or Full generation:**
   - **`/sungen:run-test <name>`** — Generate selectors and run tests now (Recommended)
   - **`/sungen:create-test <name>`** — Add more sections if the screen changed
   - **Done for now** — I'll come back later

**No selectors.yaml** — selectors are generated during `/sungen:run-test`.
