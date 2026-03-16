import type { SceneTemplate } from '../types';
import { BUILT_IN_DEVICE_MODEL_PRESETS, createBuiltInDeviceModelUpdate } from '../lib/deviceModelPresets';

const DEFAULT_LAPTOP_MODEL = BUILT_IN_DEVICE_MODEL_PRESETS.find(
  (preset) => preset.id === 'aluminum-laptop',
);

export const MACBOOK_TEMPLATE: SceneTemplate = {
  id: "hero-macbook",
  name: "Hero MacBook",
  description: "Floating MacBook Pro with rich contrast",
  thumbnail: "/thumbnails/hero-macbook.webp",
  tags: ["laptop", "hero", "single"],
  scene: {
    templateId: "hero-macbook",
    version: 1,
    devices: [
      {
        deviceId: "macbook-pro",
        position: [0, 0, 0],
        rotation: [0, -Math.PI * 0.15, 0],
        scale: 1,
        ...(DEFAULT_LAPTOP_MODEL ? createBuiltInDeviceModelUpdate(DEFAULT_LAPTOP_MODEL) : {}),
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
        color: "#0a0a0c", 
      },
      shadow: {
        intensity: 0.9,
        softness: 0.8,
        opacity: 0.7
      },
      lighting: {
        mood: -0.2, // slightly cool
        ambientIntensity: 0.3,
        envMapIntensity: 1.2
      }
    },
    camera: {
      distance: 8,
      elevation: 15,
      azimuth: -25,
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
