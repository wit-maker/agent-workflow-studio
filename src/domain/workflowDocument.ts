import type {
  WorkflowConnection,
  WorkflowNode,
  WorkflowSchemaVersion,
  WorkflowStatus,
} from './workflow'
import { normalizeConnectionRuntimePolicy } from './edgeRuntimePolicy'
import { connectionKinds, normalizeNodeCategory } from './workflow'

const workflowStatuses = [
  'draft', 'ready', 'invalid', 'running', 'paused',
  'success', 'failed', 'review_required', 'archived', 'cancelled',
] as const satisfies WorkflowStatus[]

export const CURRENT_WORKFLOW_SCHEMA_VERSION: WorkflowSchemaVersion = '2.0'

export type WorkflowViewport = {
  x: number
  y: number
  zoom: number
}

export type WorkflowRunConfig = {
  mode: 'all' | 'selected' | 'fromSelected' | 'dryRun' | 'validate'
  targetNodeIds?: string[]
  maxRetries?: number
  timeoutMs?: number
}

export type WorkflowDocumentMetadata = {
  description: string
  createdAt: string
  updatedAt: string
  version: number
  tags?: string[]
  category?: string
  sourceWorkflowId?: string
  sourceRunId?: string
}

export type WorkflowDocumentTemplateReference = {
  templateId: string
  title: string
  version?: number
  sourceWorkflowId?: string
  sourceRunId?: string
}

// WorkflowDocument is the canonical persisted/audited form of a workflow.
// The runtime app still uses the Workflow type internally; this type targets
// save / restore / execution / audit / template use cases.
export type WorkflowDocument = {
  schemaVersion: WorkflowSchemaVersion
  workflowId: string
  title: string
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  templates: WorkflowDocumentTemplateReference[]
  status?: WorkflowStatus
  viewport?: WorkflowViewport
  runConfig?: WorkflowRunConfig
  metadata: WorkflowDocumentMetadata
}

export type WorkflowMigrationResult =
  | { success: true; fromVersion: string; toVersion: WorkflowSchemaVersion; warnings: string[]; document: WorkflowDocument }
  | { success: false; fromVersion: string; toVersion: WorkflowSchemaVersion; warnings: string[]; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeMetadata(raw: unknown, now: string): WorkflowDocumentMetadata {
  const r = isRecord(raw) ? raw : {}
  return {
    description: typeof r.description === 'string' ? r.description : '',
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
    version: isFiniteNumber(r.version) ? r.version : 1,
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : undefined,
    category: typeof r.category === 'string' ? r.category : undefined,
    sourceWorkflowId: typeof r.sourceWorkflowId === 'string' ? r.sourceWorkflowId : undefined,
    sourceRunId: typeof r.sourceRunId === 'string' ? r.sourceRunId : undefined,
  }
}

function normalizeViewport(raw: unknown): WorkflowViewport | undefined {
  if (!isRecord(raw)) return undefined
  if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y) || !isFiniteNumber(raw.zoom)) return undefined
  return { x: raw.x, y: raw.y, zoom: raw.zoom }
}

function normalizeRunConfig(raw: unknown): WorkflowRunConfig | undefined {
  if (!isRecord(raw)) return undefined
  const modes = ['all', 'selected', 'fromSelected', 'dryRun', 'validate'] as const
  const mode = modes.includes(raw.mode as (typeof modes)[number]) ? (raw.mode as WorkflowRunConfig['mode']) : undefined
  if (!mode) return undefined
  return {
    mode,
    targetNodeIds: Array.isArray(raw.targetNodeIds)
      ? raw.targetNodeIds.filter((id): id is string => typeof id === 'string')
      : undefined,
    maxRetries: isFiniteNumber(raw.maxRetries) ? raw.maxRetries : undefined,
    timeoutMs: isFiniteNumber(raw.timeoutMs) ? raw.timeoutMs : undefined,
  }
}

