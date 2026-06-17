---
name: sungen-add-screen
description: 'Add a new Sungen screen or a sub-feature to an existing one — scaffolds directories, helps fill spec.md, and can auto-capture a live-page screenshot via Playwright MCP'
argument-hint: '[screen-name] [url-path] [--feature <name>] [--figma <url>]'
agent: 'agent'
tools: [vscode, execute, read, agent, edit, search, web, browser, todo, 'playwright/*']
---

**Input**: Screen name and URL path (e.g., `/sungen-add-screen login /login`).
Optionally include a Figma URL: `/sungen-add-screen login /login --figma https://www.figma.com/design/...`.
To add a sub-feature file to an existing screen: `/sungen-add-screen awards --feature modal`.

You are adding a new Sungen screen for test generation, or extending an existing screen with an additional `.feature` file (sub-feature).

## Parameters

- **screen** — ${input:screen:screen name (e.g., login, dashboard)}
- **path** — ${input:path:URL path (e.g., /login, /dashboard)} — optional when --figma is provided or when adding a sub-feature
- **`--feature <name>`** — sub-feature name to add to an existing screen (e.g., `modal`, `filter`, `create-flow`). Creates `<screen>-<feature>.feature` + matching `selectors/<screen>-<feature>.yaml` + `test-data/<screen>-<feature>.yaml` without touching the screen's other files. Use this when one screen has multiple `.feature` files.
- **`--figma <url>`** — Figma share URL (optional)
- **`--refresh`** — bypass Figma cache and re-fetch (optional, use with --figma)
- **`--scale <n>`** — PNG export scale factor, default 2 (optional)
- **`--hi-res`** — export at 4× scale, shorthand for --scale 4 (optional)

**Mode detection** — before invoking the CLI, check whether `qa/screens/<screen>/` already exists:
- Screen does NOT exist → fresh screen creation (need `--path` unless `--figma` provided)
- Screen exists AND `--feature <name>` provided → sub-feature mode (skip spec.md, only generate the 3 new files)
- Screen exists AND no `--feature` → ask the user whether they meant to add a sub-feature (offer `--feature <suggested-name>`) or refresh visuals only (with `--figma`)

## Steps

### 1. Scaffold the screen (or sub-feature)

**Standard path (no --figma, no --feature):**

Run with #tool:terminal:
```bash
sungen add --screen ${input:screen} --path ${input:path}
```

**Sub-feature mode (`--feature <name>` provided):**

Run with #tool:terminal:
```bash
sungen add --screen ${input:screen} --feature <name> [--path ${input:path}]
# Generates qa/screens/${input:screen}/{features,selectors,test-data}/${input:screen}-<name>.{feature,yaml,yaml}
# Existing screen files (spec.md, awards.feature, …) are untouched.
# --path is optional — defaults to /${input:screen} when omitted.
```

**Figma branch (when --figma \<url\> is provided):**

Run with #tool:terminal:
```bash
sungen add --screen ${input:screen} --figma <figma-url> [--path ${input:path}] [--feature <name>] [--refresh] [--scale <n>]
# --feature can be combined with --figma when the new sub-feature has its own Figma frame.
```

This CLI command automatically:
1. Parses the Figma URL and fetches the design node.
2. Downloads frame + variant PNGs to `qa/screens/${input:screen}/requirements/ui/`.
3. Writes `qa/screens/${input:screen}/requirements/spec_figma.md` (auto-generated, always overwritten on re-run).
4. Creates `qa/screens/${input:screen}/requirements/spec.md` stub **only if the file does not already exist** — never overwrites existing human content.

**Important coexistence rules:**
- `--figma` and `--path` can be passed together.
- `spec.md` is the human-authored source of truth — never modify it automatically.
- `spec_figma.md` is auto-generated — tell the user to copy useful sections into `spec.md`.
- `--capture` (Playwright screenshot) and `--figma` can be used simultaneously.

**If Figma auth is missing**, guide the user to run `sungen figma auth set` and retry.

### 1a. Synthesize narrative sections (Figma branch only)

