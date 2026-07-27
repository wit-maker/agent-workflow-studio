#!/usr/bin/env python3
"""Evidence-first state CLI for the Codex/GPT-5.6 Fable5 harness.

The implementation intentionally uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

STATUSES = ("todo", "doing", "review", "blocked", "done")
ROLES = ("upstream", "pm", "implementation", "review", "release")
ACTORS = ("sol", "terra", "luna", "human", "unassigned")
ACTIVE_STATUSES = ("doing", "review")
LOG_MAX_BYTES = 256 * 1024
TASK_ID_RE = re.compile(r"^[A-Z][A-Z0-9]*-\d+$")
SECRET_RE = re.compile(
    r"""(?ix)
    (\b[\w-]*(?:token|secret|password|api[-_]?key)[\w-]*\b)
    (\s*[:=]\s*)
    (["']?)
    ([^\s"',;]+)
    \3
    """
)
AUTH_RE = re.compile(r"(?i)(authorization\s*:\s*)([^\r\n]+)")
HOME_RE = re.compile(r"(?i)([A-Za-z]:\\Users\\|/Users/|/home/)[^\\/:*?\"<>|\r\n]+")


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def timestamp() -> str:
    return utc_now().strftime("%Y%m%dT%H%M%S%fZ")


def iso_now() -> str:
    return utc_now().isoformat(timespec="seconds")


def sanitize(text: str) -> str:
    text = SECRET_RE.sub(r"\1\2\3***\3", text)
    text = AUTH_RE.sub(r"\1***", text)
    return HOME_RE.sub(r"\1<user>", text)


def sanitize_line(text: str) -> str:
    return sanitize(text.replace("\r\n", " ").replace("\r", " ").replace("\n", " "))


def parse_frontmatter(text: str) -> tuple[dict[str, object], str]:
    match = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n?", text, re.DOTALL)
    if not match:
        return {}, text
    metadata: dict[str, object] = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            metadata[key.strip()] = [
                item.strip() for item in value[1:-1].split(",") if item.strip()
            ]
        else:
            metadata[key.strip()] = value.strip('"')
    return metadata, text[match.end() :]


def dump_frontmatter(metadata: dict[str, object], body: str) -> str:
    lines = ["---"]
    for key, value in metadata.items():
        if isinstance(value, list):
            rendered = f"[{', '.join(str(item) for item in value)}]"
        else:
            rendered = str(value)
        lines.append(f"{key}: {rendered}")
    lines.extend(("---", "", body.lstrip("\n")))
    return "\n".join(lines).rstrip() + "\n"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "task"


def git(cwd: Path, *args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=20,
            check=False,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return None
    return result.stdout.strip() if result.returncode == 0 else None


def git_succeeds(cwd: Path, *args: str) -> bool:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            timeout=20,
            check=False,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return False
    return result.returncode == 0


def git_context(cwd: Path) -> dict[str, str]:
    status = git(cwd, "status", "--porcelain")
    return {
        "commit": git(cwd, "rev-parse", "HEAD") or "unknown",
        "branch": git(cwd, "branch", "--show-current") or "detached",
        "dirty": "unknown" if status is None else ("true" if status else "false"),
    }


def resolve_commit(cwd: Path, value: object) -> str | None:
    if not value or value in ("-", "unknown"):
        return None
    return git(cwd, "rev-parse", f"{value}^{{commit}}")


def source_unchanged(root: Path, tested: object, reviewed: object) -> bool:
    tested_sha = resolve_commit(root, tested)
    reviewed_sha = resolve_commit(root, reviewed)
    if not tested_sha or not reviewed_sha:
        return False
    if tested_sha == reviewed_sha:
        return True
    if not git_succeeds(root, "merge-base", "--is-ancestor", tested_sha, reviewed_sha):
        return False
    changed = git(root, "diff", "--name-only", tested_sha, reviewed_sha)
    if changed is None:
        return False
    permitted = (
        "harness/state/evidence/",
        "harness/state/handoffs/",
        "harness/state/STATE.md",
        "harness/state/tasks/",
    )
    return all(path.replace("\\", "/").startswith(permitted) for path in changed.splitlines())


class Repository:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.harness = self.root / "harness"
        self.state = self.harness / "state"
        self.tasks = self.state / "tasks"
        self.handoffs = self.state / "handoffs"
        self.evidence = self.state / "evidence"
        self.logs = self.evidence / "logs"

    def ensure_state(self) -> None:
        for folder in (self.tasks, self.handoffs, self.evidence, self.logs):
            folder.mkdir(parents=True, exist_ok=True)

    def documents(self, folder: Path) -> list[tuple[Path, dict[str, object], str]]:
        if not folder.exists():
            return []
        documents = []
        for path in sorted(folder.glob("*.md")):
            metadata, body = parse_frontmatter(path.read_text(encoding="utf-8"))
            documents.append((path, metadata, body))
        return documents

    def task(self, task_id: str) -> Path | None:
        matches = list(self.tasks.glob(f"{task_id}-*.md"))
        return matches[0] if len(matches) == 1 else None

    def unique_record_path(self, folder: Path, suffix: str) -> Path:
        folder.mkdir(parents=True, exist_ok=True)
        for _ in range(20):
            name = f"{timestamp()}-{uuid.uuid4().hex[:8]}-{suffix}.md"
            path = folder / name
            try:
                path.touch(exist_ok=False)
                return path
            except FileExistsError:
                continue
        raise RuntimeError("Could not reserve a unique harness record path")


def repository(args: argparse.Namespace) -> Repository:
    root = Path(args.root) if args.root else Path(__file__).resolve().parent.parent
    return Repository(root)


def cmd_doctor(args: argparse.Namespace) -> int:
    repo = repository(args)
    checks = [
        ("git", shutil.which("git") is not None),
        ("codex", shutil.which("codex") is not None),
        ("AGENTS.md", (repo.root / "AGENTS.md").is_file()),
        ("harness/HARNESS.md", (repo.harness / "HARNESS.md").is_file()),
        (".codex/config.toml", (repo.root / ".codex" / "config.toml").is_file()),
        (
            ".agents/skills/fable5-harness/SKILL.md",
            (repo.root / ".agents" / "skills" / "fable5-harness" / "SKILL.md").is_file(),
        ),
    ]
    print(f"root: {repo.root}")
    for name, passed in checks:
        print(f"  [{'ok' if passed else '!!'}] {name}")
    context = git_context(repo.root)
    print(f"  [git] {context['branch']} @ {context['commit']} dirty={context['dirty']}")
    passed = all(value for _, value in checks) and context["commit"] != "unknown"
    print(f"doctor: {'OK' if passed else 'NG'}")
    return 0 if passed else 1


def cmd_task_new(args: argparse.Namespace) -> int:
    repo = repository(args)
    repo.ensure_state()
    if not TASK_ID_RE.fullmatch(args.id):
        print(f"ERROR invalid task id: {args.id}")
        return 1
    if list(repo.tasks.glob(f"{args.id}-*.md")):
        print(f"ERROR task already exists: {args.id}")
        return 1
    metadata: dict[str, object] = {
        "id": args.id,
        "schema_version": "1",
        "title": sanitize_line(args.title),
        "status": "todo",
        "role": args.role,
        "actor": args.actor,
        "branch": "-",
        "base_commit": args.base_commit or "-",
        "verified_commit": "-",
        "depends": args.depends or [],
        "created": iso_now(),
        "updated": iso_now(),
    }
    body = (
        f"# {args.id} {sanitize_line(args.title)}\n\n"
        f"## User outcome\n\n{sanitize_line(args.outcome or '(define)')}\n\n"
        "## Acceptance criteria\n\n- (define)\n\n"
        "## Allowed paths\n\n- (define)\n\n"
        "## Required evidence\n\n- (define)\n"
    )
    path = repo.tasks / f"{args.id}-{slugify(args.title)}.md"
    path.write_text(dump_frontmatter(metadata, body), encoding="utf-8")
    print(f"created {path.relative_to(repo.root)}")
    return 0


def cmd_task_set(args: argparse.Namespace) -> int:
    repo = repository(args)
    path = repo.task(args.id)
    if not path:
        print(f"ERROR task not found or duplicated: {args.id}")
        return 1
    metadata, body = parse_frontmatter(path.read_text(encoding="utf-8"))
    for key in ("status", "role", "actor", "branch", "base_commit", "verified_commit"):
        value = getattr(args, key)
        if value is not None:
            metadata[key] = value
    metadata["updated"] = iso_now()
    path.write_text(dump_frontmatter(metadata, body), encoding="utf-8")
    print(f"updated {path.relative_to(repo.root)}")
    return 0


def cmd_task_list(args: argparse.Namespace) -> int:
    repo = repository(args)
    for _, metadata, _ in repo.documents(repo.tasks):
        if args.status and metadata.get("status") != args.status:
            continue
        print(
            f"{metadata.get('id')}  {metadata.get('status'):7}  "
            f"{metadata.get('role'):14}  {metadata.get('actor'):10}  "
            f"{metadata.get('title')}"
        )
    return 0


def cmd_handoff_add(args: argparse.Namespace) -> int:
    repo = repository(args)
    repo.ensure_state()
    if not repo.task(args.task):
        print(f"ERROR task not found: {args.task}")
        return 1
    path = repo.unique_record_path(repo.handoffs, f"{args.task}-{args.from_actor}-to-{args.to_actor}")
    metadata: dict[str, object] = {
        "task": args.task,
        "from_actor": args.from_actor,
        "to_actor": args.to_actor,
        "created": iso_now(),
    }
    body = (
        f"# Handoff {args.task}: {args.from_actor} to {args.to_actor}\n\n"
        f"## Completed\n\n{sanitize_line(args.completed or '(record)')}\n\n"
        f"## Remaining\n\n{sanitize_line(args.remaining or '(record)')}\n\n"
        f"## Next action\n\n{sanitize_line(args.next_action or '(record)')}\n"
    )
    path.write_text(dump_frontmatter(metadata, body), encoding="utf-8")
    print(f"created {path.relative_to(repo.root)}")
    return 0


def prepare_log(raw: str) -> tuple[bytes, str]:
    data = sanitize(raw).encode("utf-8", "replace")
    if len(data) > LOG_MAX_BYTES:
        data = data[:LOG_MAX_BYTES] + b"\n... [truncated] ...\n"
    return data, hashlib.sha256(data).hexdigest()


def cmd_evidence_run(args: argparse.Namespace) -> int:
    repo = repository(args)
    repo.ensure_state()
    task_path = repo.task(args.task)
    if not task_path:
        print(f"ERROR task not found: {args.task}")
        return 1
    metadata, _ = parse_frontmatter(task_path.read_text(encoding="utf-8"))
    command = list(args.command)
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        print("ERROR command is required after --")
        return 1
    work_root = Path(args.work_root).resolve() if args.work_root else repo.root
    before = git_context(work_root)
    expected_branch = metadata.get("branch")
    if expected_branch not in (None, "-") and before["branch"] != expected_branch:
        print(
            f"ERROR worktree branch {before['branch']} does not match "
            f"task branch {expected_branch}"
        )
        return 1
    started_at = iso_now()
    try:
        result = subprocess.run(
            command,
            cwd=work_root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=args.timeout,
            shell=False,
            check=False,
        )
        stdout, stderr, exit_code = result.stdout, result.stderr, result.returncode
    except FileNotFoundError as error:
        stdout, stderr, exit_code = "", f"command not found: {error}\n", 127
    except subprocess.TimeoutExpired as error:
        def decoded(value: str | bytes | None) -> str:
            if isinstance(value, bytes):
                return value.decode("utf-8", "replace")
            return value or ""

        stdout = decoded(error.stdout)
        stderr = decoded(error.stderr) + f"\ntimeout after {args.timeout}s\n"
        exit_code = 124
    finished_at = iso_now()
    after = git_context(work_root)
    command_line = subprocess.list2cmdline(command)
    raw_log = (
        f"$ {command_line}\n--- stdout ---\n{stdout}\n"
        f"--- stderr ---\n{stderr}\n--- exit {exit_code} ---\n"
    )
    log_data, digest = prepare_log(raw_log)
    record = repo.unique_record_path(repo.evidence, f"{args.task}-{args.actor}-test")
    log_path = repo.logs / f"{record.stem}.log"
    log_path.write_bytes(log_data)
    evidence: dict[str, object] = {
        "task": args.task,
        "kind": "test",
        "actor": args.actor,
        "exit_code": str(exit_code),
        "commit": before["commit"],
        "branch": before["branch"],
        "dirty_before": before["dirty"],
        "dirty_after": after["dirty"],
        "started_at": started_at,
        "finished_at": finished_at,
        "log_sha256": digest,
        "note": sanitize_line(args.note or "-"),
    }
    body = (
        f"# Test evidence for {args.task}\n\n"
        f"- command: `{sanitize_line(command_line)}`\n"
        f"- exit code: **{exit_code}**\n"
        f"- commit: `{before['commit']}`\n"
        f"- branch: `{before['branch']}`\n"
        f"- sanitized log sha256: `{digest}`\n"
    )
    record.write_text(dump_frontmatter(evidence, body), encoding="utf-8")
    sys.stdout.write(stdout)
    sys.stderr.write(stderr)
    print(f"created {record.relative_to(repo.root)} (exit {exit_code})")
    return exit_code


def cmd_review_add(args: argparse.Namespace) -> int:
    repo = repository(args)
    repo.ensure_state()
    if not repo.task(args.task):
        print(f"ERROR task not found: {args.task}")
        return 1
    reviewed_commit = resolve_commit(repo.root, args.reviewed_commit)
    if not reviewed_commit:
        print(f"ERROR reviewed commit cannot be resolved: {args.reviewed_commit}")
        return 1
    record = repo.unique_record_path(repo.evidence, f"{args.task}-{args.actor}-review")
    metadata: dict[str, object] = {
        "task": args.task,
        "kind": "review",
        "actor": args.actor,
        "implementer": args.implementer,
        "result": args.result,
        "reviewed_commit": reviewed_commit,
        "created": iso_now(),
        "note": sanitize_line(args.note or "-"),
    }
    body = (
        f"# Review evidence for {args.task}\n\n"
        f"- result: **{args.result}**\n"
        f"- reviewer: {args.actor}\n"
        f"- implementer: {args.implementer}\n"
        f"- reviewed commit: `{reviewed_commit}`\n"
        f"- note: {sanitize_line(args.note or '-')}\n"
    )
    record.write_text(dump_frontmatter(metadata, body), encoding="utf-8")
    print(f"created {record.relative_to(repo.root)}")
    return 0


def load_evidence(repo: Repository) -> list[tuple[Path, dict[str, object], str]]:
    return [
        document
        for document in repo.documents(repo.evidence)
        if document[1].get("kind") in ("test", "review")
    ]


def validation_errors(repo: Repository) -> list[str]:
    errors: list[str] = []
    task_documents = repo.documents(repo.tasks)
    evidence_documents = load_evidence(repo)
    task_ids: dict[str, tuple[Path, dict[str, object]]] = {}
    active_branches: dict[str, str] = {}

    for path, metadata, _ in task_documents:
        task_id = str(metadata.get("id", ""))
        if not TASK_ID_RE.fullmatch(task_id):
            errors.append(f"{path}: invalid task id {task_id!r}")
        if task_id in task_ids:
            errors.append(f"{path}: duplicate task id {task_id}")
        task_ids[task_id] = (path, metadata)
        if metadata.get("status") not in STATUSES:
            errors.append(f"{path}: invalid status {metadata.get('status')!r}")
        if metadata.get("role") not in ROLES:
            errors.append(f"{path}: invalid role {metadata.get('role')!r}")
        if metadata.get("actor") not in ACTORS:
            errors.append(f"{path}: invalid actor {metadata.get('actor')!r}")
        status = metadata.get("status")
        branch = str(metadata.get("branch", "-"))
        if status in ACTIVE_STATUSES:
            if metadata.get("actor") == "unassigned":
                errors.append(f"{path}: active task needs a concrete actor")
            if not branch.startswith("codex/"):
                errors.append(f"{path}: active task branch must start with codex/")
            if branch in active_branches:
                errors.append(
                    f"{path}: active branch {branch} is shared with {active_branches[branch]}"
                )
            active_branches[branch] = task_id
        if metadata.get("role") == "implementation" and status in (*ACTIVE_STATUSES, "done"):
            if metadata.get("actor") != "luna":
                errors.append(f"{path}: implementation task must be assigned to luna")

    for path, metadata, _ in task_documents:
        task_id = str(metadata.get("id", ""))
        for dependency in metadata.get("depends", []) or []:
            if dependency not in task_ids:
                errors.append(f"{path}: missing dependency {dependency}")
            elif metadata.get("status") in (*ACTIVE_STATUSES, "done"):
                dependency_status = task_ids[str(dependency)][1].get("status")
                if dependency_status != "done":
                    errors.append(f"{path}: dependency {dependency} is not done")

        if metadata.get("status") != "done":
            continue
        verified = resolve_commit(repo.root, metadata.get("verified_commit"))
        if not verified:
            errors.append(f"{path}: done task needs a resolvable verified_commit")
            continue
        task_evidence = [
            item for item in evidence_documents if item[1].get("task") == task_id
        ]
        successful_tests = [
            item
            for item in task_evidence
            if item[1].get("kind") == "test"
            and item[1].get("exit_code") == "0"
            and item[1].get("dirty_before") == "false"
            and item[1].get("dirty_after") == "false"
            and source_unchanged(repo.root, item[1].get("commit"), verified)
        ]
        if not successful_tests:
            errors.append(f"{path}: no clean successful test evidence for verified_commit")
        approvals = [
            item
            for item in task_evidence
            if item[1].get("kind") == "review"
            and item[1].get("result") == "approved"
            and item[1].get("actor") == "terra"
            and item[1].get("implementer") == metadata.get("actor")
            and resolve_commit(repo.root, item[1].get("reviewed_commit")) == verified
        ]
        if not approvals:
            errors.append(f"{path}: no Terra approval for the exact verified_commit")

    for path, metadata, _ in evidence_documents:
        if metadata.get("task") not in task_ids:
            errors.append(f"{path}: evidence references missing task {metadata.get('task')}")
        if metadata.get("actor") not in ACTORS[:-1]:
            errors.append(f"{path}: invalid evidence actor {metadata.get('actor')!r}")
        if metadata.get("kind") == "review" and metadata.get("actor") == metadata.get(
            "implementer"
        ):
            errors.append(f"{path}: self-review is not independent")
    return errors


def cmd_validate(args: argparse.Namespace) -> int:
    repo = repository(args)
    errors = validation_errors(repo)
    for error in errors:
        print(f"ERROR {error}")
    print(f"validate: {'OK' if not errors else 'NG'} ({len(errors)} errors)")
    return 0 if not errors else 1


def cmd_state(args: argparse.Namespace) -> int:
    repo = repository(args)
    repo.ensure_state()
    tasks = repo.documents(repo.tasks)
    lines = [
        "---",
        "name: harness-state",
        "type: generated",
        "---",
        "",
        "# Harness state",
        "",
        f"> Generated at `{iso_now()}` by `python tools/fable5_harness.py state`.",
        "",
    ]
    if not tasks:
        lines.append("No harness-managed tasks have been created yet.")
    else:
        lines.extend(
            (
                "| ID | Title | Status | Role | Actor | Branch | Depends |",
                "|---|---|---|---|---|---|---|",
            )
        )
        order = {status: index for index, status in enumerate(STATUSES)}
        for path, metadata, _ in sorted(
            tasks,
            key=lambda item: (
                order.get(str(item[1].get("status")), 99),
                str(item[1].get("id")),
            ),
        ):
            dependencies = ", ".join(metadata.get("depends", []) or []) or "-"
            lines.append(
                f"| [{metadata.get('id')}](tasks/{path.name}) | {metadata.get('title')} "
                f"| {metadata.get('status')} | {metadata.get('role')} "
                f"| {metadata.get('actor')} | {metadata.get('branch')} | {dependencies} |"
            )
    state_path = repo.state / "STATE.md"
    state_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"wrote {state_path.relative_to(repo.root)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", help="Canonical repository root")
    commands = parser.add_subparsers(dest="command_name", required=True)
    commands.add_parser("doctor").set_defaults(handler=cmd_doctor)
    commands.add_parser("validate").set_defaults(handler=cmd_validate)
    commands.add_parser("state").set_defaults(handler=cmd_state)

    task_commands = commands.add_parser("task").add_subparsers(
        dest="task_command", required=True
    )
    task_new = task_commands.add_parser("new")
    task_new.add_argument("--id", required=True)
    task_new.add_argument("title")
    task_new.add_argument("--role", choices=ROLES, default="implementation")
    task_new.add_argument("--actor", choices=ACTORS, default="unassigned")
    task_new.add_argument("--base-commit")
    task_new.add_argument("--depends", nargs="*")
    task_new.add_argument("--outcome")
    task_new.set_defaults(handler=cmd_task_new)
    task_list = task_commands.add_parser("list")
    task_list.add_argument("--status", choices=STATUSES)
    task_list.set_defaults(handler=cmd_task_list)
    task_set = task_commands.add_parser("set")
    task_set.add_argument("id")
    task_set.add_argument("--status", choices=STATUSES)
    task_set.add_argument("--role", choices=ROLES)
    task_set.add_argument("--actor", choices=ACTORS)
    task_set.add_argument("--branch")
    task_set.add_argument("--base-commit")
    task_set.add_argument("--verified-commit")
    task_set.set_defaults(handler=cmd_task_set)

    handoff_commands = commands.add_parser("handoff").add_subparsers(
        dest="handoff_command", required=True
    )
    handoff_add = handoff_commands.add_parser("add")
    handoff_add.add_argument("--task", required=True)
    handoff_add.add_argument("--from-actor", choices=ACTORS[:-1], required=True)
    handoff_add.add_argument("--to-actor", choices=ACTORS[:-1], required=True)
    handoff_add.add_argument("--completed")
    handoff_add.add_argument("--remaining")
    handoff_add.add_argument("--next-action")
    handoff_add.set_defaults(handler=cmd_handoff_add)

    evidence_commands = commands.add_parser("evidence").add_subparsers(
        dest="evidence_command", required=True
    )
    evidence_run = evidence_commands.add_parser("run")
    evidence_run.add_argument("--task", required=True)
    evidence_run.add_argument("--actor", choices=ACTORS[:-1], required=True)
    evidence_run.add_argument("--work-root")
    evidence_run.add_argument("--timeout", type=int, default=600)
    evidence_run.add_argument("--note", default="")
    evidence_run.add_argument("command", nargs=argparse.REMAINDER)
    evidence_run.set_defaults(handler=cmd_evidence_run)

    review_commands = commands.add_parser("review").add_subparsers(
        dest="review_command", required=True
    )
    review_add = review_commands.add_parser("add")
    review_add.add_argument("--task", required=True)
    review_add.add_argument("--actor", choices=ACTORS[:-1], required=True)
    review_add.add_argument("--implementer", choices=ACTORS[:-1], required=True)
    review_add.add_argument(
        "--result", choices=("approved", "changes_requested"), required=True
    )
    review_add.add_argument("--reviewed-commit", required=True)
    review_add.add_argument("--note", default="")
    review_add.set_defaults(handler=cmd_review_add)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
