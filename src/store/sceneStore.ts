import { create } from 'zustand';
import type { SceneDescriptor, EnvironmentConfig, CameraConfig, SceneTemplate, DevicePlacement } from '../types';
import { cloneScene, disposeSceneAssets } from '../lib/sceneUtils';
import { revokeUploadedModelAssetUrls } from '../lib/modelUpload';

interface SceneState {
  templateId: string | null;
  baseScene: SceneDescriptor | null;
  scene: SceneDescriptor | null;

  applyTemplate: (template: SceneTemplate) => void;
  updateEnvironment: (env: Partial<EnvironmentConfig>) => void;
  updateCamera: (camera: Partial<CameraConfig>) => void;
  updateInteraction: (interaction: Partial<SceneDescriptor['interaction']>) => void;
  setScreenImage: (deviceIndex: number, imageUrl: string) => void;
  updateDevice: (deviceIndex: number, update: Partial<DevicePlacement>) => void;
  loadProject: (scene: SceneDescriptor) => void;
  resetToTemplate: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  templateId: null,
  baseScene: null,
  scene: null,

  applyTemplate: (template) => {
    disposeSceneAssets(get().scene);

    const baseScene = cloneScene(template.scene);

    set({
      templateId: template.id,
      baseScene,
      scene: cloneScene(baseScene),
    });
  },

  updateEnvironment: (envUpdate) =>
    set((state) => {
      if (!state.scene) return state;
      return {
        scene: {
          ...state.scene,
          environment: {
            ...state.scene.environment,
            ...(envUpdate.background && { background: { ...state.scene.environment.background, ...envUpdate.background } }),
            ...(envUpdate.shadow && { shadow: { ...state.scene.environment.shadow, ...envUpdate.shadow } }),
            ...(envUpdate.lighting && { lighting: { ...state.scene.environment.lighting, ...envUpdate.lighting } }),
          },
        },
      };
    }),

  updateCamera: (cameraUpdate) =>
    set((state) => {
      if (!state.scene) return state;
      return {
        scene: {
          ...state.scene,
          camera: {
            ...state.scene.camera,
            ...cameraUpdate,
          },
        },
      };
    }),

  updateInteraction: (interactionUpdate) =>
    set((state) => {
      if (!state.scene) return state;
      return {
        scene: {
          ...state.scene,
          interaction: {
            ...state.scene.interaction,
            ...interactionUpdate,
          },
        },
      };
    }),

  setScreenImage: (deviceIndex, imageUrl) =>
    set((state) => {
      if (!state.scene) return state;
      const newDevices = [...state.scene.devices];
      newDevices[deviceIndex] = {
        ...newDevices[deviceIndex],
        screen: {
          ...newDevices[deviceIndex].screen,
          imageUrl,
        },
      };
      return {
        scene: {
          ...state.scene,
          devices: newDevices,
        },
      };
    }),

  updateDevice: (deviceIndex, update) =>
    set((state) => {
      if (!state.scene) return state;

      const newDevices = [...state.scene.devices];
      const previousDevice = newDevices[deviceIndex];

      if (!previousDevice) {
        return state;
      }

      if (
        update.customModelUrl !== undefined &&
        previousDevice.customModelUrl &&
        previousDevice.customModelUrl !== update.customModelUrl &&
        previousDevice.customModelUrl.startsWith('blob:')
      ) {
        URL.revokeObjectURL(previousDevice.customModelUrl);
      }

      if (
        previousDevice.customModelAssetUrls &&
        (
          update.customModelUrl !== undefined ||
          update.customModelAssetUrls !== undefined
        )
      ) {
        revokeUploadedModelAssetUrls(previousDevice.customModelAssetUrls);
      }

      newDevices[deviceIndex] = {
        ...previousDevice,
        ...update,
      };

      return {
        scene: {
          ...state.scene,
          devices: newDevices,
        },
      };
    }),

  loadProject: (scene) => {
    disposeSceneAssets(get().scene);

    const baseScene = cloneScene(scene);

    set({
      templateId: scene.templateId,
      baseScene,
      scene: cloneScene(baseScene),
    });
  },

  resetToTemplate: () => {
    const { scene, baseScene } = get();

    if (!baseScene) {
      return;
    }

    disposeSceneAssets(scene);
    set({ scene: cloneScene(baseScene) });
  },
}));
