import type { AgentWorkflowStudioBundle } from './exportBundle'
import { BUNDLE_APP_NAME, BUNDLE_SCHEMA_VERSION } from './exportBundle'

export type BundleValidationResult =
  | { valid: true; bundle: AgentWorkflowStudioBundle; warnings: string[] }
  | { valid: false; error: string; warnings: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function looksLikeWorkflow(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    isString(value['id']) &&
    isString(value['name']) &&
    Array.isArray(value['nodes']) &&
    Array.isArray(value['connections'])
  )
}

export function validateImportBundle(raw: unknown): BundleValidationResult {
  const warnings: string[] = []

  if (!isRecord(raw)) {
    return { valid: false, error: 'バンドルのフォーマットが不正です（オブジェクトではありません）。', warnings }
  }

  if (raw['appName'] !== BUNDLE_APP_NAME) {
    return {
      valid: false,
      error: `このファイルは Agent Workflow Studio のバンドルではありません（appName: ${String(raw['appName'])}）。`,
      warnings,
    }
  }

  if (raw['schemaVersion'] !== BUNDLE_SCHEMA_VERSION) {
    warnings.push(
      `バンドルのスキーマバージョン (${String(raw['schemaVersion'])}) が現在のバージョン (${BUNDLE_SCHEMA_VERSION}) と異なります。互換性に問題が生じる可能性があります。`,
    )
  }

  if (!looksLikeWorkflow(raw['workflow'])) {
    return {
      valid: false,
      error: 'バンドル内のワークフローデータが不正です。',
      warnings,
    }
  }

  const templates = Array.isArray(raw['templates']) ? raw['templates'] : []
  if (!Array.isArray(raw['templates'])) {
    warnings.push('テンプレートデータが配列ではありません。テンプレートはインポートされません。')
  }

  if (!isString(raw['exportedAt'])) {
    warnings.push('exportedAt フィールドが見つかりません。')
  }

  const bundle: AgentWorkflowStudioBundle = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    exportedAt: isString(raw['exportedAt']) ? raw['exportedAt'] : new Date().toISOString(),
    appName: BUNDLE_APP_NAME,
    workflow: raw['workflow'] as AgentWorkflowStudioBundle['workflow'],
    templates: templates as AgentWorkflowStudioBundle['templates'],
    settings: isRecord(raw['settings']) ? (raw['settings'] as AgentWorkflowStudioBundle['settings']) : undefined,
    notes: isString(raw['notes']) ? raw['notes'] : undefined,
  }

  return { valid: true, bundle, warnings }
}

export async function readBundleFromFile(file: File): Promise<BundleValidationResult> {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown
    return validateImportBundle(parsed)
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? `JSON解析エラー: ${e.message}` : 'ファイルの読み込みに失敗しました。',
      warnings: [],
    }
  }
}
