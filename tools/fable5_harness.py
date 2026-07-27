#!/usr/bin/env python3
"""Evidence-first state CLI for the Codex/GPT-5.6 Fable5 harness.

The implementation intentionally uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import hashlib
import io
import json
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
TASK_SHAPES = ("read-only", "shared-single-writer", "isolated-lane")
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
CLI_SECRET_RE = re.compile(
    r"""(?ix)
    (--?(?:token|secret|password|api[-_]?key|credential|authorization|bearer)(?:=|\s+))
    (?:"[^"]*"|'[^']*'|[^\s"';&]+)
    """
)
URL_CREDENTIAL_RE = re.compile(r"(?i)(https?://)([^\s/@:]+):([^\s/@]+)@")
URL_SECRET_PARAM_RE = re.compile(
    r"(?i)([?&](?:token|secret|password|api[-_]?key|credential|authorization|bearer)=)([^&#\s]+)"
)
OPENAI_KEY_RE = re.compile(r"(?i)\bsk-[a-z0-9_-]+\b")
JWT_RE = re.compile(
    r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{8,}(?![A-Za-z0-9_-])"
)
SESSION_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$")
AUTH_RE = re.compile(r"(?i)(authorization\s*:\s*)([^\r\n]+)")
HOME_RE = re.compile(r"(?i)([A-Za-z]:\\Users\\|/Users/|/home/)[^\\/:*?\"<>|\r\n]+")


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def timestamp() -> str:
    return utc_now().strftime("%Y%m%dT%H%M%S%fZ")


def iso_now() -> str:
    return utc_now().isoformat(timespec="seconds")


def sanitize(text: str) -> str:
    text = CLI_SECRET_RE.sub(r"\1***", text)
    text = SECRET_RE.sub(r"\1\2\3***\3", text)
    text = AUTH_RE.sub(r"\1***", text)
    text = URL_CREDENTIAL_RE.sub(r"\1<redacted>@", text)
    text = URL_SECRET_PARAM_RE.sub(r"\1***", text)
    text = OPENAI_KEY_RE.sub("<redacted-secret>", text)
    text = JWT_RE.sub("<redacted-jwt>", text)
    return HOME_RE.sub(r"\1<user>", text)


def valid_session_id(value: object) -> bool:
    return isinstance(value, str) and bool(SESSION_ID_RE.fullmatch(value))


def string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item)]


def task_spec_hash(metadata: dict[str, object], body: str) -> str:
    stable = {
        key: metadata.get(key)
        for key in (
            "id",
            "schema_version",
            "title",
            "role",
            "actor",
            "branch",
            "base_commit",
            "depends",
            "implementation_session_id",
            "task_shape",
            "required_evidence",
            "allowed_paths",
            "forbidden_paths",
        )
    }
    payload = json.dumps(stable, ensure_ascii=False, sort_keys=True) + "\n" + body
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def path_matches(path: str, pattern: str) -> bool:
    normalized_path = path.replace("\\", "/")
    normalized_pattern = pattern.replace("\\", "/").lstrip("./")
    if not normalized_pattern:
        return False
    if any(character in normalized_pattern for character in "*?["):
        return fnmatch.fnmatchcase(normalized_path, normalized_pattern)
    return normalized_path == normalized_pattern or normalized_path.startswith(
        normalized_pattern.rstrip("/") + "/"
    )


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
        (
            ".codex/agents/sol-upstream.toml",
            (repo.root / ".codex" / "agents" / "sol-upstream.toml").is_file(),
        ),
        (
            ".codex/agents/terra-pm.toml",
            (repo.root / ".codex" / "agents" / "terra-pm.toml").is_file(),
        ),
        (
            ".codex/agents/luna-implementer.toml",
            (repo.root / ".codex" / "agents" / "luna-implementer.toml").is_file(),
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
    if args.implementation_session_id and not valid_session_id(
        args.implementation_session_id
    ):
        print("ERROR invalid implementation_session_id")
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
        "task_shape": args.task_shape,
        "required_evidence": args.required_evidence or [],
        "allowed_paths": args.allowed_paths or [],
        "forbidden_paths": args.forbidden_paths or [],
        "created": iso_now(),
        "updated": iso_now(),
    }
    if args.implementation_session_id:
        metadata["implementation_session_id"] = args.implementation_session_id
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
    for key in (
        "status",
        "role",
        "actor",
        "branch",
        "base_commit",
        "verified_commit",
        "implementation_session_id",
        "task_shape",
        "required_evidence",
        "allowed_paths",
        "forbidden_paths",
    ):
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
    metadata, task_body = parse_frontmatter(task_path.read_text(encoding="utf-8"))
    if metadata.get("status") not in ACTIVE_STATUSES:
        print("ERROR evidence can only be recorded for a doing or review task")
        return 1
    if metadata.get("actor") != args.actor:
        print("ERROR evidence actor does not match the task actor")
        return 1
    if not valid_session_id(args.acceptance_id):
        print("ERROR acceptance ID contains unsupported characters")
        return 1
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
    base_commit = resolve_commit(work_root, metadata.get("base_commit"))
    if not base_commit or not git_succeeds(
        work_root, "merge-base", "--is-ancestor", base_commit, before["commit"]
    ):
        print("ERROR current worktree HEAD does not descend from task base_commit")
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
    raw_log = (
        "$ [command redacted]\n--- stdout ---\n"
        f"{stdout}\n"
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
        "acceptance_id": args.acceptance_id,
        "task_spec_sha256": task_spec_hash(metadata, task_body),
        "summary": sanitize_line(args.summary),
        "note": sanitize_line(args.note or "-"),
    }
    body = (
        f"# Test evidence for {args.task}\n\n"
        "- command: `[redacted; executable arguments are not retained]`\n"
        f"- exit code: **{exit_code}**\n"
        f"- commit: `{before['commit']}`\n"
        f"- branch: `{before['branch']}`\n"
        f"- acceptance: `{sanitize_line(args.acceptance_id)}`\n"
        f"- summary: {sanitize_line(args.summary)}\n"
        f"- task spec sha256: `{evidence['task_spec_sha256']}`\n"
        f"- sanitized log sha256: `{digest}`\n"
    )
    record.write_text(dump_frontmatter(evidence, body), encoding="utf-8")
    sys.stdout.write(sanitize(stdout))
    sys.stderr.write(sanitize(stderr))
    print(f"created {record.relative_to(repo.root)} (exit {exit_code})")
    return exit_code


def cmd_review_add(args: argparse.Namespace) -> int:
    repo = repository(args)
    repo.ensure_state()
    if not repo.task(args.task):
        print(f"ERROR task not found: {args.task}")
        return 1
    if args.actor != "terra":
        print("ERROR operational review records must use actor terra")
        return 1
    if not args.implementation_session_id or not args.review_session_id:
        print(
            "ERROR review evidence requires implementation and review session IDs"
        )
        return 1
    if not valid_session_id(args.implementation_session_id) or not valid_session_id(
        args.review_session_id
    ):
        print("ERROR review session IDs contain unsupported characters")
        return 1
    if args.actor == args.implementer:
        print("ERROR reviewer and implementer must be different actors")
        return 1
    if args.implementation_session_id == args.review_session_id:
        print("ERROR implementation and review sessions must differ")
        return 1
    task_path = repo.task(args.task)
    assert task_path is not None
    task_metadata, task_body = parse_frontmatter(
        task_path.read_text(encoding="utf-8")
    )
    if task_metadata.get("actor") != args.implementer:
        print("ERROR review implementer does not match the task actor")
        return 1
    if task_metadata.get("implementation_session_id") != args.implementation_session_id:
        print("ERROR review implementation session does not match the task")
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
        "implementation_session_id": args.implementation_session_id,
        "review_session_id": args.review_session_id,
        "result": args.result,
        "reviewed_commit": reviewed_commit,
        "task_spec_sha256": task_spec_hash(task_metadata, task_body),
        "created": iso_now(),
        "note": sanitize_line(args.note or "-"),
    }
    body = (
        f"# Review evidence for {args.task}\n\n"
        f"- result: **{args.result}**\n"
        f"- reviewer: {args.actor}\n"
        f"- implementer: {args.implementer}\n"
        f"- implementation session: `{sanitize_line(args.implementation_session_id)}`\n"
        f"- review session: `{sanitize_line(args.review_session_id)}`\n"
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


def validation_errors(
    repo: Repository, completion_task_ids: set[str] | None = None
) -> list[str]:
    errors: list[str] = []
    completion_task_ids = completion_task_ids or set()
    task_documents = repo.documents(repo.tasks)
    evidence_documents = load_evidence(repo)
    task_ids: dict[str, tuple[Path, dict[str, object], str]] = {}
    active_branches: dict[str, str] = {}

    for path, metadata, body in task_documents:
        task_id = str(metadata.get("id", ""))
        if not TASK_ID_RE.fullmatch(task_id):
            errors.append(f"{path}: invalid task id {task_id!r}")
        if task_id in task_ids:
            errors.append(f"{path}: duplicate task id {task_id}")
        task_ids[task_id] = (path, metadata, body)
        if metadata.get("status") not in STATUSES:
            errors.append(f"{path}: invalid status {metadata.get('status')!r}")
        if metadata.get("role") not in ROLES:
            errors.append(f"{path}: invalid role {metadata.get('role')!r}")
        if metadata.get("actor") not in ACTORS:
            errors.append(f"{path}: invalid actor {metadata.get('actor')!r}")
        if metadata.get("task_shape") not in TASK_SHAPES:
            errors.append(f"{path}: invalid task_shape {metadata.get('task_shape')!r}")
        for key in ("depends", "required_evidence", "allowed_paths", "forbidden_paths"):
            if not isinstance(metadata.get(key), list):
                errors.append(f"{path}: {key} must be a flat list")
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
            if not valid_session_id(metadata.get("implementation_session_id")):
                errors.append(
                    f"{path}: implementation task needs a valid implementation_session_id"
                )
            if not resolve_commit(repo.root, metadata.get("base_commit")):
                errors.append(f"{path}: implementation task needs a resolvable base_commit")

    for path, metadata, body in task_documents:
        task_id = str(metadata.get("id", ""))
        for dependency in metadata.get("depends", []) or []:
            if dependency not in task_ids:
                errors.append(f"{path}: missing dependency {dependency}")
            elif metadata.get("status") in (*ACTIVE_STATUSES, "done"):
                dependency_status = task_ids[str(dependency)][1].get("status")
                if dependency_status != "done":
                    errors.append(f"{path}: dependency {dependency} is not done")

        if task_id not in completion_task_ids:
            continue
        if metadata.get("status") != "done":
            errors.append(f"{path}: completion validation requires status done")
            continue
        verified = resolve_commit(repo.root, metadata.get("verified_commit"))
        if not verified:
            errors.append(f"{path}: done task needs a resolvable verified_commit")
            continue
        base = resolve_commit(repo.root, metadata.get("base_commit"))
        if not base or not git_succeeds(
            repo.root, "merge-base", "--is-ancestor", base, verified
        ):
            errors.append(f"{path}: verified_commit does not descend from base_commit")
        expected_spec_hash = task_spec_hash(metadata, body)
        required_evidence = set(string_list(metadata.get("required_evidence")))
        if not required_evidence:
            errors.append(f"{path}: completion needs at least one required_evidence ID")
        allowed_paths = string_list(metadata.get("allowed_paths"))
        forbidden_paths = string_list(metadata.get("forbidden_paths"))
        if metadata.get("role") == "implementation" and not allowed_paths:
            errors.append(f"{path}: implementation completion needs allowed_paths")
        if base:
            changed_output = git(repo.root, "diff", "--name-only", base, verified)
            if changed_output is None:
                errors.append(f"{path}: cannot inspect changed paths")
            else:
                for changed_path in changed_output.splitlines():
                    if any(path_matches(changed_path, rule) for rule in forbidden_paths):
                        errors.append(f"{path}: forbidden path changed: {changed_path}")
                    if allowed_paths and not any(
                        path_matches(changed_path, rule) for rule in allowed_paths
                    ):
                        errors.append(f"{path}: changed path is not allowed: {changed_path}")
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
            and item[1].get("task_spec_sha256") == expected_spec_hash
            and source_unchanged(repo.root, item[1].get("commit"), verified)
        ]
        if not successful_tests:
            errors.append(f"{path}: no clean successful test evidence for verified_commit")
        covered_evidence = {
            str(item[1].get("acceptance_id"))
            for item in successful_tests
            if item[1].get("acceptance_id")
        }
        missing_evidence = sorted(required_evidence - covered_evidence)
        if missing_evidence:
            errors.append(
                f"{path}: missing successful evidence for {', '.join(missing_evidence)}"
            )
        approvals = [
            item
            for item in task_evidence
            if item[1].get("kind") == "review"
            and item[1].get("result") == "approved"
            and item[1].get("actor") == "terra"
            and item[1].get("implementer") == metadata.get("actor")
            and valid_session_id(item[1].get("implementation_session_id"))
            and item[1].get("implementation_session_id")
            == metadata.get("implementation_session_id")
            and valid_session_id(item[1].get("review_session_id"))
            and item[1].get("review_session_id")
            != item[1].get("implementation_session_id")
            and item[1].get("task_spec_sha256") == expected_spec_hash
            and resolve_commit(repo.root, item[1].get("reviewed_commit")) == verified
        ]
        if not approvals:
            errors.append(f"{path}: no Terra approval for the exact verified_commit")

    for path, metadata, _ in evidence_documents:
        if metadata.get("task") not in task_ids:
            errors.append(f"{path}: evidence references missing task {metadata.get('task')}")
        if metadata.get("actor") not in ACTORS[:-1]:
            errors.append(f"{path}: invalid evidence actor {metadata.get('actor')!r}")
        if metadata.get("kind") == "test":
            if not metadata.get("acceptance_id"):
                errors.append(f"{path}: test evidence is missing acceptance_id")
            if not re.fullmatch(r"[0-9a-f]{64}", str(metadata.get("task_spec_sha256", ""))):
                errors.append(f"{path}: test evidence is missing task_spec_sha256")
            if not metadata.get("summary") or metadata.get("summary") == "-":
                errors.append(f"{path}: test evidence is missing a sanitized summary")
        if metadata.get("kind") == "review" and metadata.get("actor") == metadata.get(
            "implementer"
        ):
            errors.append(f"{path}: self-review is not independent")
        if metadata.get("kind") == "review":
            implementation_session = metadata.get("implementation_session_id")
            review_session = metadata.get("review_session_id")
            if not valid_session_id(implementation_session):
                errors.append(f"{path}: review is missing implementation session ID")
            if not valid_session_id(review_session):
                errors.append(f"{path}: review is missing review session ID")
            if valid_session_id(implementation_session) and valid_session_id(
                review_session
            ) and implementation_session == review_session:
                errors.append(f"{path}: implementation and review sessions must differ")
            task = task_ids.get(str(metadata.get("task")))
            if task and metadata.get("implementer") != task[1].get("actor"):
                errors.append(f"{path}: review implementer does not match task actor")
            if task and implementation_session != task[1].get(
                "implementation_session_id"
            ):
                errors.append(f"{path}: review implementation session does not match task")
            if not re.fullmatch(r"[0-9a-f]{64}", str(metadata.get("task_spec_sha256", ""))):
                errors.append(f"{path}: review is missing task_spec_sha256")
    return errors


def cmd_validate(args: argparse.Namespace) -> int:
    repo = repository(args)
    completion_task_ids: set[str] = set()
    prefix = f"validate {args.scope}"
    if args.scope == "task":
        if not args.task:
            print("ERROR validate task requires --task <ID>")
            return 1
        if not repo.task(args.task):
            print(f"ERROR task not found: {args.task}")
            return 1
        completion_task_ids = {args.task}
    elif args.scope == "program":
        if not args.manifest:
            print("ERROR validate program requires --manifest <path>")
            return 1
        manifest_path = Path(args.manifest)
        if not manifest_path.is_absolute():
            manifest_path = repo.root / manifest_path
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            print(f"ERROR cannot read program manifest: {error}")
            return 1
        if (
            not isinstance(manifest, dict)
            or manifest.get("schema_version") != 1
            or not isinstance(manifest.get("tasks"), list)
            or not manifest["tasks"]
            or not all(isinstance(item, str) for item in manifest["tasks"])
        ):
            print("ERROR program manifest needs schema_version 1 and a non-empty tasks list")
            return 1
        completion_task_ids = set(manifest["tasks"])
        missing = sorted(task_id for task_id in completion_task_ids if not repo.task(task_id))
        if missing:
            print(f"ERROR program manifest references missing tasks: {', '.join(missing)}")
            return 1
    errors = validation_errors(repo, completion_task_ids)
    for error in errors:
        print(f"ERROR {error}")
    print(f"{prefix}: {'OK' if not errors else 'NG'} ({len(errors)} errors)")
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
    validate = commands.add_parser("validate")
    validate.add_argument(
        "scope", nargs="?", choices=("schema", "task", "program"), default="schema"
    )
    validate.add_argument("--task")
    validate.add_argument("--manifest")
    validate.set_defaults(handler=cmd_validate)
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
    task_new.add_argument("--implementation-session-id")
    task_new.add_argument("--task-shape", choices=TASK_SHAPES, default="isolated-lane")
    task_new.add_argument("--required-evidence", nargs="*")
    task_new.add_argument("--allowed-paths", nargs="*")
    task_new.add_argument("--forbidden-paths", nargs="*")
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
    task_set.add_argument("--implementation-session-id")
    task_set.add_argument("--task-shape", choices=TASK_SHAPES)
    task_set.add_argument("--required-evidence", nargs="+")
    task_set.add_argument("--allowed-paths", nargs="+")
    task_set.add_argument("--forbidden-paths", nargs="+")
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
    evidence_run.add_argument("--acceptance-id", required=True)
    evidence_run.add_argument("--summary", required=True)
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
    review_add.add_argument("--implementation-session-id")
    review_add.add_argument("--review-session-id")
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
