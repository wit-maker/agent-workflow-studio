---
name: harness-state
type: generated
---

# Harness state

> Generated at `2026-07-27T20:02:54+00:00` by `python tools/fable5_harness.py state`.

| ID | Title | Status | Role | Actor | Branch | Depends |
|---|---|---|---|---|---|---|
| [ENCODING-01](tasks/ENCODING-01-windows-utf-8-encoding-guard.md) | Windows UTF-8 Encoding Guard | todo | implementation | unassigned | - | - |
| [HARNESS-01](tasks/HARNESS-01-codex-token-measurement-and-paired-routing-eval.md) | Codex Token Measurement and Paired Routing Eval | todo | implementation | unassigned | - | ENCODING-01 |
| [V2-03](tasks/V2-03-usage-accounting-contract.md) | Usage Accounting Contract | todo | implementation | unassigned | - | V2-02, ENCODING-01 |
| [V2-04](tasks/V2-04-usage-accounting-pure-projection.md) | Usage Accounting Pure Projection | todo | implementation | unassigned | - | V2-03 |
| [V2-02](tasks/V2-02-safe-evidence-projection-mvp.md) | Safe Evidence Projection MVP | done | implementation | luna | codex/v2-02-safe-evidence-projection-mvp | - |
