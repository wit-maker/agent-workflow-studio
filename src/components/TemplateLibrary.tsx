import { useEffect, useMemo, useRef, useState } from 'react'
import { evaluationStatusLabels } from '../domain/displayLabels'
import type { SavedWorkflowTemplate } from '../storage/localTemplates'
import { TemplatePreview } from './TemplatePreview'

type TemplateLibraryProps = {
  templates: SavedWorkflowTemplate[]
  currentWorkflowName: string
  currentWorkflowDescription: string
  onSaveTemplate: (input: {
    name: string
    description: string
    tags: string[]
    category?: string
  }) => SavedWorkflowTemplate
  onLoadTemplate: (id: string) => void
  onDuplicateTemplate: (id: string) => SavedWorkflowTemplate | null
  onDeleteTemplate: (id: string) => void
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function formatEvaluationStatus(status?: string): string {
  if (!status) {
    return '未評価'
  }

  return evaluationStatusLabels[status as keyof typeof evaluationStatusLabels] ?? status
}

export function TemplateLibrary({
  templates,
  currentWorkflowName,
  currentWorkflowDescription,
  onSaveTemplate,
  onLoadTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
}: TemplateLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [nameInput, setNameInput] = useState(currentWorkflowName)
  const [descriptionInput, setDescriptionInput] = useState(currentWorkflowDescription)
  const [tagsInput, setTagsInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const previousWorkflowNameRef = useRef(currentWorkflowName)
  const previousWorkflowDescriptionRef = useRef(currentWorkflowDescription)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templates[0]?.id ?? null,
  )
  const [pendingLoadTemplateId, setPendingLoadTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (nameInput === previousWorkflowNameRef.current) {
      setNameInput(currentWorkflowName)
    }
    previousWorkflowNameRef.current = currentWorkflowName
  }, [currentWorkflowName, nameInput])

  useEffect(() => {
    if (descriptionInput === previousWorkflowDescriptionRef.current) {
      setDescriptionInput(currentWorkflowDescription)
    }
    previousWorkflowDescriptionRef.current = currentWorkflowDescription
  }, [currentWorkflowDescription, descriptionInput])

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('ja-JP')

    if (!normalizedSearch) {
      return templates
    }

    return templates.filter((template) => {
      const haystack = [
        template.name,
        template.description ?? '',
        template.metadata.category ?? '',
        template.metadata.tags.join(' '),
      ]
        .join(' ')
        .toLocaleLowerCase('ja-JP')

      return haystack.includes(normalizedSearch)
    })
  }, [searchTerm, templates])

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ??
    templates.find((template) => template.id === selectedTemplateId) ??
    filteredTemplates[0] ??
    templates[0] ??
    null

  function handleSave() {
    const savedTemplate = onSaveTemplate({
      name: nameInput.trim() || currentWorkflowName,
      description: descriptionInput.trim(),
      tags: parseTags(tagsInput),
      category: categoryInput.trim() || undefined,
    })

    setSelectedTemplateId(savedTemplate.id)
    setPendingLoadTemplateId(null)
    setNameInput(currentWorkflowName)
    setDescriptionInput(currentWorkflowDescription)
    setTagsInput('')
    setCategoryInput('')
  }

  function handleRequestLoad(id: string) {
    setSelectedTemplateId(id)
    setPendingLoadTemplateId(id)
  }

  function handleConfirmLoad(id: string) {
    setPendingLoadTemplateId(null)
    onLoadTemplate(id)
  }

  function handleDuplicate(id: string) {
    const duplicatedTemplate = onDuplicateTemplate(id)
    if (duplicatedTemplate) {
      setSelectedTemplateId(duplicatedTemplate.id)
      setPendingLoadTemplateId(null)
    }
  }

  function handleDelete(id: string) {
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null)
    }
    if (pendingLoadTemplateId === id) {
      setPendingLoadTemplateId(null)
    }
    onDeleteTemplate(id)
  }

  return (
    <section className="library-panel template-library-panel" aria-label="保存済みテンプレート">
      <div className="library-heading">
        <h3>テンプレート一覧</h3>
        <span className="muted">{templates.length} 件</span>
      </div>

      <div className="template-save-form">
        <label className="field-label">
          テンプレート名
          <input
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="例: 評価付きレビュー導線"
          />
        </label>
        <label className="field-label">
          説明
          <textarea
            value={descriptionInput}
            onChange={(event) => setDescriptionInput(event.target.value)}
            rows={3}
            placeholder="再利用時に判断しやすい説明を残します"
          />
        </label>
        <div className="template-form-grid">
          <label className="field-label">
            タグ
            <input
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="review, local, phase6"
            />
          </label>
          <label className="field-label">
            カテゴリ
            <input
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              placeholder="レビュー"
            />
          </label>
        </div>
        <button type="button" className="primary-button" onClick={handleSave}>
          テンプレート保存
        </button>
      </div>

      <div className="template-library-layout">
        <div className="template-library-list-pane">
          <input
            className="search-input"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="名前、説明、タグ、カテゴリで検索"
            aria-label="テンプレート検索"
          />

          {filteredTemplates.length === 0 ? (
            <p className="muted">
              {templates.length === 0
                ? 'localStorage に保存されたテンプレートはまだありません。'
                : '条件に合うテンプレートが見つかりませんでした。'}
            </p>
          ) : (
            filteredTemplates.map((template) => (
              <article
                key={template.id}
                className={`template-card ${
                  selectedTemplateId === template.id ? 'template-card-selected' : ''
                }`}
              >
                <div className="template-card-header">
                  <div>
                    <strong>{template.name}</strong>
                    <span>
                      更新: {new Date(template.updatedAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <div className="template-card-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      プレビュー
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleRequestLoad(template.id)}
                    >
                      読み込み
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDuplicate(template.id)}
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(template.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>

                {template.description ? (
                  <p className="template-card-description">{template.description}</p>
                ) : null}

                <div className="template-meta-pills">
                  <span className="template-pill">
                    {template.metadata.category ?? 'カテゴリ未設定'}
                  </span>
                  <span className="template-pill">ノード {template.metadata.nodeCount}</span>
                  <span className="template-pill">接続 {template.metadata.connectionCount}</span>
                  <span className="template-pill">
                    未接続必須 {template.metadata.unconnectedRequiredPortCount}
                  </span>
                  <span className="template-pill">
                    評価 {formatEvaluationStatus(template.metadata.lastEvaluationStatus)}
                  </span>
                  <span className="template-pill">
                    スコア{' '}
                    {typeof template.metadata.lastEvaluationScore === 'number'
                      ? `${template.metadata.lastEvaluationScore}点`
                      : '未記録'}
                  </span>
                  <span className="template-pill">
                    ArtifactVersion {template.metadata.artifactVersionCount ?? 0}
                  </span>
                </div>

                {template.metadata.tags.length > 0 ? (
                  <div className="template-tag-list">
                    {template.metadata.tags.map((tag) => (
                      <span key={tag} className="template-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <TemplatePreview
          template={selectedTemplate}
          pendingLoad={pendingLoadTemplateId === selectedTemplate?.id}
          onRequestLoad={handleRequestLoad}
          onConfirmLoad={handleConfirmLoad}
          onCancelLoad={() => setPendingLoadTemplateId(null)}
          onDuplicateTemplate={handleDuplicate}
        />
      </div>
    </section>
  )
}
