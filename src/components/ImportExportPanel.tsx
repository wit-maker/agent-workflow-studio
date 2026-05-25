import { useRef, useState, useCallback } from 'react'
import type { Workflow } from '../domain/workflow'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'
import type { AppSettings } from '../storage/localAppSettings'
import {
  createWorkflowBundle,
  createFullBundle,
  downloadBundle,
  buildExportFilename,
} from '../domain/exportBundle'
import { readBundleFromFile } from '../domain/importValidation'

type ImportResult =
  | { status: 'success'; workflowName: string; templateCount: number; warnings: string[] }
  | { status: 'error'; error: string; warnings: string[] }

type ImportExportPanelProps = {
  workflow: Workflow
  templates: SavedWorkflowTemplate[]
  settings?: AppSettings
  onImportBundle: (bundle: {
    workflow: Workflow
    templates: SavedWorkflowTemplate[]
    settings?: AppSettings
  }) => void
}

export function ImportExportPanel({
  workflow,
  templates,
  settings,
  onImportBundle,
}: ImportExportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Counter to detect stale async reads. Incremented on every file-picker event (including cancel)
  // so that closing the picker without selecting a file also invalidates any in-flight read.
  const fileSelectionCountRef = useRef(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    workflow: Workflow
    templates: SavedWorkflowTemplate[]
    settings?: AppSettings
    warnings: string[]
  } | null>(null)

  function handleExportWorkflow() {
    const bundle = createWorkflowBundle(workflow)
    downloadBundle(bundle, buildExportFilename(workflow.id || 'workflow'))
  }

  function handleExportFullBundle() {
    const bundle = createFullBundle(workflow, templates, settings)
    downloadBundle(bundle, buildExportFilename('full-bundle'))
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Increment before the early return: canceling the file picker (no file) also
    // advances the counter and invalidates any in-flight read from the previous selection.
    const selectionId = ++fileSelectionCountRef.current

    if (!file) return

    e.target.value = ''
    setImportResult(null)
    setPendingImport(null)

    const result = await readBundleFromFile(file)

    if (selectionId !== fileSelectionCountRef.current) {
      // A newer file was selected — discard this stale result.
      return
    }

    if (!result.valid) {
      setImportResult({ status: 'error', error: result.error, warnings: result.warnings })
      return
    }

    setPendingImport({
      workflow: result.bundle.workflow,
      templates: result.bundle.templates,
      settings: result.bundle.settings,
      warnings: result.warnings,
    })
  }, [])

  function confirmImport() {
    if (!pendingImport) return
    onImportBundle({
      workflow: pendingImport.workflow,
      templates: pendingImport.templates,
      settings: pendingImport.settings,
    })
    setImportResult({
      status: 'success',
      workflowName: pendingImport.workflow.name,
      templateCount: pendingImport.templates.length,
      warnings: pendingImport.warnings,
    })
    setPendingImport(null)
  }

  function cancelImport() {
    setPendingImport(null)
    setImportResult(null)
  }

  return (
    <div className="import-export-panel">
      <h4>エクスポート / インポート</h4>
      <p className="muted">
        ワークフローやバンドルをファイルとして保存・復元できます。将来のDesktopファイル保存に対応した形式です。
      </p>

      <div className="import-export-actions">
        <div className="export-group">
          <strong>エクスポート</strong>
          <button type="button" className="primary-button" onClick={handleExportWorkflow}>
            現在のワークフローを保存
          </button>
          <button type="button" className="icon-button" onClick={handleExportFullBundle}>
            フルバンドルを保存（ワークフロー＋テンプレート＋設定）
          </button>
        </div>

        <div className="import-group">
          <strong>インポート</strong>
          <button type="button" className="primary-button" onClick={handleImportClick}>
            バンドルを読み込む
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </div>
      </div>

      {pendingImport ? (
        <div className="import-preview">
          <p>
            <strong>読み込み確認</strong>
          </p>
          <p>
            ワークフロー: <strong>{pendingImport.workflow.name}</strong>
          </p>
          <p>
            テンプレート: {pendingImport.templates.length} 件
            {pendingImport.settings ? '（このバンドルで置き換えます）' : '（現在の保存内容を維持します）'}
          </p>
          <p>
            設定: {pendingImport.settings ? '復元します' : 'このバンドルには含まれていません'}
          </p>
          {pendingImport.warnings.length > 0 ? (
            <ul className="import-warnings">
              {pendingImport.warnings.map((w, i) => (
                <li key={i} className="health-warn">
                  {w}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="muted">
            現在のワークフローは置き換えられます。settings を含むフルバンドルでは、テンプレートとアプリ設定もこのバンドルの内容で復元します。
          </p>
          <div className="import-confirm-actions">
            <button type="button" className="primary-button" onClick={confirmImport}>
              インポートする
            </button>
            <button type="button" className="icon-button" onClick={cancelImport}>
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {importResult ? (
        <div
          className={
            importResult.status === 'success' ? 'import-result-success' : 'import-result-error'
          }
        >
          {importResult.status === 'success' ? (
            <>
              <p>
                ✓ 「{importResult.workflowName}」を読み込みました。
                {importResult.templateCount > 0
                  ? ` テンプレート ${importResult.templateCount} 件も復元されました。`
                  : ''}
              </p>
              {importResult.warnings.length > 0 ? (
                <ul className="import-warnings">
                  {importResult.warnings.map((w, i) => (
                    <li key={i} className="health-warn">
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              <p>✗ インポート失敗: {importResult.error}</p>
              {importResult.warnings.length > 0 ? (
                <ul className="import-warnings">
                  {importResult.warnings.map((w, i) => (
                    <li key={i} className="health-warn">
                      {w}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
