import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  GizmoHelper,
  GizmoViewport,
  Grid,
  OrbitControls,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { SceneDescriptor } from '../types';
import { useSceneStore } from '../store/sceneStore';
import { useUiStore } from '../store/uiStore';
import DeviceModelLoader from './DeviceModelLoader';
import { getCameraPosition, getCameraStateFromPosition } from '../lib/sceneUtils';

export type ViewPreset =
  | 'iso'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

export type ViewportCommand =
  | { id: number; type: 'frame' }
  | { id: number; type: 'reset' }
  | { id: number; type: 'view'; preset: ViewPreset };

function getMoodColors(mood: number) {
  if (mood > 0) {
    return {
      key: '#fff4e5',
      fill: '#fce7c7',
    };
  }

  if (mood < 0) {
    return {
      key: '#e5f0ff',
      fill: '#dbeafe',
    };
  }

  return {
    key: '#ffffff',
    fill: '#f4f4f5',
  };
}

function getSceneFloorAnchor(devices: SceneDescriptor['devices']): [number, number, number] {
  if (!devices.length) {
    return [0, -1, 0];
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const device of devices) {
    minX = Math.min(minX, device.position[0]);
    maxX = Math.max(maxX, device.position[0]);
    minZ = Math.min(minZ, device.position[2]);
    maxZ = Math.max(maxZ, device.position[2]);
  }

  return [(minX + maxX) / 2, -1, (minZ + maxZ) / 2];
}

function getPresetAngles(preset: ViewPreset) {
  switch (preset) {
    case 'front':
      return { azimuth: 0, elevation: 0 };
    case 'back':
      return { azimuth: 180, elevation: 0 };
    case 'left':
      return { azimuth: -90, elevation: 0 };
    case 'right':
      return { azimuth: 90, elevation: 0 };
    case 'top':
      return { azimuth: 0, elevation: 89 };
    case 'bottom':
      return { azimuth: 0, elevation: -89 };
    case 'iso':
    default:
      return { azimuth: -35, elevation: 25 };
  }
}

function getFitDistance(fov: number, aspect: number, radius: number) {
  const verticalHalfFov = THREE.MathUtils.degToRad(fov / 2);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect);
  const limitingHalfFov = Math.max(0.1, Math.min(verticalHalfFov, horizontalHalfFov));

  return (radius / Math.sin(limitingHalfFov)) * 1.2;
}

