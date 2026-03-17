import { Suspense, useEffect, useMemo, useState } from 'react';
import { RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DevicePlacement } from '../types';
import { getEffectiveBuiltInModelTargets } from '../lib/deviceModelPresets';
import { resolveUploadedModelAssetUrl } from '../lib/modelUpload';

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
}

function getScreenUvBounds(mesh: THREE.Mesh) {
  const uvAttribute = mesh.geometry.getAttribute('uv');

  if (!uvAttribute || uvAttribute.itemSize < 2 || uvAttribute.count === 0) {
    return null;
  }

  let minU = Infinity;
  let minV = Infinity;
  let maxU = -Infinity;
  let maxV = -Infinity;

  for (let index = 0; index < uvAttribute.count; index += 1) {
    const u = uvAttribute.getX(index);
    const v = uvAttribute.getY(index);

    minU = Math.min(minU, u);
    minV = Math.min(minV, v);
    maxU = Math.max(maxU, u);
    maxV = Math.max(maxV, v);
  }

  const spanU = maxU - minU;
  const spanV = maxV - minV;

  if (spanU <= 0.00001 || spanV <= 0.00001) {
    return null;
  }

  return { minU, minV, spanU, spanV };
}

function createScreenTextureForMesh(
  texture: THREE.Texture | null,
  mesh: THREE.Mesh,
) {
  if (!texture) {
    return null;
  }

  const nextTexture = texture.clone();
  configureTexture(nextTexture);

  const uvBounds = getScreenUvBounds(mesh);

  if (!uvBounds) {
    return nextTexture;
  }

  nextTexture.repeat.set(1 / uvBounds.spanU, 1 / uvBounds.spanV);
  nextTexture.offset.set(
    -uvBounds.minU / uvBounds.spanU,
    -uvBounds.minV / uvBounds.spanV,
  );
  nextTexture.needsUpdate = true;

  return nextTexture;
}

function createScreenMaterial(texture: THREE.Texture | null, brightness: number) {
  const material = new THREE.MeshStandardMaterial({
    color: '#111111',
    map: texture,
    emissive: '#ffffff',
    emissiveMap: texture,
    emissiveIntensity: texture ? brightness : 0,
    roughness: 0.1,
    metalness: 0.1,
  });

  material.userData.codexScreenMaterial = true;
  material.userData.codexScreenTexture = texture;

  return material;
}

function getScreenTargetNames(names: string[] | null | undefined) {
  return new Set((names ?? []).map((entry) => entry.toLowerCase()));
}

function isScreenMaterial(
  material: THREE.Material,
  targetMaterialNames: Set<string>,
) {
  return targetMaterialNames.has(material.name.toLowerCase());
}

function isScreenMesh(
  mesh: THREE.Mesh,
  targetMeshNames: Set<string>,
) {
  const name = mesh.name.toLowerCase();
  return (
    targetMeshNames.has(name) ||
    name.includes('screen') ||
    name.includes('display')
  );
}

function disposeScreenMaterial(material: THREE.Material) {
  const screenTexture = material.userData?.codexScreenTexture;

  if (screenTexture instanceof THREE.Texture) {
    screenTexture.dispose();
    material.userData.codexScreenTexture = null;
  }

  if (!material.userData?.codexScreenMaterial) {
    return;
  }

  material.userData.codexScreenMaterial = false;
  material.dispose();
}

