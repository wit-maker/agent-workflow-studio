# Evidence and separate-session review

## Validation evidence

Use:

```text
python tools/fable5_harness.py evidence run --task <TASK-ID> --actor luna \
  --acceptance-id <ID> --summary "<sanitized result>" -- <command>
```

Evidence is valid for completion only when:

- the command succeeded;
- the worktree was clean after the command;
- the evidence commit equals the task's `verified_commit`;
- the evidence acceptance ID is declared by the frozen task specification;
- the task specification hash has not changed;
- all changed paths are permitted by the task.

Do not put secrets or sensitive content on command lines or in notes. Sanitizing
is defense in depth, not permission to expose sensitive data.

## Review evidence

Terra records the result for the reviewed Luna commit:

```text
python tools/fable5_harness.py review add --task <TASK-ID> --actor terra \
  --implementer luna --implementation-session-id <IMPLEMENTATION-SESSION> \
  --review-session-id <REVIEW-SESSION> --result approved \
  --reviewed-commit <SHA>
```

Use `changes_requested` when any correctness, safety, contract, test, or
acceptance gap remains. After any code change, the old approval is stale and a
new review is required.

The CLI rejects matching actors, matching session IDs, mismatched task actors,
and review records for a changed task specification. Session IDs remain
self-reported operational metadata; they do not prove host or model identity.
PR creation, green CI, and a textual `APPROVED` claim are insufficient without
an evidence record anchored to the reviewed commit.

Use `validate schema` for repository document integrity. Use
`validate task --task <ID>` or `validate program --manifest <JSON>` for
completion. Empty state is never treated as completed work.

A program manifest is intentionally small and standard-library compatible:

```json
{"schema_version": 1, "tasks": ["V2-01", "V2-02"]}
```
