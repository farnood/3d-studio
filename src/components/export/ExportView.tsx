import { lazy, Suspense, useRef, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useSceneStore } from '../../store/sceneStore';
import { generateExportHtml } from '../../lib/exportBundler';
import { downloadBlob } from '../../lib/downloads';
import { downloadScenePng } from '../../lib/pngExport';
import type { ViewportCommand } from '../../three/SceneRenderer';
import WorkspaceTopBar from '../editor/WorkspaceTopBar';
import InteractionControls from '../studio/InteractionControls';

const Viewport = lazy(() => import('../studio/Viewport'));
import type { ViewportCommandInput } from '../studio/Viewport';

export default function ExportView() {
  const setMode = useUiStore((state) => state.setMode);
  const showGrid = useUiStore((state) => state.showGrid);
  const toggleShowGrid = useUiStore((state) => state.toggleShowGrid);
  const scene = useSceneStore((state) => state.scene);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isPreparingCleanCapture, setIsPreparingCleanCapture] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewportCommand, setViewportCommand] = useState<ViewportCommand | null>(null);

  const waitForPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

  const handleExportHtml = async () => {
    if (!scene) return;

    try {
      setIsExportingHtml(true);
      setNotice(null);

      downloadBlob(
        await generateExportHtml(scene),
        'text/html',
        `3d-studio-export-${Date.now()}.html`,
      );

      setNotice('Exported HTML with inlined assets.');
    } catch (error) {
      console.error('Failed to export HTML', error);
      setNotice(
        error instanceof Error ? error.message : 'Failed to export HTML.',
      );
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleExportPng = async () => {
    if (!scene) return;

    const canvas = previewRef.current?.querySelector('canvas');

    if (!(canvas instanceof HTMLCanvasElement)) {
      setNotice('Preview not ready yet. Wait for the canvas to finish loading.');
      return;
    }

    try {
      setIsExportingPng(true);
      setNotice(null);
      setIsPreparingCleanCapture(true);
      await waitForPaint();

      await downloadScenePng(
        canvas,
        scene.environment.background,
        `3d-studio-export-${Date.now()}.png`,
      );

      setNotice('Exported PNG from the current preview.');
    } catch (error) {
      console.error('Failed to export PNG', error);
      setNotice(
        error instanceof Error ? error.message : 'Failed to export PNG.',
      );
    } finally {
      setIsPreparingCleanCapture(false);
      setIsExportingPng(false);
    }
  };

  const issueViewportCommand = (command: ViewportCommandInput) => {
    setViewportCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      ...command,
    }));
  };

  return (
    <div className="editor-shell">
      <WorkspaceTopBar
        title="Preview & Export"
        subtitle="Export"
        currentMode="export"
        onModeChange={setMode}
        showViewControls={false}
        showGrid={showGrid}
        issueCommand={issueViewportCommand}
        toggleGrid={toggleShowGrid}
        rightSlot={
          <>
            <button
              className="toolbar-button"
              onClick={handleExportPng}
              disabled={!scene || isExportingPng}
            >
              {isExportingPng ? 'Rendering PNG...' : 'Download PNG'}
            </button>
            <button
              className="toolbar-button toolbar-button--primary"
              onClick={handleExportHtml}
              disabled={!scene || isExportingHtml}
            >
              {isExportingHtml ? 'Bundling...' : 'Download HTML'}
            </button>
          </>
        }
      />

      <div className="workspace-main">
        <div className="editor-canvas-shell" ref={previewRef}>
          {scene ? (
            <Suspense fallback={<div style={{ padding: 40 }}>Loading Preview...</div>}>
              <Viewport
                showGrid={isPreparingCleanCapture ? false : showGrid}
                showGizmo={!isPreparingCleanCapture}
                allowNavigation={false}
                viewportCommand={viewportCommand}
                issueCommand={issueViewportCommand}
                toggleGrid={toggleShowGrid}
                previewInteraction
                allowCapture
              />
            </Suspense>
          ) : (
            <div style={{ padding: 40 }}>Loading Preview...</div>
          )}
        </div>

        <aside className="inspector-rail panel">
          <div className="inspector-rail__header">
            <div>
              <div className="section-eyebrow">Output</div>
              <div className="editor-card__title">Bundle Details</div>
            </div>
            {notice ? <div className="status-pill">{notice}</div> : null}
          </div>

          <div className="control-panel-stack">
            {scene ? (
              <div className="inspector-section">
                <h5 className="section-eyebrow">Viewport</h5>
                <div className="meta-strip">
                  <span className="meta-chip">Tpl {scene.templateId}</span>
                  <span className="meta-chip">Dist {scene.camera.distance.toFixed(1)}</span>
                  <span className="meta-chip">Dev {scene.devices.length}</span>
                  <span className="meta-chip">Grid {showGrid ? 'On' : 'Off'}</span>
                </div>
              </div>
            ) : null}

            <InteractionControls description="These settings are applied to the exported HTML viewer. This preview lets you test them without overwriting the authored studio camera." />

            <div className="inspector-section">
              <h5 className="section-eyebrow">PNG Snapshot</h5>
              <p className="section-description" style={{ marginBottom: 0 }}>
                Exports the current preview as a PNG, including the scene background and the current camera framing.
              </p>
            </div>

            <div className="inspector-section">
              <h5 className="section-eyebrow">Interactive HTML Bundle</h5>
              <p className="section-description" style={{ marginBottom: 0 }}>
                Exports the current scene as a single HTML file with inlined assets and no React dependency.
              </p>
            </div>

            <div className="inspector-section note-card">
              <h5 className="section-eyebrow">Export Notes</h5>
              Compose and frame the scene in Studio. Export preview starts from that authored camera, but its viewer interactions stay local and do not overwrite the studio framing.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
