---
name: add-flow
description: 'Add a new Sungen flow — scaffolds directories for E2E cross-screen testing, helps fill spec.md, and can capture visuals via the capture skills'
argument-hint: [flow-name] [--path <start-url>]
allowed-tools: Read, Grep, Bash, Glob, Edit, Write, AskUserQuestion, mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__figma__get_design_context, mcp__figma__get_variable_defs, mcp__figma__get_screenshot
---

You are adding a new Sungen flow for E2E cross-screen test generation.

## Parameters

Parse from `$ARGUMENTS`:
- **flow** — flow name (e.g., `award-submission`, `user-onboarding`)
- **--path \<url\>** — starting page URL path (default: `/login`)
- **--description \<text\>** — flow description (optional)

If **flow** is missing, ask: "What is the flow name? (e.g., `award-submission`, `user-onboarding`)"
If **path** is missing, ask: "What is the starting URL path? (e.g., `/login`)"

## Steps

### 1. Scaffold the flow

```bash
sungen add-flow --flow <name> --path <path>
```

This creates:
```
qa/flows/<name>/
├── features/<name>.feature        # Gherkin with @flow tag, Background, sample scenarios
├── selectors/<name>.yaml          # Namespaced keys: "login:submit", "awards:submit"
├── test-data/<name>.yaml          # Namespaced data: login.email, submission.nominee
└── requirements/
    ├── spec.md                    # Flow specification
    └── ui/                        # Screenshots, mockups
```

### 1a. Identify the screens in the flow

Ask the user: "Which screens does this flow visit, in order? (e.g., login → dashboard → award-form → confirmation)"

Record the screen list — you will need it for:
- Filling `spec.md` (Step 3)
- Suggesting `[Screen:Element]` namespace prefixes
- Capturing visuals per screen (Step 2)

### 2. Capture visual source

Use `AskUserQuestion`: *"Pick a visual source for this flow's screens:"*
- **Figma designs** (Recommended for pre-launch) — invoke `sungen-capture` skill (mode figma-mcp) for each screen
- **Live page scan** (dev/staging is up) — invoke `sungen-capture` skill (mode live) for each screen URL
- **Local images** — invoke `sungen-capture` skill (mode local) to load from `requirements/ui/`
- **Skip** — user will drop images manually into `requirements/ui/` later

Each capture skill writes outputs into `qa/flows/<name>/requirements/ui/` and reports back a summary. Do not inline capture logic here — always delegate to the skill so behavior stays consistent with `/sungen:create-test`.

### 3. Fill spec.md

Use `AskUserQuestion`: *"Fill `spec.md` now? (You can reference the captured visuals)"* — offer **Yes, fill now (Recommended)** / **Skip, fill later**.

If yes → open `qa/flows/<name>/requirements/spec.md` and help the user fill:
- **Screens list** — ordered list of screens with URL paths
- **Flow steps** — what the user does at each screen
- **Transitions** — what triggers navigation between screens
- **Business rules** — cross-screen validation, state that persists
- **Test data** — what data is entered at each screen

Reference the captured visuals from Step 2 to suggest field names, form elements, and UI states.

### 4. Next steps

Tell the user what was created, then use `AskUserQuestion` to offer next steps:

- **`/sungen:create-test <name>`** — Create test scenarios for the flow (Recommended)
- **Done for now** — I'll come back later

If user picks `/sungen:create-test`, **you MUST use the Skill tool** to invoke it. Do NOT generate test cases yourself — the skill auto-loads `sungen-gherkin-syntax` and `sungen-tc-generation`.

## Key Rules

- Flows are **independent** from screens — own selectors, own test-data
- Selectors use `[Screen:Element]` namespace format with colon
- YAML keys must be **quoted** due to colon: `"login:submit":`
- Test data namespaced by phase: `login.email`, `submission.nominee`
- `@flow` tag required at feature level
- `Background:` should only contain the starting page navigation
- Each scenario = one phase of the journey