function assignScreenMaterialToMesh(
  mesh: THREE.Mesh,
  texture: THREE.Texture | null,
  brightness: number,
  targetMeshNames: Set<string>,
  targetMaterialNames: Set<string>,
) {
  let screenMaterial: THREE.MeshStandardMaterial | null = null;

  const getScreenMaterial = () => {
    if (!screenMaterial) {
      screenMaterial = createScreenMaterial(
        createScreenTextureForMesh(texture, mesh),
        brightness,
      );
    }

    return screenMaterial;
  };

  if (isScreenMesh(mesh, targetMeshNames)) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(disposeScreenMaterial);
    } else {
      disposeScreenMaterial(mesh.material);
    }

    mesh.material = getScreenMaterial();
    return;
  }

  if (!Array.isArray(mesh.material)) {
    if (!isScreenMaterial(mesh.material, targetMaterialNames)) {
      return;
    }

    disposeScreenMaterial(mesh.material);
    mesh.material = getScreenMaterial();
    return;
  }

  let hasReplacement = false;
  const nextMaterials = mesh.material.map((entry) => {
    if (!isScreenMaterial(entry, targetMaterialNames)) {
      return entry;
    }

    hasReplacement = true;
    disposeScreenMaterial(entry);
    return getScreenMaterial();
  });

  if (!hasReplacement) {
    if (screenMaterial) {
      disposeScreenMaterial(screenMaterial);
    }

    return;
  }

  mesh.material = nextMaterials;
}

function useConfiguredScreenTexture(imageUrl: string) {
  const sourceTexture = useTexture(imageUrl);
  const texture = useMemo(() => {
    const nextTexture = sourceTexture.clone();
    configureTexture(nextTexture);
    return nextTexture;
  }, [sourceTexture]);

  useEffect(() => () => texture.dispose(), [texture]);

  return texture;
}

function ScreenMaterial({ device }: { device: DevicePlacement }) {
  const texture = useConfiguredScreenTexture(device.screen.imageUrl!);

  return (
    <meshStandardMaterial
      color="#111"
      map={texture}
      emissive="#fff"
      emissiveMap={texture}
      emissiveIntensity={device.screen.brightness}
      roughness={0.1}
      metalness={0.1}
    />
  );
}

function DeviceScreen({
  device,
  args,
  radius,
  position,
}: {
  device: DevicePlacement;
  args: [number, number, number];
  radius: number;
  position: [number, number, number];
}) {
  return (
    <RoundedBox
      args={args}
      radius={radius}
      smoothness={4}
      position={position}
      castShadow={false}
      receiveShadow={false}
    >
      {device.screen.imageUrl ? (
        <Suspense fallback={<meshStandardMaterial color="#111" roughness={0.1} metalness={0.1} />}>
          <ScreenMaterial device={device} />
        </Suspense>
      ) : (
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.1} />
      )}
    </RoundedBox>
  );
}

function ProceduralGeometry({ device }: { device: DevicePlacement }) {
  const materialProps = device.material || { color: '#2d2d2d', metalness: 0.8, roughness: 0.2 };
  const radius = device.geometry?.cornerRadius ?? 0.15;

  if (device.deviceId === 'ipad-pro') {
    return (
      <>
        <RoundedBox args={[2.8, 3.8, 0.1]} radius={radius} smoothness={4}>
          <meshStandardMaterial {...materialProps} />
        </RoundedBox>
        <DeviceScreen device={device} args={[2.6, 3.6, 0.01]} radius={radius * 0.8} position={[0, 0, 0.05]} />
      </>
    );
  }

  if (device.deviceId === 'macbook-pro') {
    return (
      <group position={[0, -1, 0]}>
        <RoundedBox args={[5.0, 0.1, 3.4]} radius={radius * 0.3} smoothness={4} position={[0, 0, 1.7]}>
          <meshStandardMaterial {...materialProps} />
        </RoundedBox>

        <group position={[0, 0.05, 0]} rotation={[-Math.PI * 0.1, 0, 0]}>
          <RoundedBox args={[5.0, 3.4, 0.08]} radius={radius * 0.3} smoothness={4} position={[0, 1.7, 0]}>
            <meshStandardMaterial {...materialProps} />
          </RoundedBox>
          <DeviceScreen device={device} args={[4.8, 3.0, 0.01]} radius={radius * 0.1} position={[0, 1.7, 0.04]} />
        </group>
      </group>
    );
  }

  return (
    <>
      <RoundedBox args={[1.4, 2.9, 0.15]} radius={radius} smoothness={4}>
        <meshStandardMaterial {...materialProps} />
      </RoundedBox>
      <DeviceScreen device={device} args={[1.3, 2.8, 0.01]} radius={radius * 0.8} position={[0, 0, 0.08]} />
    </>
  );
}

