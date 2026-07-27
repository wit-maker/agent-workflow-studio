# Evidence and independent review

## Validation evidence

Use:

```text
python tools/fable5_harness.py evidence run --task <TASK-ID> --actor luna -- <command>
```

Evidence is valid for completion only when:

- the command succeeded;
- the worktree was clean after the command;
- the evidence commit equals the task's `verified_commit`;
- the evidence covers the acceptance claim being made.

Do not put secrets or sensitive content on command lines or in notes. Sanitizing
is defense in depth, not permission to expose sensitive data.

## Review evidence

Terra records the result for the reviewed Luna commit:

```text
python tools/fable5_harness.py review add --task <TASK-ID> --actor terra \
  --implementer luna --result approved --reviewed-commit <SHA>
```

Use `changes_requested` when any correctness, safety, contract, test, or
acceptance gap remains. After any code change, the old approval is stale and a
new review is required.

PR creation, green CI, and a textual `APPROVED` claim are insufficient without
an evidence record anchored to the reviewed commit.
