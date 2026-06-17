---
name: sungen-harness-audit
description: 'How to read `sungen audit` output and repair test-design findings. Auto-loaded by the design orchestrator.'
user-invocable: false
---

## What `sungen audit` measures

`sungen audit --screen <name>` runs deterministic sensors over `features/<name>.feature` + `requirements/test-viewpoint.md` and writes `.sungen/reports/<name>-audit.json`. It is the **gate** the orchestrator repairs against. Run with `--json` to parse it.

### Report shape (key fields)
```jsonc
{
  "score": { "overall": 3.9, "coverage": 0.4, "businessDepth": 0.18, "balance": 0.5, "traceability": 0.7 },
  "gateStatus": "PASS" | "FAIL",
  "gate": { "pageType": "ecommerce-list", "themesCovered": 2, "themesTotal": 5,
            "gaps": [ { "theme": "cart-correctness", "keywords": [...] } ] },
  "depth": { "businessCriticalShallow": 9, "businessCriticalTotal": 11,
             "shallowBusinessCritical": [ { "name": "...", "category": "PRODUCT" } ] },
  "balance": { "imbalanced": true, "coreCount": 11, "secondaryCount": 22, "byBucket": {...} },
  "duplicates": { "clusters": [ { "sameDataLikely": false, "scenarios": [...] } ] },
  "trace": { "mappedRatio": 0.4, "note": "..." },
  "findings": [ "GATE: ...", "DEPTH: ...", "BALANCE: ...", "TRACE: ..." ]
}
```
- **`overall` score is business-weighted** (coverage 0.4 + businessDepth 0.3 + balance 0.15 + traceability 0.15). It is intentionally strict on business value — a high count with shallow business coverage scores low. Don't optimize the count; optimize coverage + depth.
- Exit code **2** when `gateStatus == FAIL` (usable in CI / loop).

## Finding → repair mapping

| Finding prefix | Meaning | Repair action |
|---|---|---|
| **GATE** | a critical theme for the page-type has no covering scenario | Generate scenarios for that theme. **If cross-screen** (cart-correctness, product-detail-consistency, filter-result-correctness, multi-item cart) → do NOT fake it on a single screen; plan a **flow** (`/sungen:add-flow`) and record the deferral. |
| **DEPTH** | business-critical scenarios assert only visibility/navigation | Replace `Then User see [X] page/section` with **observable data assertions**: `Then User see [X] with {{value}}`, `Then User see [T] table match data:`. Capture real expected values into `test-data.yaml`. |
| **BALANCE** | secondary viewpoints (UI/validation/security) outweigh business-core | **Stop expanding** secondary viewpoints; generate the missing business-core scenarios first. Do not add more subscription/UI variants while core is thin. |
| **TRACE** | scenarios use ad-hoc `VP-<CAT>-NNN` codes not linked to the viewpoint-overview | Make each scenario map to a viewpoint-overview id (align category codes, or add a mapping comment). |
| **UNIVERSAL** | a universal theme (error/empty-state, accessibility) is absent | Low priority — add if in scope; otherwise note as out-of-scope with reason. |

## P5 steps for deep cross-screen / list coverage

Use these when repairing GATE/DEPTH findings for the hard viewpoints (cart/detail/filter correctness). They need **runtime data mode** (the default).

- **Capture a value to compare across screens** (product-detail-consistency, cart-correctness):
  ```gherkin
  When User remember [Product Name] text as {{selected_product_name}}
  And User remember [Product Price] text as {{selected_product_price}}
  And User click [View Product] link
  Then User see [Detail Product Name] header with {{selected_product_name}}
  And User see [Detail Product Price] text with {{selected_product_price}}
  ```
  `remember` stores the element's text/value at runtime; later `{{var}}` resolves to it. This proves the detail/cart shows the SAME product, not a random one.

- **Assert every item in a result matches** (category/brand-filter-correctness):
  ```gherkin
  When User click [Women] link
  And User click [Dress] link
  Then User see all [Result Product Name] contain {{selected_category}}
  ```
  `see all [X] contain {{v}}` asserts EVERY matching element contains the value → "all displayed products belong to the selected category/brand", not just one.

> Cross-screen flows (home → detail/cart): if the target screen is a separate screen, prefer a **flow** (`/sungen:add-flow`) so the journey is one test. On a single screen, keep the cross-screen assertion but tag `@manual` with a `# Deferred to a flow` comment.

## Repair loop rules

1. **Budget = 3 rounds.** Re-run `sungen audit` after each repair; track score delta.
2. **Stop when** `gateStatus == PASS` AND `findings` empty — or budget exhausted.
3. **Never fake a pass.** A shallow `see [Cart] page` does not satisfy `cart-correctness`. If a gap is genuinely cross-screen or needs capabilities the DSL lacks (e.g. capture an element value to compare elsewhere), **report it as a residual gap / flow item** instead of forcing a green gate.
4. **EP/data families are OK.** A `duplicates` cluster with `sameDataLikely=false` is an intentional equivalence-partition family (e.g. many invalid-email cases) — keep it; only collapse `sameDataLikely=true` exact duplicates.

## Discovery / fallback tree (when input is limited)

```
spec.md đủ tốt?      → YES: Spec-first
  │ NO
source code có?      → YES: Source-first (mine behavior từ code)
  │ NO
testcase cũ tương tự?→ YES: History-first
  │ NO
domain rủi ro+defect?→ YES: Defect-first
  │ NO
→ hỏi QA; QA chưa phản hồi → OUTPUT kèm ASSUMPTION LIST rõ ràng (không stall)
```

See `docs/orchestration-spec.md` for the full flow and `reports/sungen_refactor_spec.md` for the design rationale.
