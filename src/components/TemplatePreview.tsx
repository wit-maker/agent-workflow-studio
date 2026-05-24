import { useMemo } from 'react'
import {
  connectionKindLabels,
  evaluationStatusLabels,
  formatDataTypeLabel,
} from '../domain/displayLabels'
import { getInputPorts } from '../domain/portRules'
import type { WorkflowNode } from '../domain/workflow'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'

type TemplatePreviewProps = {
  template: SavedWorkflowTemplate | null
  pendingLoad: boolean
  onRequestLoad: (id: string) => void
  onConfirmLoad: (id: string) => void
  onCancelLoad: () => void
  onDuplicateTemplate: (id: string) => void
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ja-JP')
}

function formatEvaluationStatus(status?: string): string {
  if (!status) {
    return '未評価'
  }

  return evaluationStatusLabels[status as keyof typeof evaluationStatusLabels] ?? status
}

function formatConnectionLabel(
  nodeById: Map<string, WorkflowNode>,
  sourceNodeId: string,
  targetNodeId: string,
): string {
  const sourceNode = nodeById.get(sourceNodeId)
  const targetNode = nodeById.get(targetNodeId)
  return `${sourceNode?.title ?? sourceNodeId} → ${targetNode?.title ?? targetNodeId}`
}

function formatNodePorts(node: WorkflowNode): string {
  const requiredInputs = getInputPorts(node).filter((port) => port.required)
  if (requiredInputs.length === 0) {
    return '必須ポートなし'
  }

  return `必須: ${requiredInputs.map((port) => formatDataTypeLabel(port.dataType)).join(', ')}`
}

export function TemplatePreview({
  template,
  pendingLoad,
  onRequestLoad,
  onConfirmLoad,
  onCancelLoad,
  onDuplicateTemplate,
}: TemplatePreviewProps) {
  const nodeById = useMemo(
    () => new Map((template?.snapshot.nodes ?? []).map((node) => [node.id, node])),
    [template?.snapshot.nodes],
  )

  if (!template) {
    return (
      <aside className="template-preview-panel">
        <div className="panel-heading compact">
          <span className="eyebrow">Template Preview</span>
          <h3>詳細プレビュー</h3>
        </div>
        <p className="muted">
          一覧からテンプレートを選ぶと、Port 要約、評価結果、ArtifactVersion の概要を確認できます。
        </p>
      </aside>
    )
  }

  const { metadata } = template

  return (
    <aside className="template-preview-panel" aria-label="テンプレート詳細プレビュー">
      <div className="panel-heading compact">
        <span className="eyebrow">Template Preview</span>
        <h3>{template.name}</h3>
      </div>

      <div className="template-preview-actions">
        <button type="button" className="primary-button" onClick={() => onRequestLoad(template.id)}>
          このテンプレートを読み込む
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onDuplicateTemplate(template.id)}
        >
          複製
        </button>
      </div>

      {template.description ? <p className="template-description">{template.description}</p> : null}

      <div className="template-meta-pills">
        <span className="template-pill">{metadata.category ?? 'カテゴリ未設定'}</span>
        <span className="template-pill">ノード {metadata.nodeCount}</span>
        <span className="template-pill">接続 {metadata.connectionCount}</span>
        <span className="template-pill">未接続必須 {metadata.unconnectedRequiredPortCount}</span>
      </div>

      {metadata.tags.length > 0 ? (
        <div className="template-tag-list" aria-label="テンプレートタグ">
          {metadata.tags.map((tag) => (
            <span key={tag} className="template-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <p className="muted">タグはまだ設定されていません。</p>
      )}

      <dl className="template-detail-list">
        <div>
          <dt>Source workflow</dt>
          <dd>{metadata.sourceWorkflowId ?? template.sourceWorkflowId}</dd>
        </div>
        <div>
          <dt>Source run</dt>
          <dd>{metadata.sourceRunId ?? metadata.createdFromRunId ?? '譛ｪ險倬鹸'}</dd>
        </div>
        <div>
          <dt>作成日時</dt>
          <dd>{formatDate(template.createdAt)}</dd>
        </div>
        <div>
          <dt>更新日時</dt>
          <dd>{formatDate(template.updatedAt)}</dd>
        </div>
        <div>
          <dt>Port 要約</dt>
          <dd>
            必須 {metadata.requiredPortCount} / 未接続必須 {metadata.unconnectedRequiredPortCount}
          </dd>
        </div>
        <div>
          <dt>評価要約</dt>
          <dd>
            {formatEvaluationStatus(metadata.lastEvaluationStatus)}
            {typeof metadata.lastEvaluationScore === 'number'
              ? ` (${metadata.lastEvaluationScore}点)`
              : ''}
          </dd>
        </div>
        <div>
          <dt>ArtifactVersion</dt>
          <dd>{metadata.artifactVersionCount ?? 0} 件</dd>
        </div>
        <div>
          <dt>作成元 Run</dt>
          <dd>{metadata.createdFromRunId ?? '未記録'}</dd>
        </div>
        <div>
          <dt>Metrics summary</dt>
          <dd>
            {metadata.metricsSummary
              ? `${metadata.metricsSummary.tokens} tokens / $${metadata.metricsSummary.cost.toFixed(3)} / ${metadata.metricsSummary.latencyMs} ms`
              : '譛ｪ險倬鹸'}
          </dd>
        </div>
        <div>
          <dt>Artifact summary</dt>
          <dd>
            {metadata.artifactSummary
              ? `${metadata.artifactSummary.title} / ${metadata.artifactSummary.format} / ${metadata.artifactSummary.status}`
              : '譛ｪ險倬鹸'}
          </dd>
        </div>
      </dl>

      <section className="template-preview-section">
        <h4>ノード一覧</h4>
        <div className="template-preview-list">
          {template.snapshot.nodes.map((node) => (
            <div key={node.id} className="template-preview-row">
              <strong>{node.title}</strong>
              <span>
                {node.category} / {formatNodePorts(node)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="template-preview-section">
        <h4>接続一覧</h4>
        <div className="template-preview-list">
          {template.snapshot.connections.map((connection) => (
            <div key={connection.id} className="template-preview-row">
              <strong>
                {formatConnectionLabel(
                  nodeById,
                  connection.sourceNodeId,
                  connection.targetNodeId,
                )}
              </strong>
              <span>
                {connectionKindLabels[connection.kind]} /{' '}
                {connection.carries.map((dataType) => formatDataTypeLabel(dataType)).join(', ')}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="template-preview-section template-load-notice">
        <h4>読み込み前の注意</h4>
        <p>
          このテンプレートを読み込むと、現在の workflow は置き換わります。必要なら先に
          Workflow 履歴またはテンプレートとして保存してください。
        </p>

        {pendingLoad ? (
          <div className="template-confirm-box">
            <p>現在の workflow を上書きして、このテンプレートを読み込みます。</p>
            <div className="template-confirm-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => onConfirmLoad(template.id)}
              >
                現在の workflow を置き換えて読み込む
              </button>
              <button type="button" className="icon-button" onClick={onCancelLoad}>
                キャンセル
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </aside>
  )
}
