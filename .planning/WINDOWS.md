---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-11-07T07:39:57.578Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 4 | unrun-verify | app/admin/page.tsx |  | Task 1 behavioral criterion (browser admin session: standby-row test lands under its own row, invalid-sentinel-key failure styling) deferred to verification phase | open |  | 2026-11-07T07:39:56.959Z |  |
| 2 | 4 | unrun-verify | app/admin/page.tsx |  | Task 2 human-check admin walk (badges exhaustive, per-row tests on active+standby, masked keys, 44px targets, public site untouched) deferred to verification phase | open |  | 2026-11-07T07:39:57.578Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "4",
    "file": "app/admin/page.tsx",
    "line": null,
    "description": "Task 1 behavioral criterion (browser admin session: standby-row test lands under its own row, invalid-sentinel-key failure styling) deferred to verification phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-07T07:39:56.959Z",
    "resolved_at": null,
    "milestone": "v0.0.0.0.2"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "4",
    "file": "app/admin/page.tsx",
    "line": null,
    "description": "Task 2 human-check admin walk (badges exhaustive, per-row tests on active+standby, masked keys, 44px targets, public site untouched) deferred to verification phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-07T07:39:57.578Z",
    "resolved_at": null,
    "milestone": "v0.0.0.0.2"
  }
]
````
