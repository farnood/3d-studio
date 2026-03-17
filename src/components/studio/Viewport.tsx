import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useSceneStore } from '../../store/sceneStore';
import SceneRenderer, {
  type ViewportCommand,
  type ViewPreset,
} from '../../three/SceneRenderer';
import { getBackgroundCss, getCameraPosition } from '../../lib/sceneUtils';

export type ViewportCommandInput =
  | { type: 'frame' }
  | { type: 'reset' }
  | { type: 'view'; preset: ViewPreset };

type ViewportProps = {
  showGrid: boolean;
  showGizmo?: boolean;
  allowNavigation?: boolean;
  viewportCommand: ViewportCommand | null;
  issueCommand: (command: ViewportCommandInput) => void;
  toggleGrid: () => void;
  previewInteraction?: boolean;
  allowCapture?: boolean;
};

export default function Viewport({
  showGrid,
  showGizmo = true,
  allowNavigation = true,
  viewportCommand,
  issueCommand,
  toggleGrid,
  previewInteraction = false,
  allowCapture = false,
}: ViewportProps) {
  const scene = useSceneStore((state) => state.scene);
  const viewportRef = useRef<HTMLDivElement>(null);

  if (!scene) return null;

  const cameraPosition = getCameraPosition(scene.camera);

  return (
    <div
      ref={viewportRef}
      tabIndex={0}
      onPointerDown={() => viewportRef.current?.focus()}
      onKeyDown={(event) => {
        if (!allowNavigation) {
          return;
        }

        if (event.altKey || event.ctrlKey || event.metaKey) {
          return;
        }

        if (event.key === '1') {
          issueCommand({ type: 'view', preset: event.shiftKey ? 'back' : 'front' });
          event.preventDefault();
          return;
        }

        if (event.key === '3') {
          issueCommand({ type: 'view', preset: event.shiftKey ? 'left' : 'right' });
          event.preventDefault();
          return;
        }

        if (event.key === '7') {
          issueCommand({ type: 'view', preset: event.shiftKey ? 'bottom' : 'top' });
          event.preventDefault();
          return;
        }

        if (event.key === '0') {
          issueCommand({ type: 'view', preset: 'iso' });
          event.preventDefault();
          return;
        }

        if (event.key.toLowerCase() === 'f') {
          issueCommand({ type: 'frame' });
          event.preventDefault();
          return;
        }

        if (event.key.toLowerCase() === 'g') {
          toggleGrid();
          event.preventDefault();
          return;
        }

        if (event.key.toLowerCase() === 'r') {
          issueCommand({ type: 'reset' });
          event.preventDefault();
        }
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: getBackgroundCss(scene.environment.background),
        outline: 'none',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: allowCapture }}
      >
        <PerspectiveCamera makeDefault position={cameraPosition} fov={scene.camera.fov} />
        <SceneRenderer
          scene={scene}
          viewportCommand={viewportCommand}
          showGrid={showGrid}
          showGizmo={showGizmo}
          allowNavigation={allowNavigation}
          viewerEffectsEnabled={previewInteraction}
        />
      </Canvas>
    </div>
  );
}