After `sungen add --figma` succeeds, the envelope of `spec_figma.md` is deterministic but the narrative below the `<!-- SYNTHESIS-BELOW -->` marker is empty. Invoke the `sungen-capture` skill (mode figma-pat):

1. Read `qa/screens/${input:screen}/requirements/spec_figma.md` frontmatter for `file_key`, `node_id`, `figma_version_id`.
2. Read the cached raw node JSON at `.sungen/figma-cache/<file_key>/<figma_version_id>/<safe_node_id>-raw.json` (colons in node_id become underscores).
3. Follow the skill's 7-section template (Purpose / ASCII Layout / Regions / Actions / Form Fields / Data Columns / Navigation) and **replace** everything from the marker to EOF.
4. Preserve the envelope above the marker byte-for-byte.

**Review gate.** Before moving on, show the user the synthesized narrative and ask:

- **1) Approve** — narrative looks right, continue to Step 2
- **2) Edit** — user will tweak `spec_figma.md` now; wait for confirmation before continuing
- **3) Cancel** — abort; advise the user that `spec.md` was NOT modified and they can re-run `sungen add --figma --refresh` later

### 2. Capture visual source

**If Figma branch (Step 1) already downloaded PNGs** → visuals already exist. Offer:
- **1) Continue** — Figma visuals are enough (Recommended)
- **2) Also capture live page** — supplement Figma with real page scan (invoke `sungen-capture` skill (mode live))

**If standard path (no --figma)** → go straight to source selection:
- **1) Figma design** (Recommended for pre-launch) — invoke `sungen-capture` skill (mode figma-mcp)
- **2) Live page scan** (dev/staging is up) — invoke `sungen-capture` skill (mode live)
- **3) Skip** — user will drop images manually into `requirements/ui/` later

Each capture skill writes outputs into `qa/screens/${input:screen}/requirements/ui/` and reports back. Do not inline capture logic here — delegate to the skill so behavior stays consistent with `/sungen-create-test`.

### 3. Fill spec.md

**Skip this step when `--feature` was used** — the screen's existing `spec.md` is reused for all sub-features; only suggest the user append a new section for the sub-feature if useful (e.g. `## Modal — Confirm Withdrawal`).

For fresh screen creation, ask: *"Fill `spec.md` now? (You can reference the captured visuals)"* — offer **1) Yes, fill now (Recommended)** / **2) Skip, fill later**.

If yes → open `qa/screens/${input:screen}/requirements/spec.md` and help the user fill sections, fields, validation rules, business rules, and states. Reference the captured visuals from Step 2 to suggest field names, form elements, and UI states. Especially prompt for the optional **Figma URL** and **Live URL** fields in Overview — those unlock auto-capture without re-asking next run.

### 4. Next steps

Tell the user what was created. When `--feature` was used, list the 3 new files explicitly (`features/${input:screen}-<name>.feature`, `selectors/${input:screen}-<name>.yaml`, `test-data/${input:screen}-<name>.yaml`) and remind that `/sungen-create-test` currently operates at the screen level — it will see both the parent feature and the new sub-feature and ask which one to update.

Then offer next steps:

- **`/sungen-create-test ${input:screen}`** — Create test cases from requirements/designs (Recommended)
- **Done for now** — I'll come back later

## CLI Reference

```
sungen add --screen <name>
  [-p, --path <path>]            URL route (e.g., /awards). Required for capture; defaults to /<screen> when omitted.
  [-f, --feature <name>]         Add a sub-feature .feature file to an existing screen.
                                 Output filename = <screen>-<feature>.{feature,yaml,yaml}.
  [-c, --capture]                Auto-capture a live screenshot to requirements/ui/ (needs --path).
  [-d, --description <text>]     Screen description (used in spec.md stub).
  [--figma <url>]                Figma share URL — generates spec_figma.md + ui/*.png.
  [--refresh]                    Bypass Figma cache (use with --figma).
  [--scale <n>]                  PNG export scale (default 2).
  [--hi-res]                     Shorthand for --scale 4.
```
