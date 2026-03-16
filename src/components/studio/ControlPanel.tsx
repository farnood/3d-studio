import { useSceneStore } from '../../store/sceneStore';
import ScreenDropZone from './ScreenDropZone';
import DeviceControls from './DeviceControls';
import InteractionControls from './InteractionControls';
import { normalizeBackground } from '../../lib/sceneUtils';

export default function ControlPanel({ showGrid }: { showGrid: boolean }) {
  const scene = useSceneStore((state) => state.scene);
  const updateEnvironment = useSceneStore((state) => state.updateEnvironment);
  const updateCamera = useSceneStore((state) => state.updateCamera);
  if (!scene) return null;

  const background = normalizeBackground(scene.environment.background);

  return (
    <div className="control-panel-stack">
      <section className="inspector-section">
        <h5 className="section-eyebrow">Viewport</h5>
        <div className="meta-strip">
          <span className="meta-chip">Dist {scene.camera.distance.toFixed(1)}</span>
          <span className="meta-chip">Az {scene.camera.azimuth.toFixed(0)} deg</span>
          <span className="meta-chip">El {scene.camera.elevation.toFixed(0)} deg</span>
          <span className="meta-chip">Grid {showGrid ? 'On' : 'Off'}</span>
        </div>
        <p className="shortcut-strip">
          <span>F Frame</span>
          <span>0 Iso</span>
          <span>1 3 7 Views</span>
          <span>G Grid</span>
        </p>
      </section>

      <section className="inspector-section">
        <h5 className="section-eyebrow">Screen Image</h5>
        <ScreenDropZone />
      </section>

      <DeviceControls />

      <section className="inspector-section">
        <h5 className="section-eyebrow">Environment</h5>
        
        <div className="control-stack">
          <label className="field field--row">
            Background Style
            <select
              value={background.mode}
              onChange={(e) =>
                updateEnvironment({
                  background: normalizeBackground({
                    ...background,
                    mode: e.target.value as 'solid' | 'gradient',
                  }),
                })
              }
            >
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
            </select>
          </label>

          <label className="field field--row">
            Background Color
            <input 
              type="color" 
              value={background.color}
              onChange={(e) => updateEnvironment({ 
                background: { ...background, color: e.target.value } 
              })}
            />
          </label>

          {background.mode === 'gradient' ? (
            <>
              <label className="field field--row">
                Gradient To
                <input
                  type="color"
                  value={background.gradientTo}
                  onChange={(e) =>
                    updateEnvironment({
                      background: { ...background, gradientTo: e.target.value },
                    })
                  }
                />
              </label>

              <label className="field">
                Gradient Angle ({background.gradientAngle}deg)
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={background.gradientAngle}
                  onChange={(e) =>
                    updateEnvironment({
                      background: { ...background, gradientAngle: parseFloat(e.target.value) },
                    })
                  }
                />
              </label>
            </>
          ) : null}

          <label className="field">
            Shadow Intensity ({scene.environment.shadow.intensity.toFixed(2)})
            <input 
              type="range" 
              min="0" max="1" step="0.05"
              value={scene.environment.shadow.intensity}
              onChange={(e) => updateEnvironment({ 
                shadow: { ...scene.environment.shadow, intensity: parseFloat(e.target.value) } 
              })}
            />
          </label>
          
          <label className="field">
            Mood (Cool to Warm) ({scene.environment.lighting.mood.toFixed(1)})
            <input 
              type="range" 
              min="-1" max="1" step="0.1"
              value={scene.environment.lighting.mood}
              onChange={(e) => updateEnvironment({ 
                lighting: { ...scene.environment.lighting, mood: parseFloat(e.target.value) } 
              })}
            />
          </label>

          <label className="field">
            Ambient Brightness ({scene.environment.lighting.ambientIntensity.toFixed(1)})
            <input 
              type="range" 
              min="0" max="2" step="0.1"
              value={scene.environment.lighting.ambientIntensity}
              onChange={(e) => updateEnvironment({ 
                lighting: { ...scene.environment.lighting, ambientIntensity: parseFloat(e.target.value) } 
              })}
            />
          </label>
        </div>
      </section>

      <section className="inspector-section">
        <h5 className="section-eyebrow">Camera</h5>
        <p className="section-description">
          Drag directly in the viewport to orbit, pan, zoom, frame, and snap views. These fields store the current camera.
        </p>
        
        <div className="control-stack">
          <label className="field">
            Distance ({scene.camera.distance.toFixed(1)})
            <input 
              type="range" 
              min="0.75" max="20" step="0.05"
              value={scene.camera.distance}
              onChange={(e) => updateCamera({ distance: parseFloat(e.target.value) })}
            />
          </label>

          <label className="field">
            Elevation ({scene.camera.elevation.toFixed(0)}deg)
            <input 
              type="range" 
              min="-89" max="89" step="1"
              value={scene.camera.elevation}
              onChange={(e) => updateCamera({ elevation: parseFloat(e.target.value) })}
            />
          </label>

          <label className="field">
            Azimuth ({scene.camera.azimuth.toFixed(0)}deg)
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={scene.camera.azimuth}
              onChange={(e) => updateCamera({ azimuth: parseFloat(e.target.value) })}
            />
          </label>

          <label className="field">
            Field of View ({scene.camera.fov.toFixed(0)}deg)
            <input
              type="range"
              min="15"
              max="85"
              step="1"
              value={scene.camera.fov}
              onChange={(e) => updateCamera({ fov: parseFloat(e.target.value) })}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {(['X', 'Y', 'Z'] as const).map((axis, index) => (
              <label key={axis} className="field" style={{ fontSize: 12 }}>
                Target {axis}
                <input
                  type="number"
                  step="0.1"
                  value={scene.camera.target[index].toFixed(2)}
                  onChange={(e) => {
                    const nextValue = parseFloat(e.target.value);

                    if (Number.isNaN(nextValue)) {
                      return;
                    }

                    const nextTarget = [...scene.camera.target] as [number, number, number];
                    nextTarget[index] = nextValue;
                    updateCamera({ target: nextTarget });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <InteractionControls description="These settings affect the exported or embedded viewer. The studio viewport keeps full editor navigation enabled." />
    </div>
  );
}