function normalizeNodes(raw: unknown): WorkflowNode[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item) =>
        isRecord(item) &&
        typeof item.id === 'string' && item.id.trim() !== '' &&
        typeof item.title === 'string' && item.title.trim() !== '',
    )
    .map((item: Record<string, unknown>) => ({
      id: (item.id as string).trim(),
      type: typeof item.type === 'string' ? item.type : 'unknown',
      title: (item.title as string).trim(),
      category: normalizeNodeCategory(item.category),
      description: typeof item.description === 'string' ? item.description : '',
      status: 'idle' as const,
      agentRole: item.agentRole as WorkflowNode['agentRole'],
      inputTypes: Array.isArray(item.inputTypes) ? (item.inputTypes as WorkflowNode['inputTypes']) : [],
      outputTypes: Array.isArray(item.outputTypes) ? (item.outputTypes as WorkflowNode['outputTypes']) : [],
      inputPorts: Array.isArray(item.inputPorts) ? (item.inputPorts as WorkflowNode['inputPorts']) : undefined,
      outputPorts: Array.isArray(item.outputPorts) ? (item.outputPorts as WorkflowNode['outputPorts']) : undefined,
      config: isRecord(item.config) ? (item.config as Record<string, unknown>) : {},
      position: isRecord(item.position) && isFiniteNumber(item.position.x) && isFiniteNumber(item.position.y)
        ? { x: item.position.x, y: item.position.y }
        : { x: 0, y: 0 },
      metrics: isRecord(item.metrics) ? (item.metrics as WorkflowNode['metrics']) : undefined,
      lastRun: isRecord(item.lastRun) ? (item.lastRun as WorkflowNode['lastRun']) : undefined,
    }))
}

function createUniqueDocumentId(
  rawId: unknown,
  fallbackPrefix: string,
  index: number,
  usedIds: Set<string>,
): string {
  const base =
    typeof rawId === 'string' && rawId.trim()
      ? rawId.trim()
      : `${fallbackPrefix}-${index}`
  let candidate = base
  let suffix = 1
  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  usedIds.add(candidate)
  return candidate
}

function normalizeConnections(raw: unknown, nodeIds: Set<string>): WorkflowConnection[] {
  // Accept both 'connections' (current app) and 'edges' (source-spec naming)
  const items = Array.isArray(raw) ? raw : []
  const usedIds = new Set<string>()
  return items
    .filter((item) => {
      if (!isRecord(item)) return false
      const sourceNodeId = typeof item.sourceNodeId === 'string' ? item.sourceNodeId.trim() : ''
      const targetNodeId = typeof item.targetNodeId === 'string' ? item.targetNodeId.trim() : ''
      return sourceNodeId !== '' && targetNodeId !== '' && nodeIds.has(sourceNodeId) && nodeIds.has(targetNodeId)
    })
    .map((item: Record<string, unknown>, index) => {
      const sourceNodeId = (item.sourceNodeId as string).trim()
      const targetNodeId = (item.targetNodeId as string).trim()
      const rawKind = item.kind as string
      const kind: WorkflowConnection['kind'] = (connectionKinds as readonly string[]).includes(rawKind)
        ? (rawKind as WorkflowConnection['kind'])
        : 'data'
      return {
        id: createUniqueDocumentId(item.id, 'conn-doc', index, usedIds),
        sourceNodeId,
        sourcePort: typeof item.sourcePort === 'string' ? item.sourcePort : undefined,
        sourcePortId: typeof item.sourcePortId === 'string' ? item.sourcePortId : undefined,
        targetNodeId,
        targetPort: typeof item.targetPort === 'string' ? item.targetPort : undefined,
        targetPortId: typeof item.targetPortId === 'string' ? item.targetPortId : undefined,
        kind,
        carries: Array.isArray(item.carries) ? (item.carries as WorkflowConnection['carries']) : [],
        status: 'inactive' as const,
        runtimePolicy: normalizeConnectionRuntimePolicy(item.runtimePolicy),
        metrics: isRecord(item.metrics) ? (item.metrics as WorkflowConnection['metrics']) : undefined,
      }
    })
}

