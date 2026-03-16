import { useUiStore } from '../../store/uiStore';
import { useSceneStore } from '../../store/sceneStore';
import { lazy, startTransition, Suspense, useEffect, useRef, useState } from 'react';
import { DEFAULT_TEMPLATE } from '../../templates/hero-iphone';
import { TEMPLATES } from '../../templates';
import { downloadBlob } from '../../lib/downloads';
import { parseProjectFile, prepareSceneForProject } from '../../lib/sceneUtils';
import type { ViewportCommand } from '../../three/SceneRenderer';
import WorkspaceTopBar from '../editor/WorkspaceTopBar';

const Viewport = lazy(() => import('./Viewport'));
import ControlPanel from './ControlPanel';
import type { ViewportCommandInput } from './Viewport';

export default function Studio() {
  const setMode = useUiStore((state) => state.setMode);
  const showGrid = useUiStore((state) => state.showGrid);
  const toggleShowGrid = useUiStore((state) => state.toggleShowGrid);
  const scene = useSceneStore((state) => state.scene);
  const applyTemplate = useSceneStore((state) => state.applyTemplate);
  const loadProject = useSceneStore((state) => state.loadProject);
  const resetToTemplate = useSceneStore((state) => state.resetToTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewportCommand, setViewportCommand] = useState<ViewportCommand | null>(null);
  const currentTemplate = scene
    ? TEMPLATES.find((template) => template.id === scene.templateId)
    : null;

  useEffect(() => {
    if (!scene) {
      applyTemplate(DEFAULT_TEMPLATE);
    }
  }, [scene, applyTemplate]);

  const handleSaveProject = () => {
    if (!scene) return;

    const project = prepareSceneForProject(scene);
    const removedCustomModels = scene.devices.some(
      (device) => !!device.customModelUrl && device.customModelUrl.startsWith('blob:'),
    );

    downloadBlob(
      JSON.stringify(project, null, 2),
      'application/json',
      `${scene.templateId}-project.3dstudio`,
    );

    setNotice(
      removedCustomModels
        ? 'Saved project without session-only GLTF blobs. Re-import custom models after reopening.'
        : 'Project saved.',
    );
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (typeof event.target?.result !== 'string') {
            throw new Error('Unsupported file payload.');
          }

          const project = parseProjectFile(event.target.result);

          startTransition(() => {
            loadProject(project.scene);
            setNotice('Project loaded.');
          });
        } catch (error) {
          console.error('Failed to parse project file', error);
          setNotice(error instanceof Error ? error.message : 'Failed to parse project file.');
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        title={currentTemplate?.name ?? 'Custom scene'}
        subtitle="Studio"
        currentMode="studio"
        onModeChange={setMode}
        showGrid={showGrid}
        issueCommand={issueViewportCommand}
        toggleGrid={toggleShowGrid}
        rightSlot={
          <>
            <button className="toolbar-button" onClick={() => fileInputRef.current?.click()}>
              Open
            </button>
            <button className="toolbar-button" onClick={handleSaveProject}>
              Save
            </button>
            <button className="toolbar-button" onClick={resetToTemplate} disabled={!scene}>
              Reset
            </button>
          </>
        }
      />

      <input
        type="file"
        ref={fileInputRef}
        hidden
        accept=".3dstudio,.json"
        onChange={handleLoadProject}
      />

      <div className="workspace-main">
        <div className="editor-canvas-shell">
          {scene ? (
            <Suspense fallback={<div style={{ padding: 40 }}>Loading 3D Engine...</div>}>
              <Viewport
                showGrid={showGrid}
                viewportCommand={viewportCommand}
                issueCommand={issueViewportCommand}
                toggleGrid={toggleShowGrid}
              />
            </Suspense>
          ) : (
            <div style={{ padding: 40 }}>Loading Scene...</div>
          )}
        </div>

        <aside className="inspector-rail panel">
          <div className="inspector-rail__header">
            <div>
              <div className="section-eyebrow">Inspector</div>
              <div className="editor-card__title">Scene Controls</div>
            </div>
            {notice ? <div className="status-pill">{notice}</div> : null}
          </div>
          {scene ? <ControlPanel showGrid={showGrid} /> : null}
        </aside>
      </div>
    </div>
  );
}
