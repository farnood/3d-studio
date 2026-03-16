import type {
  BackgroundConfig,
  DevicePlacement,
  InteractionConfig,
  SceneDescriptor,
} from '../types';

const DEFAULT_GRADIENT_ANGLE = 135;
const DEFAULT_INTERACTION: InteractionConfig = {
  orbitEnabled: true,
  orbitRange: 30,
  springBack: true,
  springStiffness: 120,
  springDamping: 14,
  autoRotate: false,
  autoRotateSpeed: 0,
  hoverParallax: true,
  hoverParallaxIntensity: 0.3,
  cursorAttraction: false,
  cursorAttractionIntensity: 0.28,
};

type SceneProjectFile = {
  version: number;
  scene: SceneDescriptor;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTuple3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every(isFiniteNumber);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || isFiniteNumber(value);
}

function isBackgroundConfig(value: unknown): value is BackgroundConfig {
  if (!isRecord(value)) {
    return false;
  }

  if (value.mode !== 'solid' && value.mode !== 'gradient') {
    return false;
  }

  if (typeof value.color !== 'string') {
    return false;
  }

  if (value.gradientTo !== undefined && typeof value.gradientTo !== 'string') {
    return false;
  }

  return value.gradientAngle === undefined || isFiniteNumber(value.gradientAngle);
}

function isDevicePlacement(value: unknown): value is DevicePlacement {
  if (!isRecord(value)) {
    return false;
  }

  const { screen, material, geometry, customModelTransform } = value;

  return (
    typeof value.deviceId === 'string' &&
    isTuple3(value.position) &&
    isTuple3(value.rotation) &&
    isFiniteNumber(value.scale) &&
    isRecord(screen) &&
    (screen.imageUrl === null || typeof screen.imageUrl === 'string') &&
    (screen.fitMode === 'cover' || screen.fitMode === 'contain') &&
    isFiniteNumber(screen.brightness) &&
    (value.customModelUrl === undefined ||
      value.customModelUrl === null ||
      typeof value.customModelUrl === 'string') &&
    (value.customModelAssetUrls === undefined ||
      value.customModelAssetUrls === null ||
      isStringRecord(value.customModelAssetUrls)) &&
    (customModelTransform === undefined ||
      customModelTransform === null ||
      (isRecord(customModelTransform) &&
        (customModelTransform.position === undefined ||
          isTuple3(customModelTransform.position)) &&
        (customModelTransform.rotation === undefined ||
          isTuple3(customModelTransform.rotation)) &&
        (customModelTransform.scale === undefined ||
          isFiniteNumber(customModelTransform.scale)))) &&
    (value.screenMeshNames === undefined ||
      value.screenMeshNames === null ||
      isStringArray(value.screenMeshNames)) &&
    (value.screenMaterialNames === undefined ||
      value.screenMaterialNames === null ||
      isStringArray(value.screenMaterialNames)) &&
    (material === undefined ||
      (isRecord(material) &&
        typeof material.color === 'string' &&
        isFiniteNumber(material.metalness) &&
        isFiniteNumber(material.roughness))) &&
    (geometry === undefined ||
      (isRecord(geometry) && isFiniteNumber(geometry.cornerRadius)))
  );
}

function isInteractionConfigLike(value: unknown): value is Partial<InteractionConfig> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOptionalBoolean(value.orbitEnabled) &&
    isOptionalFiniteNumber(value.orbitRange) &&
    isOptionalBoolean(value.springBack) &&
    isOptionalFiniteNumber(value.springStiffness) &&
    isOptionalFiniteNumber(value.springDamping) &&
    isOptionalBoolean(value.autoRotate) &&
    isOptionalFiniteNumber(value.autoRotateSpeed) &&
    isOptionalBoolean(value.hoverParallax) &&
    isOptionalFiniteNumber(value.hoverParallaxIntensity) &&
    isOptionalBoolean(value.cursorAttraction) &&
    isOptionalFiniteNumber(value.cursorAttractionIntensity)
  );
}

function isSceneDescriptor(value: unknown): value is SceneDescriptor {
  if (!isRecord(value)) {
    return false;
  }

  const { environment, camera, interaction } = value;

  return (
    typeof value.templateId === 'string' &&
    isFiniteNumber(value.version) &&
    Array.isArray(value.devices) &&
    value.devices.every(isDevicePlacement) &&
    isRecord(environment) &&
    isBackgroundConfig(environment.background) &&
    isRecord(environment.shadow) &&
    isFiniteNumber(environment.shadow.intensity) &&
    isFiniteNumber(environment.shadow.softness) &&
    isFiniteNumber(environment.shadow.opacity) &&
    isRecord(environment.lighting) &&
    isFiniteNumber(environment.lighting.mood) &&
    isFiniteNumber(environment.lighting.ambientIntensity) &&
    isFiniteNumber(environment.lighting.envMapIntensity) &&
    isRecord(camera) &&
    isFiniteNumber(camera.distance) &&
    isFiniteNumber(camera.elevation) &&
    isFiniteNumber(camera.azimuth) &&
    isFiniteNumber(camera.fov) &&
    isTuple3(camera.target) &&
    isInteractionConfigLike(interaction)
  );
}

