import { useUiStore } from '../../store/uiStore';
import { useSceneStore } from '../../store/sceneStore';
import { TEMPLATES } from '../../templates';

export default function Gallery() {
  const setMode = useUiStore((state) => state.setMode);
  const applyTemplate = useSceneStore((state) => state.applyTemplate);

  return (
    <div className="gallery-shell">
      <div className="gallery-inner">
        <div className="gallery-header">
          <div className="section-eyebrow">Launch Pad</div>
          <h1 style={{ fontSize: 44, lineHeight: 0.96, maxWidth: 720, marginBottom: 12 }}>
            Build polished device renders in a darker, more cinematic workspace.
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 620 }}>
            Start from a scene preset, then refine the camera, environment, and model choices inside the studio.
          </p>
        </div>

        <div className="gallery-grid">
          {TEMPLATES.map((template) => (
            <button
              className="template-card"
              key={template.id}
              onClick={() => {
                applyTemplate(template);
                setMode('studio');
              }}
            >
              <div className="template-card__eyebrow">Scene Template</div>
              <div className="template-card__title">{template.name}</div>
              <div className="template-card__description">{template.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
