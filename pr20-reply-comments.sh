#!/usr/bin/env bash
# PR #20 review comment replies
# Run from repo root after verifying content

REPO="wit-maker/agent-workflow-studio"

gh api repos/$REPO/pulls/20/comments/3294786196/replies --method POST \
  --field body="Fixed: validateWorkflowImport in workflowSelectors.ts fully normalizes all required Workflow fields (status, metrics, artifact, logs, etc.) with safe defaults. No unsafe type cast remains."

gh api repos/$REPO/pulls/20/comments/3294786198/replies --method POST \
  --field body="Fixed: all template/settings operations in AppShell.tsx now route through storageAdapter.* (loadTemplates, saveTemplate, replaceTemplates, deleteTemplate, saveSettings, clearAll). No direct internal-module calls remain."

gh api repos/$REPO/pulls/20/comments/3294796366/replies --method POST \
  --field body="Fixed: storageValidation.ts now distinguishes JSON-backed keys from plain-string keys. canvas-mode is treated as valid plain text and never parsed as JSON."

gh api repos/$REPO/pulls/20/comments/3294796367/replies --method POST \
  --field body="Fixed: validateWorkflowImport normalizes every required Workflow field with safe defaults (status→idle, metrics→{}, artifact→{}, logs→[], etc.). Bundles missing these fields are now accepted safely rather than causing runtime errors."

gh api repos/$REPO/pulls/20/comments/3294796369/replies --method POST \
  --field body="Fixed: validateTemplates() calls normalizeSavedWorkflowTemplate() for each entry and returns valid:false on any malformed entry, preventing template.metadata.tags crashes at import time."

gh api repos/$REPO/pulls/20/comments/3294796371/replies --method POST \
  --field body="Fixed: pendingImport now carries settings?: AppSettings and onImportBundle passes it through. AppShell.handleImportBundle restores settings on full-bundle import."

gh api repos/$REPO/pulls/20/comments/3294796375/replies --method POST \
  --field body="Fixed: getAllConnectorReadiness now returns mode:'mock' for human-review and local-mock connectors instead of not-configured."

gh api repos/$REPO/pulls/20/comments/3294796378/replies --method POST \
  --field body="Fixed: full-bundle import calls storageAdapter.replaceTemplates(bundle.templates) which clears existing templates before writing the bundle contents. Workflow-only import keeps merge-by-id behavior."

gh api repos/$REPO/pulls/20/comments/3294796380/replies --method POST \
  --field body="Fixed: BottomMonitor passes settings prop into ImportExportPanel, and handleExportFullBundle uses createFullBundle(workflow, templates, settings) so app settings are included in every full-bundle export."

gh api repos/$REPO/pulls/20/comments/3294980422/replies --method POST \
  --field body="Fixed: handleImportBundle calls storageAdapter.replaceTemplates(bundle.templates) which calls replaceWorkflowTemplates(), writing the serialized SavedWorkflowTemplate records directly without rebuilding them. Original createdAt/updatedAt/metadata are preserved."

gh api repos/$REPO/pulls/20/comments/3294980424/replies --method POST \
  --field body="Fixed: fileSelectionCountRef.current is now incremented before the if(!file) return check, so canceling the file picker also advances the counter and invalidates any in-flight read."

gh api repos/$REPO/pulls/20/comments/3295014842/replies --method POST \
  --field body="Fixed: handleResetStorage calls storageAdapter.clearAll() which calls clearAppSettings() (removes the app-settings.v1 key) and then sets in-memory state to DEFAULT_APP_SETTINGS. Settings are fully cleared on reset."

echo "All replies posted."
