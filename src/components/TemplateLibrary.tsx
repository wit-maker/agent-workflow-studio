import type { SavedWorkflowTemplate } from '../storage/localTemplates'

type TemplateLibraryProps = {
  templates: SavedWorkflowTemplate[]
  onSaveTemplate: () => void
  onLoadTemplate: (id: string) => void
  onDeleteTemplate: (id: string) => void
}

export function TemplateLibrary({
  templates,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
}: TemplateLibraryProps) {
  return (
    <section className="library-panel" aria-label="保存済みテンプレート">
      <div className="library-heading">
        <h3>テンプレート一覧</h3>
        <button type="button" className="primary-button" onClick={onSaveTemplate}>
          テンプレート保存
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="muted">localStorage に保存されたテンプレートはまだありません。</p>
      ) : (
        templates.map((template) => (
          <div key={template.id} className="library-row">
            <div>
              <strong>{template.name}</strong>
              <span>{new Date(template.updatedAt).toLocaleString()}</span>
            </div>
            <button type="button" className="icon-button" onClick={() => onLoadTemplate(template.id)}>
              読込
            </button>
            <button type="button" className="icon-button" onClick={() => onDeleteTemplate(template.id)}>
              削除
            </button>
          </div>
        ))
      )}
    </section>
  )
}