function CustomGLTFModel({ device }: { device: DevicePlacement }) {
  const [scene, setScene] = useState<THREE.Group | THREE.Object3D | null>(null);
  const clonedScene = useMemo(() => scene?.clone() ?? null, [scene]);
  const effectiveTargets = useMemo(
    () =>
      getEffectiveBuiltInModelTargets(
        device.customModelUrl,
        device.screenMeshNames,
        device.screenMaterialNames,
      ),
    [device.customModelUrl, device.screenMaterialNames, device.screenMeshNames],
  );
  const screenMeshNames = useMemo(
    () => getScreenTargetNames(effectiveTargets.screenMeshNames),
    [effectiveTargets.screenMeshNames],
  );
  const screenMaterialNames = useMemo(
    () => getScreenTargetNames(effectiveTargets.screenMaterialNames),
    [effectiveTargets.screenMaterialNames],
  );
  const uploadedAssetUrls = device.customModelAssetUrls ?? null;

  useEffect(() => {
    let cancelled = false;
    const loadingManager = new THREE.LoadingManager();

    if (uploadedAssetUrls) {
      loadingManager.setURLModifier((url) =>
        resolveUploadedModelAssetUrl(url, uploadedAssetUrls),
      );
    }

    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

    const loader = new GLTFLoader(loadingManager);
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      device.customModelUrl!,
      (gltf) => {
        if (cancelled) {
          return;
        }

        setScene(gltf.scene);
      },
      undefined,
      (error) => {
        if (cancelled) {
          return;
        }

        console.error('Failed to load custom model', error);
        setScene(null);
      },
    );

    return () => {
      cancelled = true;
      dracoLoader.dispose();
    };
  }, [device.customModelUrl, uploadedAssetUrls]);

  useEffect(() => {
    if (!clonedScene) {
      return undefined;
    }

    let loadedTexture: THREE.Texture | null = null;
    let cancelled = false;

    const assignScreenMaterial = (texture: THREE.Texture | null) => {
      clonedScene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return;
        }

        assignScreenMaterialToMesh(
          child,
          texture,
          device.screen.brightness,
          screenMeshNames,
          screenMaterialNames,
        );
      });
    };

    if (!device.screen.imageUrl) {
      assignScreenMaterial(null);
      return undefined;
    }

    const loader = new THREE.TextureLoader();
    loader.load(device.screen.imageUrl, (texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }

      configureTexture(texture);
      loadedTexture = texture;
      assignScreenMaterial(texture);
    });

    return () => {
      cancelled = true;
      loadedTexture?.dispose();
    };
  }, [
    clonedScene,
    device.screen.brightness,
    device.screen.imageUrl,
    screenMaterialNames,
    screenMeshNames,
  ]);

  if (!clonedScene) {
    return null;
  }

  return <primitive object={clonedScene} />;
}

export default function DeviceModelLoader({ device }: { index: number; device: DevicePlacement }) {
  const customModelTransform = device.customModelTransform ?? {};

  return (
    <group position={device.position} rotation={device.rotation} scale={device.scale}>
      {device.customModelUrl ? (
        <group
          position={customModelTransform.position ?? [0, 0, 0]}
          rotation={customModelTransform.rotation ?? [0, 0, 0]}
          scale={customModelTransform.scale ?? 1}
        >
          <Suspense fallback={null}>
            <CustomGLTFModel device={device} />
          </Suspense>
        </group>
      ) : (
        <ProceduralGeometry device={device} />
      )}
    </group>
  );
}
