import type { SceneTemplate } from '../types';
import {
  BUILT_IN_DEVICE_MODEL_PRESETS,
  createBuiltInDeviceModelUpdate,
} from '../lib/deviceModelPresets';

const DEFAULT_IPAD_MODEL = BUILT_IN_DEVICE_MODEL_PRESETS.find(
  (preset) => preset.id === 'ipad-pro-2020',
);

export const IPAD_TEMPLATE: SceneTemplate = {
  id: "hero-ipad",
  name: "Hero iPad",
  description: "Floating iPad Pro in portrait mode",
  thumbnail: "/thumbnails/hero-ipad.webp",
  tags: ["tablet", "hero", "single"],
  scene: {
    templateId: "hero-ipad",
    version: 1,
    devices: [
      {
        deviceId: "ipad-pro",
        position: [0, 0, 0],
        rotation: [0, -Math.PI * 0.1, 0],
        scale: 1,
        ...(DEFAULT_IPAD_MODEL ? createBuiltInDeviceModelUpdate(DEFAULT_IPAD_MODEL) : {}),
        screen: {
          imageUrl: null,
          fitMode: "cover",
          brightness: 1.0,
        }
      }
    ],
    environment: {
      background: {
        mode: "solid",
        color: "#18181b", 
      },
      shadow: {
        intensity: 0.85,
        softness: 0.6,
        opacity: 0.6
      },
      lighting: {
        mood: 0.1, // slightly warm
        ambientIntensity: 0.4,
        envMapIntensity: 1.0
      }
    },
    camera: {
      distance: 6.5,
      elevation: 5,
      azimuth: -15,
      fov: 35,
      target: [0, 0, 0]
    },
    interaction: {
      orbitEnabled: true,
      orbitRange: 30,
      springBack: true,
      springStiffness: 120,
      springDamping: 14,
      autoRotate: false,
      autoRotateSpeed: 0,
      hoverParallax: true,
      hoverParallaxIntensity: 0.3,
      cursorAttraction: true,
      cursorAttractionIntensity: 0.28
    }
  }
};
