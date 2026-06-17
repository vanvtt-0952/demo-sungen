---
name: sungen-design
description: 'Alias of create-test. Generates test cases AND runs the quality harness (gate + repair). Kept for discoverability; create-test now does this by default.'
argument-hint: '[screen-name]'
agent: 'agent'
tools: [vscode, execute, read, agent, edit, search, web, browser, todo, 'playwright/*']
---

## `/sungen-design` is an alias of `/sungen-create-test`

As of v3.0 the quality harness (discovery → viewpoint overview → generate → **`sungen audit` gate → repair loop** → manifest/ledger) is built into **`/sungen-create-test`** by default — no second command needed for quality.

**Do exactly what `/sungen-create-test <name>` does** — follow that command verbatim, including the mandatory harness gate & repair step and the `sungen-harness-audit` skill. This entry exists only to keep the `design` name discoverable.
