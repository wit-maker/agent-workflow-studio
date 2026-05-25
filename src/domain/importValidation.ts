import type { AgentWorkflowStudioBundle } from './exportBundle'
import { BUNDLE_APP_NAME, BUNDLE_SCHEMA_VERSION } from './exportBundle'
import type { AppSettings } from '../storage/localAppSettings'
import { normalizeAppSettings } from '../storage/localAppSettings'
import {
  normalizeSavedWorkflowTemplate,
  type SavedWorkflowTemplate,
} from '../storage/localTemplates'
import { validateWorkflowImport } from '../state/workflowSelectors'

export type BundleValidationResult =
  | { valid: true; bundle: AgentWorkflowStudioBundle; warnings: string[] }
  | { valid: false; error: string; warnings: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function validateTemplates(value: unknown): {
  valid: true
  templates: SavedWorkflowTemplate[]
} | {
  valid: false
  error: string
} {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      error: 'バンドル内のテンプレートデータが不正です（配列ではありません）。',
    }
  }

  const templates: SavedWorkflowTemplate[] = []
  const seenIds = new Set<string>()

  for (const entry of value) {
    const template = normalizeSavedWorkflowTemplate(entry)
    if (!template) {
      return {
        valid: false,
        error: 'バンドル内に不正なテンプレートエントリが含まれています。',
      }
    }

    if (seenIds.has(template.id)) {
      return {
        valid: false,
        error: `テンプレートIDが重複しています: ${template.id}`,
      }
    }

    seenIds.add(template.id)
    templates.push(template)
  }

  return { valid: true, templates }
}

function validateSettings(
  value: unknown,
  warnings: string[],
): { valid: true; settings: AppSettings | undefined } | { valid: false; error: string } {
  if (typeof value === 'undefined') {
    return { valid: true, settings: undefined }
  }

  if (!isRecord(value)) {
    return {
      valid: false,
      error: 'バンドル内の settings データが不正です。',
    }
  }

  const settings = normalizeAppSettings(value)
  if (!settings) {
    return {
      valid: false,
      error: 'バンドル内の settings データが不正です。',
    }
  }

  if (value['canvasMode'] !== settings.canvasMode || value['activeTab'] !== settings.activeTab) {
    warnings.push('settings に不正な値があったため、安全な既定値へ正規化しました。')
  }

  return { valid: true, settings }
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

  const workflowResult = validateWorkflowImport(raw['workflow'])
  if (!workflowResult.valid || !workflowResult.workflow) {
    return {
      valid: false,
      error: workflowResult.error ?? 'バンドル内のワークフローデータが不正です。',
      warnings,
    }
  }

  const templateResult = validateTemplates(raw['templates'])
  if (!templateResult.valid) {
    return {
      valid: false,
      error: templateResult.error,
      warnings,
    }
  }

  const settingsResult = validateSettings(raw['settings'], warnings)
  if (!settingsResult.valid) {
    return {
      valid: false,
      error: settingsResult.error,
      warnings,
    }
  }

  if (!isString(raw['exportedAt'])) {
    warnings.push('exportedAt フィールドが見つかりません。')
  }

  const bundle: AgentWorkflowStudioBundle = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    exportedAt: isString(raw['exportedAt']) ? raw['exportedAt'] : new Date().toISOString(),
    appName: BUNDLE_APP_NAME,
    workflow: workflowResult.workflow,
    templates: templateResult.templates,
    settings: settingsResult.settings,
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
