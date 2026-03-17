export interface SceneDescriptor {
  templateId: string;
  version: number;
  devices: DevicePlacement[];
  environment: EnvironmentConfig;
  camera: CameraConfig;
  interaction: InteractionConfig;
}

export interface DevicePlacement {
  deviceId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  screen: ScreenConfig;
  customModelUrl?: string | null;
  customModelAssetUrls?: Record<string, string> | null;
  customModelTransform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number;
  } | null;
  screenMeshNames?: string[] | null;
  screenMaterialNames?: string[] | null;
  material?: {
    color: string;
    metalness: number;
    roughness: number;
  };
  geometry?: {
    cornerRadius: number;
  };
}

export interface ScreenConfig {
  imageUrl: string | null;
  fitMode: "cover" | "contain";
  brightness: number;
}

export interface EnvironmentConfig {
  background: BackgroundConfig;
  shadow: ShadowConfig;
  lighting: LightingConfig;
}

export interface BackgroundConfig {
  mode: "solid" | "gradient";
  color: string;
  gradientTo?: string;
  gradientAngle?: number;
}

export interface ShadowConfig {
  intensity: number;
  softness: number;
  opacity: number;
}

export interface LightingConfig {
  mood: number; // -1 to +1
  ambientIntensity: number;
  envMapIntensity: number;
}

export interface CameraConfig {
  distance: number;
  elevation: number;
  azimuth: number;
  fov: number;
  target: [number, number, number];
}

export interface InteractionConfig {
  orbitEnabled: boolean;
  panEnabled: boolean;
  zoomEnabled: boolean;
  orbitRange: number;
  springBack: boolean;
  springStiffness: number;
  springDamping: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
  hoverParallax: boolean;
  hoverParallaxIntensity: number;
  cursorAttraction: boolean;
  cursorAttractionIntensity: number;
}
