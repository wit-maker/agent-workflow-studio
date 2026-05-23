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
    <section className="library-panel" aria-label="Saved templates">
      <div className="library-heading">
        <h3>Templates</h3>
        <button type="button" className="primary-button" onClick={onSaveTemplate}>
          Save Template
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="muted">No templates saved in localStorage yet.</p>
      ) : (
        templates.map((template) => (
          <div key={template.id} className="library-row">
            <div>
              <strong>{template.name}</strong>
              <span>{new Date(template.updatedAt).toLocaleString()}</span>
            </div>
            <button type="button" className="icon-button" onClick={() => onLoadTemplate(template.id)}>
              Load
            </button>
            <button type="button" className="icon-button" onClick={() => onDeleteTemplate(template.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </section>
  )
}
