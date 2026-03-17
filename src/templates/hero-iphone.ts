import type { SceneTemplate } from '../types';
import { BUILT_IN_DEVICE_MODEL_PRESETS, createBuiltInDeviceModelUpdate } from '../lib/deviceModelPresets';

const DEFAULT_PHONE_MODEL = BUILT_IN_DEVICE_MODEL_PRESETS.find(
  (preset) => preset.id === 'iphone-15-pro-max',
);

export const DEFAULT_TEMPLATE: SceneTemplate = {
  id: "hero-iphone",
  name: "Hero iPhone",
  description: "Single floating iPhone, dramatic lighting",
  thumbnail: "/thumbnails/hero-iphone.webp",
  tags: ["phone", "hero", "single"],
  scene: {
    templateId: "hero-iphone",
    version: 1,
    devices: [
      {
        deviceId: "iphone-16",
        position: [0, 0, 0],
        rotation: [0, 0, 0], // Optional subtle rotation, maybe [Math.PI * 0.05, -Math.PI * 0.1, 0] later
        scale: 1,
        ...(DEFAULT_PHONE_MODEL ? createBuiltInDeviceModelUpdate(DEFAULT_PHONE_MODEL) : {}),
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
        color: "#18181b", // dark background
      },
      shadow: {
        intensity: 0.8,
        softness: 0.5,
        opacity: 0.6
      },
      lighting: {
        mood: 0.0,
        ambientIntensity: 0.5,
        envMapIntensity: 1.0
      }
    },
    camera: {
      distance: 5,
      elevation: 10,
      azimuth: -15,
      fov: 35,
      target: [0, 0, 0]
    },
    interaction: {
      orbitEnabled: true,
      panEnabled: true,
      zoomEnabled: true,
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
