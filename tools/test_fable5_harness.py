from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("fable5_harness.py")
SPEC = importlib.util.spec_from_file_location("fable5_harness", MODULE_PATH)
assert SPEC and SPEC.loader
harness = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(harness)


def run(cwd: Path, *command: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(command),
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


class HarnessTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        run(self.root, "git", "init", "-b", "main")
        run(self.root, "git", "config", "user.email", "harness@example.invalid")
        run(self.root, "git", "config", "user.name", "Harness Test")
        (self.root / "AGENTS.md").write_text("# Test\n", encoding="utf-8")
        (self.root / "harness").mkdir()
        (self.root / "harness" / "HARNESS.md").write_text("# Harness\n", encoding="utf-8")
        (self.root / ".codex").mkdir()
        (self.root / ".codex" / "config.toml").write_text("[agents]\n", encoding="utf-8")
        agents = self.root / ".codex" / "agents"
        agents.mkdir()
        for name in ("sol-upstream.toml", "terra-pm.toml", "luna-implementer.toml"):
            (agents / name).write_text('name = "test"\n', encoding="utf-8")
        skill = self.root / ".agents" / "skills" / "fable5-harness"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text(
            "---\nname: fable5-harness\ndescription: test\n---\n", encoding="utf-8"
        )
        self.cli("state")
        run(self.root, "git", "add", "AGENTS.md", "harness", ".codex", ".agents")
        self.commit("initial")

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def cli(self, *arguments: str) -> int:
        return harness.main(["--root", str(self.root), *arguments])

    def commit(self, message: str) -> str:
        result = run(self.root, "git", "commit", "-am", message)
        if result.returncode != 0:
            self.fail(result.stderr or result.stdout)
        return run(self.root, "git", "rev-parse", "HEAD").stdout.strip()

    def add_task(self) -> None:
        base = run(self.root, "git", "rev-parse", "HEAD").stdout.strip()
        self.assertEqual(
            self.cli(
                "task",
                "new",
                "--id",
                "V2-01",
                "contract slice",
                "--role",
                "implementation",
                "--actor",
                "luna",
                "--base-commit",
                base,
                "--implementation-session-id",
                "implementation-session-1",
                "--task-shape",
                "isolated-lane",
                "--required-evidence",
                "unit",
                "--allowed-paths",
                "harness/state",
                "--forbidden-paths",
                ".env",
            ),
            0,
        )
        run(self.root, "git", "add", "harness/state/tasks")
        self.commit("add task")
        self.assertEqual(
            self.cli(
                "task",
                "set",
                "V2-01",
                "--status",
                "doing",
                "--branch",
                "codex/v2-01-contract",
            ),
            0,
        )
        self.commit("assign task")
        run(self.root, "git", "switch", "-c", "codex/v2-01-contract")

    def test_sanitize_masks_secrets_and_home(self) -> None:
        value = (
            r'api_key=abc123 --password "two words" '
            r"eyJhbGciOiJIUzI1NiJ9.demo.signature "
            r"Authorization: Bearer hidden C:\Users\alice\repo"
        )
        sanitized = harness.sanitize(value)
        self.assertNotIn("abc123", sanitized)
        self.assertNotIn("two words", sanitized)
        self.assertNotIn("eyJhbGciOiJIUzI1NiJ9.demo.signature", sanitized)
        self.assertNotIn("Bearer hidden", sanitized)
        self.assertNotIn("alice", sanitized)

    def test_doctor_and_empty_state_validate(self) -> None:
        self.assertEqual(self.cli("doctor"), 0)
        self.assertEqual(self.cli("validate", "schema"), 0)
        self.assertNotEqual(self.cli("validate", "task", "--task", "MISSING-01"), 0)

    def test_wrong_branch_blocks_evidence_execution(self) -> None:
        self.add_task()
        run(self.root, "git", "switch", "main")
        exit_code = self.cli(
            "evidence",
            "run",
            "--task",
            "V2-01",
            "--actor",
            "luna",
            "--acceptance-id",
            "unit",
            "--summary",
            "expected wrong branch failure",
            "--",
            sys.executable,
            "-c",
            "raise SystemExit(99)",
        )
        self.assertEqual(exit_code, 1)
        evidence = list((self.root / "harness" / "state" / "evidence").glob("*.md"))
        self.assertEqual(evidence, [])

    def test_done_requires_test_and_exact_terra_review(self) -> None:
        self.add_task()
        self.assertEqual(
            self.cli(
                "evidence",
                "run",
                "--task",
                "V2-01",
                "--actor",
                "luna",
                "--acceptance-id",
                "unit",
                "--summary",
                "unit validation",
                "--",
                sys.executable,
                "-c",
                "print('ok')",
            ),
            0,
        )
        run(self.root, "git", "add", "harness/state/evidence")
        verified = self.commit("record evidence")
        self.assertEqual(
            self.cli(
                "task",
                "set",
                "V2-01",
                "--status",
                "done",
                "--verified-commit",
                verified,
            ),
            0,
        )
        self.assertNotEqual(self.cli("validate", "task", "--task", "V2-01"), 0)
        self.assertEqual(
            self.cli(
                "review",
                "add",
                "--task",
                "V2-01",
                "--actor",
                "terra",
                "--implementer",
                "luna",
                "--result",
                "approved",
                "--reviewed-commit",
                verified,
                "--implementation-session-id",
                "implementation-session-1",
                "--review-session-id",
                "review-session-1",
            ),
            0,
        )
        self.assertEqual(self.cli("validate", "task", "--task", "V2-01"), 0)

    def test_secret_output_is_masked_in_summary_and_log(self) -> None:
        self.add_task()
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            self.assertEqual(
                self.cli(
                    "evidence",
                    "run",
                    "--task",
                    "V2-01",
                    "--actor",
                    "luna",
                    "--acceptance-id",
                    "unit",
                    "--summary",
                    "secret redaction validation",
                    "--",
                    sys.executable,
                    "-c",
                    (
                        "print('--token demo-value --password demo-value "
                        "sk-proj-demo-value "
                        "eyJhbGciOiJIUzI1NiJ9.demo.signature "
                        "https://user:demo-value@example.invalid/"
                        "?credential=demo-value safe-output')"
                    ),
                ),
                0,
            )
        evidence_root = self.root / "harness" / "state" / "evidence"
        content = "\n".join(
            path.read_text(encoding="utf-8")
            for path in evidence_root.rglob("*")
            if path.is_file()
        )
        raw_secrets = (
            "--token demo-value",
            "--password demo-value",
            "sk-proj-demo-value",
            "eyJhbGciOiJIUzI1NiJ9.demo.signature",
            "https://user:demo-value@example.invalid/?credential=demo-value",
        )
        for raw_secret in raw_secrets:
            self.assertNotIn(raw_secret, content)
            self.assertNotIn(raw_secret, output.getvalue())
        self.assertNotIn("demo-value", content)
        self.assertNotIn("demo-value", output.getvalue())
        self.assertIn("safe-output", content)
        self.assertIn("safe-output", output.getvalue())
        self.assertIn("[command redacted]", content)
        self.assertNotIn("print(", content)

    def test_self_review_is_rejected(self) -> None:
        self.add_task()
        head = run(self.root, "git", "rev-parse", "HEAD").stdout.strip()
        self.assertEqual(
            self.cli(
                "review",
                "add",
                "--task",
                "V2-01",
                "--actor",
                "luna",
                "--implementer",
                "luna",
                "--result",
                "approved",
                "--reviewed-commit",
                head,
                "--implementation-session-id",
                "implementation-session-1",
                "--review-session-id",
                "review-session-1",
            ),
            1,
        )
        reviews = list((self.root / "harness" / "state" / "evidence").glob("*review.md"))
        self.assertEqual(reviews, [])

    def test_same_session_review_is_rejected_before_recording(self) -> None:
        self.add_task()
        head = run(self.root, "git", "rev-parse", "HEAD").stdout.strip()
        self.assertEqual(
            self.cli(
                "review",
                "add",
                "--task",
                "V2-01",
                "--actor",
                "terra",
                "--implementer",
                "luna",
                "--result",
                "approved",
                "--reviewed-commit",
                head,
                "--implementation-session-id",
                "implementation-session-1",
                "--review-session-id",
                "implementation-session-1",
            ),
            1,
        )
        reviews = list((self.root / "harness" / "state" / "evidence").glob("*review.md"))
        self.assertEqual(reviews, [])

    def test_unmapped_success_command_cannot_complete_task(self) -> None:
        self.add_task()
        self.assertEqual(
            self.cli(
                "evidence",
                "run",
                "--task",
                "V2-01",
                "--actor",
                "luna",
                "--acceptance-id",
                "unrelated",
                "--summary",
                "unrelated command",
                "--",
                sys.executable,
                "-c",
                "pass",
            ),
            0,
        )
        run(self.root, "git", "add", "harness/state/evidence")
        verified = self.commit("record unrelated evidence")
        self.assertEqual(
            self.cli(
                "task",
                "set",
                "V2-01",
                "--status",
                "done",
                "--verified-commit",
                verified,
            ),
            0,
        )
        self.assertEqual(
            self.cli(
                "review",
                "add",
                "--task",
                "V2-01",
                "--actor",
                "terra",
                "--implementer",
                "luna",
                "--result",
                "approved",
                "--reviewed-commit",
                verified,
                "--implementation-session-id",
                "implementation-session-1",
                "--review-session-id",
                "review-session-1",
            ),
            0,
        )
        self.assertNotEqual(self.cli("validate", "task", "--task", "V2-01"), 0)

    def test_task_spec_change_invalidates_older_evidence(self) -> None:
        self.add_task()
        self.assertEqual(
            self.cli(
                "evidence",
                "run",
                "--task",
                "V2-01",
                "--actor",
                "luna",
                "--acceptance-id",
                "unit",
                "--summary",
                "unit validation",
                "--",
                sys.executable,
                "-c",
                "print('ok')",
            ),
            0,
        )
        run(self.root, "git", "add", "harness/state/evidence")
        self.commit("record evidence")
        task_path = next((self.root / "harness" / "state" / "tasks").glob("V2-01-*.md"))
        task_path.write_text(
            task_path.read_text(encoding="utf-8")
            + "\n## Added acceptance\n\n- changed after evidence\n",
            encoding="utf-8",
        )
        run(self.root, "git", "add", str(task_path))
        changed_spec = self.commit("change task specification")
        self.assertEqual(
            self.cli(
                "task",
                "set",
                "V2-01",
                "--status",
                "done",
                "--verified-commit",
                changed_spec,
            ),
            0,
        )
        self.assertEqual(
            self.cli(
                "review",
                "add",
                "--task",
                "V2-01",
                "--actor",
                "terra",
                "--implementer",
                "luna",
                "--result",
                "approved",
                "--reviewed-commit",
                changed_spec,
                "--implementation-session-id",
                "implementation-session-1",
                "--review-session-id",
                "review-session-1",
            ),
            0,
        )
        self.assertNotEqual(self.cli("validate", "task", "--task", "V2-01"), 0)

    def test_program_validation_requires_declared_done_tasks(self) -> None:
        manifest = self.root / "program.json"
        manifest.write_text(
            json.dumps({"schema_version": 1, "tasks": ["V2-01"]}),
            encoding="utf-8",
        )
        self.assertNotEqual(
            self.cli("validate", "program", "--manifest", str(manifest)), 0
        )

    def test_unrelated_same_tree_commit_is_not_fresh_evidence(self) -> None:
        self.add_task()
        tested = run(self.root, "git", "rev-parse", "HEAD").stdout.strip()
        tree = run(self.root, "git", "rev-parse", f"{tested}^{{tree}}").stdout.strip()
        unrelated = run(
            self.root, "git", "commit-tree", tree, "-m", "unrelated root"
        ).stdout.strip()
        self.assertTrue(unrelated)
        self.assertFalse(harness.source_unchanged(self.root, tested, unrelated))


if __name__ == "__main__":
    unittest.main()
