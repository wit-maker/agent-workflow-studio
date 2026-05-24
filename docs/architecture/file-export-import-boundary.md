# File Export / Import Boundary

M18 hardens workflow bundle export/import without introducing real file-system persistence, credentials, Tauri, SQLite, or a backend service.

## Scope

The browser can export a JSON bundle and import a JSON bundle through the existing UI. The bundle is a portable data artifact, not the app's primary storage engine.

Included:

- Export the current workflow.
- Export a full bundle containing workflow, templates, and optional settings.
- Validate imported bundle structure before applying it.
- Report invalid JSON or invalid bundle shape without mutating the current workflow.
- Apply valid imports through the app-level import handler.

Not included:

- Native file-system persistence.
- Credential export/import.
- `.env` creation.
- Tauri or OS Keychain integration.
- SQLite or database storage.

## Boundary Rules

- Bundle reads and writes stay in browser file APIs.
- Import validation must normalize data before it reaches app state.
- Invalid bundles must be rejected with an explicit error.
- Exported bundles must not contain credential values.
- A future desktop storage adapter may reuse the bundle shape, but it should not bypass validation.

## UI Integration

`ImportExportPanel` is available from the BottomMonitor Storage tab. It provides:

- Export Current Workflow.
- Export Full Bundle.
- Import Bundle.
- Valid import preview and confirmation.
- Invalid import error display.

## Verification

The expected verification path is:

1. Build and lint pass.
2. Storage tab renders `ImportExportPanel`.
3. Current workflow export triggers the download path.
4. Full bundle export triggers the download path.
5. Valid bundle import shows a confirmation before applying.
6. Invalid bundle import is rejected without changing workflow state.

Headless or in-app browser environments may restrict native download and upload dialogs. In that case, QA should verify that the UI and implementation path are present and report the browser limitation.
