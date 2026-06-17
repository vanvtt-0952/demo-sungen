---
name: sungen-add-flow
description: 'Add a new Sungen flow — scaffolds directories for E2E cross-screen testing, helps fill spec.md, and can capture visuals via the capture skills'
argument-hint: '[flow-name] [--path <start-url>]'
agent: 'agent'
tools: [vscode, execute, read, agent, edit, search, todo]
---

**Input**: Flow name and optional starting URL (e.g., `/sungen-add-flow award-submission --path /login`).

You are adding a new Sungen flow for E2E cross-screen test generation.

## Parameters

- **flow** — ${input:flow:flow name (e.g., award-submission, user-onboarding)}
- **--path \<url\>** — starting page URL path (default: `/login`)
- **--description \<text\>** — flow description (optional)

## Steps

### 1. Scaffold the flow

Run with #tool:terminal:
```bash
sungen add-flow --flow ${input:flow} --path ${input:path}
```

This creates:
```
qa/flows/${input:flow}/
├── features/${input:flow}.feature        # Gherkin with @flow tag, Background, sample scenarios
├── selectors/${input:flow}.yaml          # Namespaced keys: "login:submit", "awards:submit"
├── test-data/${input:flow}.yaml          # Namespaced data: login.email, submission.nominee
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

Ask: *"Pick a visual source for this flow's screens:"*
- **Figma designs** (Recommended for pre-launch) — invoke `sungen-capture` skill (mode figma-mcp) for each screen
- **Live page scan** (dev/staging is up) — invoke `sungen-capture` skill (mode live) for each screen URL
- **Local images** — invoke `sungen-capture` skill (mode local) to load from `requirements/ui/`
- **Skip** — user will drop images manually into `requirements/ui/` later

Each capture skill writes outputs into `qa/flows/${input:flow}/requirements/ui/` and reports back a summary. Do not inline capture logic here — always delegate to the skill.

### 3. Fill spec.md

Ask: *"Fill `spec.md` now? (You can reference the captured visuals)"* — offer **Yes, fill now (Recommended)** / **Skip, fill later**.

If yes → open `qa/flows/${input:flow}/requirements/spec.md` and help the user fill:
- **Screens list** — ordered list of screens with URL paths
- **Flow steps** — what the user does at each screen
- **Transitions** — what triggers navigation between screens
- **Business rules** — cross-screen validation, state that persists
- **Test data** — what data is entered at each screen

Reference the captured visuals from Step 2 to suggest field names, form elements, and UI states.

### 4. Next steps

Tell the user what was created and offer next steps:

- **`/sungen-create-test ${input:flow}`** — Generate test scenarios for the flow (Recommended)
- **Done for now** — I'll come back later

## Key Rules

- Flows are **independent** from screens — own selectors, own test-data
- Selectors use `[Screen:Element]` namespace format with colon
- YAML keys must be **quoted** due to colon: `"login:submit":`
- Test data namespaced by phase: `login.email`, `submission.nominee`
- `@flow` tag required at feature level
- `Background:` should only contain the starting page navigation
- Each scenario = one phase of the journey
