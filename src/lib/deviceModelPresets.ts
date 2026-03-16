import type { DevicePlacement } from '../types';

export type BuiltInDeviceModelPreset = {
  id: string;
  label: string;
  deviceIds: string[];
  customModelUrl: string;
  customModelTransform?: DevicePlacement['customModelTransform'];
  screenMeshNames?: string[];
  screenMaterialNames?: string[];
};

export const BUILT_IN_DEVICE_MODEL_PRESETS: BuiltInDeviceModelPreset[] = [
  {
    id: 'iphone-15-pro-max',
    label: 'iPhone 15 Pro Max',
    deviceIds: ['iphone-16'],
    customModelUrl: '/models/devices/iphone-15.glb',
    customModelTransform: {
      rotation: [0, Math.PI, 0],
      scale: 17,
    },
    screenMeshNames: ['xXDHkMplTIDAXLN'],
    screenMaterialNames: ['pIJKfZsazmcpEiU'],
  },
  {
    id: 'iphone-x',
    label: 'iPhone X',
    deviceIds: ['iphone-16'],
    customModelUrl: '/models/devices/iphone-x.glb',
    customModelTransform: {
      position: [0, 0, -0.046],
      scale: 0.00624,
    },
    screenMeshNames: ['Screen_Material003_0', 'Screen_Material003_0_1'],
    screenMaterialNames: ['Material.003'],
  },
  {
    id: 'ipad-pro-2020',
    label: 'iPad Pro 2020',
    deviceIds: ['ipad-pro'],
    customModelUrl: '/models/devices/ipad-pro-2020.glb',
    customModelTransform: {
      position: [0, -6.701, 0.039],
      rotation: [0, Math.PI, 0],
      scale: 6.7,
    },
    screenMeshNames: ['Object_29'],
    screenMaterialNames: ['screen'],
  },
  {
    id: 'ipad-air-4',
    label: 'iPad Air 4',
    deviceIds: ['ipad-pro'],
    customModelUrl: '/models/devices/ipad-air-4.glb',
    customModelTransform: {
      position: [0.321, -0.033, 0.052],
      rotation: [0, -Math.PI / 2, 0],
      scale: 1.03,
    },
    screenMeshNames: ['Screen_LCD_0', 'Screen_screen_0'],
    screenMaterialNames: ['screen', 'material_9'],
  },
  {
    id: 'aluminum-laptop',
    label: 'Aluminum Laptop',
    deviceIds: ['macbook-pro'],
    customModelUrl: '/models/devices/laptop.glb',
    customModelTransform: {
      position: [0, -1.49, 0.09],
      scale: 0.145,
    },
    screenMeshNames: ['Screen_ComputerScreen_0'],
    screenMaterialNames: ['ComputerScreen'],
  },
  {
    id: 'macbook-pro-studio',
    label: 'MacBook Pro',
    deviceIds: ['macbook-pro'],
    customModelUrl: '/models/devices/macbook-pro.glb',
    customModelTransform: {
      position: [0, -1.406, 1.906],
      scale: 12.5,
    },
    screenMeshNames: ['Object_20'],
    screenMaterialNames: ['Material.010'],
  },
];

export function getBuiltInDeviceModelPresets(deviceId: string) {
  return BUILT_IN_DEVICE_MODEL_PRESETS.filter((preset) =>
    preset.deviceIds.includes(deviceId),
  );
}

export function findBuiltInDeviceModelPresetByUrl(
  customModelUrl: string | null | undefined,
) {
  if (!customModelUrl) {
    return null;
  }

  return (
    BUILT_IN_DEVICE_MODEL_PRESETS.find(
      (preset) => preset.customModelUrl === customModelUrl,
    ) ?? null
  );
}

export function createBuiltInDeviceModelUpdate(
  preset: BuiltInDeviceModelPreset,
): Partial<DevicePlacement> {
  return {
    customModelUrl: preset.customModelUrl,
    customModelAssetUrls: null,
    customModelTransform: preset.customModelTransform ?? null,
    screenMeshNames: preset.screenMeshNames ?? null,
    screenMaterialNames: preset.screenMaterialNames ?? null,
  };
}