function normalizeTemplates(raw: unknown): WorkflowDocumentTemplateReference[] {
  if (!Array.isArray(raw)) return []

  const usedIds = new Set<string>()
  return raw
    .filter((item) => isRecord(item))
    .map((item, index) => ({
      templateId: createUniqueDocumentId(item.templateId, 'template-doc', index, usedIds),
      title:
        typeof item.title === 'string' && item.title.trim()
          ? item.title.trim()
          : 'Imported Template',
      version: isFiniteNumber(item.version) ? item.version : undefined,
      sourceWorkflowId:
        typeof item.sourceWorkflowId === 'string' ? item.sourceWorkflowId : undefined,
      sourceRunId:
        typeof item.sourceRunId === 'string' ? item.sourceRunId : undefined,
    }))
}

function detectSchemaVersion(raw: Record<string, unknown>): string {
  if (typeof raw.schemaVersion === 'string' && raw.schemaVersion.trim()) {
    return raw.schemaVersion.trim()
  }
  return 'unknown'
}

// normalizeWorkflowDocument converts any unknown raw value into a WorkflowDocument
// at CURRENT_WORKFLOW_SCHEMA_VERSION. Returns null if the input is not a valid workflow object.
// `now` can be injected for deterministic testing; defaults to the current time.
export function normalizeWorkflowDocument(raw: unknown, now = new Date().toISOString()): WorkflowDocument | null {
  if (!isRecord(raw)) return null

  const idField = raw.workflowId ?? raw.id
  if (typeof idField !== 'string' || !idField.trim()) return null

  const titleField = raw.title ?? raw.name
  if (typeof titleField !== 'string' || !titleField.trim()) return null

  const rawNodes = raw.nodes ?? []
  const nodes = normalizeNodes(rawNodes)
  const nodeIds = new Set(nodes.map((n) => n.id))

  // Accept both 'connections' (current runtime) and 'edges' (spec naming)
  const rawConnections = Array.isArray(raw.connections) ? raw.connections : (Array.isArray(raw.edges) ? raw.edges : [])
  const connections = normalizeConnections(rawConnections, nodeIds)

  const metadataSource = isRecord(raw.metadata) ? raw.metadata : raw
  const metadata = normalizeMetadata(metadataSource, now)

  return {
    schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
    workflowId: idField.trim(),
    title: titleField.trim(),
    nodes,
    connections,
    templates: normalizeTemplates(raw.templates),
    status: (workflowStatuses as readonly string[]).includes(raw.status as string)
      ? (raw.status as WorkflowStatus)
      : undefined,
    viewport: normalizeViewport(raw.viewport),
    runConfig: normalizeRunConfig(raw.runConfig),
    metadata,
  }
}

// migrateWorkflowDocument upgrades a raw workflow object to CURRENT_WORKFLOW_SCHEMA_VERSION.
// This is a placeholder: version 1.0 and 1.1 are accepted with warnings, not field-transformed.
// Full field migration logic should be added here as the schema evolves.
export function migrateWorkflowDocument(raw: unknown, now = new Date().toISOString()): WorkflowMigrationResult {
  const fromVersion = isRecord(raw) ? detectSchemaVersion(raw) : 'unknown'
  const toVersion = CURRENT_WORKFLOW_SCHEMA_VERSION
  const warnings: string[] = []

  if (!isRecord(raw)) {
    return { success: false, fromVersion, toVersion, warnings, error: '入力が有効なオブジェクトではありません。' }
  }

  if (fromVersion === 'unknown') {
    warnings.push('schemaVersion がありません。旧形式として扱い 2.0 へ補完します。')
  } else if (fromVersion === '1.0') {
    warnings.push('schemaVersion 1.0 を検出しました。フィールドは現行のまま 2.0 へ昇格します。')
  } else if (fromVersion === '1.1') {
    warnings.push('schemaVersion 1.1 を検出しました。フィールドは現行のまま 2.0 へ昇格します。')
  } else if (fromVersion !== CURRENT_WORKFLOW_SCHEMA_VERSION) {
    warnings.push(`未知の schemaVersion "${fromVersion}" です。最善の正規化を試みます。`)
  }

  const document = normalizeWorkflowDocument(raw, now)
  if (!document) {
    return {
      success: false,
      fromVersion,
      toVersion,
      warnings,
      error: 'ワークフロー必須フィールド (id/title) が見つからないため migration できません。',
    }
  }

  return { success: true, fromVersion, toVersion, warnings, document }
}