function revokeBlobUrl(url: string | null | undefined) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function revokeBlobUrlRecord(record: Record<string, string> | null | undefined) {
  if (!record) {
    return;
  }

  const seen = new Set<string>();

  for (const url of Object.values(record)) {
    if (!url.startsWith('blob:') || seen.has(url)) {
      continue;
    }

    seen.add(url);
    URL.revokeObjectURL(url);
  }
}

function normalizeScene(scene: SceneDescriptor): SceneDescriptor {
  const normalizedScene = cloneScene(scene);

  normalizedScene.environment.background = normalizeBackground(normalizedScene.environment.background);
  normalizedScene.interaction = normalizeInteraction(normalizedScene.interaction);
  normalizedScene.devices = normalizedScene.devices.map((device) => {
    const customModelUrl = device.customModelUrl?.startsWith('blob:')
      ? null
      : device.customModelUrl ?? null;

    return {
      ...device,
      customModelUrl,
      customModelAssetUrls:
        customModelUrl && customModelUrl.startsWith('blob:')
          ? device.customModelAssetUrls ?? null
          : null,
      customModelTransform: customModelUrl ? device.customModelTransform ?? null : null,
      screenMeshNames: customModelUrl ? device.screenMeshNames ?? null : null,
      screenMaterialNames: customModelUrl ? device.screenMaterialNames ?? null : null,
    };
  });

  return normalizedScene;
}

export function cloneScene(scene: SceneDescriptor): SceneDescriptor {
  return structuredClone(scene);
}

export function normalizeBackground(background: BackgroundConfig): BackgroundConfig {
  if (background.mode === 'gradient') {
    return {
      ...background,
      gradientTo: background.gradientTo ?? background.color,
      gradientAngle: background.gradientAngle ?? DEFAULT_GRADIENT_ANGLE,
    };
  }

  return background;
}

function normalizeInteraction(
  interaction: Partial<InteractionConfig>,
): InteractionConfig {
  return {
    ...DEFAULT_INTERACTION,
    ...interaction,
  };
}

export function getBackgroundCss(background: BackgroundConfig): string {
  const normalized = normalizeBackground(background);

  if (normalized.mode === 'gradient') {
    return `linear-gradient(${normalized.gradientAngle}deg, ${normalized.color} 0%, ${normalized.gradientTo} 100%)`;
  }

  return normalized.color;
}

export function getCameraPosition(
  camera: SceneDescriptor['camera'],
): [number, number, number] {
  const polarAngle = Math.PI / 2 - (camera.elevation * Math.PI) / 180;
  const azimuthAngle = (camera.azimuth * Math.PI) / 180;
  const sinPhiRadius = Math.sin(polarAngle) * camera.distance;

  return [
    camera.target[0] + sinPhiRadius * Math.sin(azimuthAngle),
    camera.target[1] + Math.cos(polarAngle) * camera.distance,
    camera.target[2] + sinPhiRadius * Math.cos(azimuthAngle),
  ];
}

export function getCameraStateFromPosition(
  position: [number, number, number],
  target: [number, number, number],
): Pick<SceneDescriptor['camera'], 'distance' | 'elevation' | 'azimuth' | 'target'> {
  const offsetX = position[0] - target[0];
  const offsetY = position[1] - target[1];
  const offsetZ = position[2] - target[2];
  const distance = Math.max(0.001, Math.hypot(offsetX, offsetY, offsetZ));
  const elevation = (Math.asin(offsetY / distance) * 180) / Math.PI;
  const azimuth = (Math.atan2(offsetX, offsetZ) * 180) / Math.PI;

  return {
    distance,
    elevation,
    azimuth,
    target,
  };
}

export function disposeSceneAssets(scene: SceneDescriptor | null) {
  if (!scene) {
    return;
  }

  for (const device of scene.devices) {
    revokeBlobUrl(device.customModelUrl);
    revokeBlobUrlRecord(device.customModelAssetUrls);
  }
}

export function prepareSceneForProject(scene: SceneDescriptor): SceneProjectFile {
  const serializedScene = cloneScene(scene);

  serializedScene.devices = serializedScene.devices.map((device) => {
    const customModelUrl = device.customModelUrl?.startsWith('blob:')
      ? null
      : device.customModelUrl ?? null;

    return {
      ...device,
      customModelUrl,
      customModelAssetUrls:
        customModelUrl && !customModelUrl.startsWith('blob:')
          ? null
          : null,
      customModelTransform: customModelUrl ? device.customModelTransform ?? null : null,
      screenMeshNames: customModelUrl ? device.screenMeshNames ?? null : null,
      screenMaterialNames: customModelUrl ? device.screenMaterialNames ?? null : null,
    };
  });

  serializedScene.environment.background = normalizeBackground(serializedScene.environment.background);

  return {
    version: serializedScene.version,
    scene: serializedScene,
  };
}

export function parseProjectFile(content: string): SceneProjectFile {
  const parsed: unknown = JSON.parse(content);

  if (!isRecord(parsed) || !isSceneDescriptor(parsed.scene)) {
    throw new Error('Invalid project file format.');
  }

  return {
    version: isFiniteNumber(parsed.version) ? parsed.version : parsed.scene.version,
    scene: normalizeScene(parsed.scene),
  };
}
