import { useSceneStore } from '../../store/sceneStore';

type InteractionControlsProps = {
  description?: string;
};

export default function InteractionControls({
  description,
}: InteractionControlsProps) {
  const scene = useSceneStore((state) => state.scene);
  const updateInteraction = useSceneStore((state) => state.updateInteraction);

  if (!scene) return null;

  return (
    <section className="inspector-section">
      <h5 className="section-eyebrow">Interaction</h5>
      {description ? <p className="section-description">{description}</p> : null}

      <div className="control-stack">
        <label className="field field--row">
          Allow Rotate
          <input
            type="checkbox"
            checked={scene.interaction.orbitEnabled}
            onChange={(e) => updateInteraction({ orbitEnabled: e.target.checked })}
          />
        </label>

        <label className="field field--row">
          Allow Pan
          <input
            type="checkbox"
            checked={scene.interaction.panEnabled}
            onChange={(e) => updateInteraction({ panEnabled: e.target.checked })}
          />
        </label>

        <label className="field field--row">
          Allow Zoom
          <input
            type="checkbox"
            checked={scene.interaction.zoomEnabled}
            onChange={(e) => updateInteraction({ zoomEnabled: e.target.checked })}
          />
        </label>

        <label className="field">
          Orbit Range ({scene.interaction.orbitRange.toFixed(0)}deg)
          <input
            type="range"
            min="0"
            max="120"
            step="5"
            value={scene.interaction.orbitRange}
            onChange={(e) => updateInteraction({ orbitRange: parseFloat(e.target.value) })}
            disabled={!scene.interaction.orbitEnabled}
          />
        </label>

        <label className="field field--row">
          Auto Rotate
          <input
            type="checkbox"
            checked={scene.interaction.autoRotate}
            onChange={(e) => updateInteraction({ autoRotate: e.target.checked })}
          />
        </label>

        <label className="field">
          Auto Rotate Speed ({scene.interaction.autoRotateSpeed.toFixed(1)})
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={scene.interaction.autoRotateSpeed}
            onChange={(e) => updateInteraction({ autoRotateSpeed: parseFloat(e.target.value) })}
            disabled={!scene.interaction.autoRotate}
          />
        </label>

        <label className="field field--row">
          Hover Parallax
          <input
            type="checkbox"
            checked={scene.interaction.hoverParallax}
            onChange={(e) => updateInteraction({ hoverParallax: e.target.checked })}
          />
        </label>

        <label className="field">
          Parallax Intensity ({scene.interaction.hoverParallaxIntensity.toFixed(2)})
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={scene.interaction.hoverParallaxIntensity}
            onChange={(e) =>
              updateInteraction({ hoverParallaxIntensity: parseFloat(e.target.value) })
            }
            disabled={!scene.interaction.hoverParallax}
          />
        </label>

        <label className="field field--row">
          Cursor Gravitation
          <input
            type="checkbox"
            checked={scene.interaction.cursorAttraction}
            onChange={(e) => updateInteraction({ cursorAttraction: e.target.checked })}
          />
        </label>

        <label className="field">
          Gravitation Strength ({scene.interaction.cursorAttractionIntensity.toFixed(2)})
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={scene.interaction.cursorAttractionIntensity}
            onChange={(e) =>
              updateInteraction({ cursorAttractionIntensity: parseFloat(e.target.value) })
            }
            disabled={!scene.interaction.cursorAttraction}
          />
        </label>
      </div>
    </section>
  );
}