export default function SceneRenderer({
  scene,
  viewportCommand,
  showGrid,
  showGizmo = true,
  allowNavigation = true,
  viewerEffectsEnabled = false,
}: {
  scene: SceneDescriptor;
  viewportCommand: ViewportCommand | null;
  showGrid: boolean;
  showGizmo?: boolean;
  allowNavigation?: boolean;
  viewerEffectsEnabled?: boolean;
}) {
  const { environment } = scene;
  const updateCamera = useSceneStore((state) => state.updateCamera);
  const baseScene = useSceneStore((state) => state.baseScene);
  const setBeforeModeChange = useUiStore((state) => state.setBeforeModeChange);
  const clearBeforeModeChange = useUiStore((state) => state.clearBeforeModeChange);
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera);
  const viewportSize = useThree((state) => state.size);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const contentRef = useRef<THREE.Group>(null);
  const syncFrameRef = useRef<number | null>(null);

  const moodColors = useMemo(
    () => getMoodColors(environment.lighting.mood),
    [environment.lighting.mood],
  );
  const shadowAnchor = useMemo(
    () => getSceneFloorAnchor(scene.devices),
    [scene.devices],
  );
  const viewerOrbitHalfRange =
    viewerEffectsEnabled && scene.interaction.orbitEnabled
      ? THREE.MathUtils.degToRad(scene.interaction.orbitRange / 2)
      : 0;
  const viewerBaseAzimuth = THREE.MathUtils.degToRad(scene.camera.azimuth);
  const panEnabled = allowNavigation || (viewerEffectsEnabled && scene.interaction.panEnabled);
  const zoomEnabled = allowNavigation || (viewerEffectsEnabled && scene.interaction.zoomEnabled);
  const rotateEnabled = allowNavigation || (viewerEffectsEnabled && scene.interaction.orbitEnabled);

  useFrame((state, delta) => {
    const content = contentRef.current;

    if (!content) {
      return;
    }

    const parallaxIntensity =
      viewerEffectsEnabled && scene.interaction.hoverParallax
        ? scene.interaction.hoverParallaxIntensity
        : 0;
    const attractionIntensity =
      viewerEffectsEnabled && scene.interaction.cursorAttraction
        ? scene.interaction.cursorAttractionIntensity
        : 0;
    const easing = 1 - Math.exp(-delta * 6);
    const targetOffsetX = state.pointer.x * parallaxIntensity * 0.16;
    const targetOffsetY = state.pointer.y * parallaxIntensity * 0.12;
    const targetRotationX = -state.pointer.y * attractionIntensity * 0.18;
    const targetRotationY = state.pointer.x * attractionIntensity * 0.24;

    content.position.x = THREE.MathUtils.lerp(content.position.x, targetOffsetX, easing);
    content.position.y = THREE.MathUtils.lerp(content.position.y, targetOffsetY, easing);
    content.rotation.x = THREE.MathUtils.lerp(content.rotation.x, targetRotationX, easing);
    content.rotation.y = THREE.MathUtils.lerp(content.rotation.y, targetRotationY, easing);
  });

  const syncCameraToStore = useCallback(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const nextCamera = getCameraStateFromPosition(
      [
        controls.object.position.x,
        controls.object.position.y,
        controls.object.position.z,
      ],
      [controls.target.x, controls.target.y, controls.target.z],
    );

    updateCamera({
      ...nextCamera,
      fov: camera.fov,
    });
  }, [camera.fov, updateCamera]);

  const flushPendingCameraSync = useCallback(() => {
    if (syncFrameRef.current !== null) {
      window.cancelAnimationFrame(syncFrameRef.current);
      syncFrameRef.current = null;
    }

    syncCameraToStore();
  }, [syncCameraToStore]);

  const scheduleCameraSync = useCallback(() => {
    if (syncFrameRef.current !== null) {
      return;
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = null;
      syncCameraToStore();
    });
  }, [syncCameraToStore]);

  useEffect(() => {
    if (!allowNavigation) {
      return;
    }

    setBeforeModeChange(flushPendingCameraSync);

    return () => {
      clearBeforeModeChange(flushPendingCameraSync);
    };
  }, [allowNavigation, clearBeforeModeChange, flushPendingCameraSync, setBeforeModeChange]);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const nextPosition = new THREE.Vector3(...getCameraPosition(scene.camera));
    const nextTarget = new THREE.Vector3(...scene.camera.target);
    const positionChanged =
      controls.object.position.distanceToSquared(nextPosition) > 0.000001;
    const targetChanged = controls.target.distanceToSquared(nextTarget) > 0.000001;

    if (!positionChanged && !targetChanged) {
      return;
    }

    controls.object.position.copy(nextPosition);
    controls.target.copy(nextTarget);
    controls.object.lookAt(nextTarget);
    controls.update();
  }, [scene.camera]);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!allowNavigation || !controls || !viewportCommand) {
      return;
    }

    if (viewportCommand.type === 'reset') {
      if (!baseScene) {
        return;
      }

      const nextPosition = new THREE.Vector3(...getCameraPosition(baseScene.camera));
      const nextTarget = new THREE.Vector3(...baseScene.camera.target);

      controls.object.position.copy(nextPosition);
      controls.target.copy(nextTarget);
      controls.object.lookAt(nextTarget);
      controls.update();
      updateCamera(baseScene.camera);
      return;
    }

    if (viewportCommand.type === 'view') {
      const { azimuth, elevation } = getPresetAngles(viewportCommand.preset);
      const nextTarget: SceneDescriptor['camera']['target'] = [
        controls.target.x,
        controls.target.y,
        controls.target.z,
      ];
      const nextPosition = new THREE.Vector3(
        ...getCameraPosition({
          distance: controls.object.position.distanceTo(controls.target),
          elevation,
          azimuth,
          fov: camera.fov,
          target: nextTarget,
        }),
      );

      controls.object.position.copy(nextPosition);
      controls.target.set(...nextTarget);
      controls.object.lookAt(controls.target);
      controls.update();
      syncCameraToStore();
      return;
    }

    const content = contentRef.current;

    if (!content) {
      return;
    }

    const bounds = new THREE.Box3().setFromObject(content);

    if (bounds.isEmpty()) {
      return;
    }

    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    const nextTarget = sphere.center;
    const direction = controls.object.position.clone().sub(controls.target);

    if (direction.lengthSq() < 0.000001) {
      direction.set(0.6, 0.45, 1);
    }

    direction.normalize().multiplyScalar(
      getFitDistance(
        camera.fov,
        viewportSize.width / viewportSize.height,
        Math.max(sphere.radius, 0.75),
      ),
    );

    controls.target.copy(nextTarget);
    controls.object.position.copy(nextTarget.clone().add(direction));
    controls.object.lookAt(nextTarget);
    controls.update();
    syncCameraToStore();
  }, [allowNavigation, baseScene, camera.fov, updateCamera, viewportCommand, viewportSize.height, viewportSize.width]);

  return (
    <Suspense fallback={null}>
      {environment.background.mode === 'solid' ? (
        <color attach="background" args={[environment.background.color]} />
      ) : null}

      <ambientLight intensity={environment.lighting.ambientIntensity} />

      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        color={moodColors.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <directionalLight position={[-5, 3, 5]} intensity={0.5} color={moodColors.fill} />

      <directionalLight position={[0, 4, -5]} intensity={0.4} />

      <Environment preset="city" environmentIntensity={environment.lighting.envMapIntensity} />

      {showGrid ? (
        <Grid
          position={[shadowAnchor[0], shadowAnchor[1] - 0.02, shadowAnchor[2]]}
          args={[18, 18]}
          cellSize={0.25}
          cellThickness={0.5}
          cellColor="#2a2f3a"
          sectionSize={1}
          sectionThickness={1.1}
          sectionColor="#465264"
          fadeDistance={32}
          fadeStrength={1}
          infiniteGrid
        />
      ) : null}

      <group ref={contentRef} position={[0, 0, 0]}>
        {scene.devices.map((device, index) => (
          <DeviceModelLoader key={`${device.deviceId}-${index}`} index={index} device={device} />
        ))}
      </group>

      <ContactShadows
        position={shadowAnchor}
        opacity={Math.min(1, environment.shadow.opacity * environment.shadow.intensity)}
        scale={10}
        blur={1 + environment.shadow.softness * 4}
        far={10}
        resolution={256}
        color="#000000"
      />

      {showGizmo ? (
        <GizmoHelper
          alignment="bottom-right"
          margin={[96, 96]}
          onTarget={() =>
            controlsRef.current?.target.clone() ?? new THREE.Vector3(...scene.camera.target)
          }
        >
          <GizmoViewport
            axisColors={['#fb7185', '#4ade80', '#60a5fa']}
            labelColor="#e4e4e7"
            axisScale={[0.9, 0.9, 0.9]}
          />
        </GizmoHelper>
      ) : null}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={panEnabled}
        enableZoom={zoomEnabled}
        screenSpacePanning
        minDistance={0.75}
        maxDistance={28}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI - 0.05}
        minAzimuthAngle={
          viewerEffectsEnabled ? viewerBaseAzimuth - viewerOrbitHalfRange : -Infinity
        }
        maxAzimuthAngle={
          viewerEffectsEnabled ? viewerBaseAzimuth + viewerOrbitHalfRange : Infinity
        }
        enableRotate={rotateEnabled}
        autoRotate={viewerEffectsEnabled && scene.interaction.autoRotate}
        autoRotateSpeed={scene.interaction.autoRotateSpeed}
        rotateSpeed={0.8}
        panSpeed={0.95}
        zoomSpeed={0.9}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        onChange={() => {
          if (viewerEffectsEnabled || !allowNavigation) {
            return;
          }

          scheduleCameraSync();
        }}
        onEnd={() => {
          if (!allowNavigation) {
            return;
          }

          flushPendingCameraSync();
        }}
      />
    </Suspense>
  );
}
