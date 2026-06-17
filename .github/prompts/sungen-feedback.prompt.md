---
name: sungen-feedback
description: 'Record QA feedback locally (test-design knowledge or product telemetry). Auto-attaches context and stores to .sungen/feedback/.'
argument-hint: '[message]'
agent: 'agent'
tools: [vscode, execute, read, search]
---

## Role
Capture QA feedback and store it **locally** (no server) via `sungen feedback record`. Closes the learning loop inside the project; the harness can reuse it later.

## Steps
1. Read message from arguments (ask if empty).
2. **Classify**: `test-design` (viewpoint/scenario wrong/missing/duplicate/add), `product` (Sungen itself misbehaved), or `other`. Infer; confirm only if ambiguous.
3. **Auto-attach context** (don't make the user repeat): `--screen <name>` (current focus), `--target <ref>` (VP id / scenario / command / artifact), `--decision <accept|reject|edit|add|none>`, `--reason <text>`.
4. Run:
   ```bash
   sungen feedback record --type <type> --screen <name> --target "<ref>" --decision <d> --message "<msg>" --reason "<why>"
   ```
5. Confirm what/where (`.sungen/feedback/feedback.jsonl`). It is **local**; cross-project sync is opt-in later.
6. If feedback implies an action (missing critical viewpoint), offer `sungen-design <name>` (regenerate with gate) or `sungen-add-flow` (cross-screen gap).

## Notes
- Never send anywhere — local file only. Keep `product` vs `test-design` distinct. View: `sungen feedback list`.
