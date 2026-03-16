import * as React from 'react';
import { useSceneStore } from '../../store/sceneStore';
import {
  createBuiltInDeviceModelUpdate,
  findBuiltInDeviceModelPresetByUrl,
  getBuiltInDeviceModelPresets,
} from '../../lib/deviceModelPresets';
import { createUploadedModelAssetSet } from '../../lib/modelUpload';

export default function DeviceControls() {
  const scene = useSceneStore((state) => state.scene);
  const updateDevice = useSceneStore((state) => state.updateDevice);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadNotice, setUploadNotice] = React.useState<string | null>(null);

  if (!scene || scene.devices.length === 0) return null;

  const device = scene.devices[0]; // Assuming controlling the primary device

  const material = device.material || { color: '#2d2d2d', metalness: 0.8, roughness: 0.2 };
  const geometry = device.geometry || { cornerRadius: 0.15 };
  const builtInPresets = getBuiltInDeviceModelPresets(device.deviceId);
  const currentPreset = findBuiltInDeviceModelPresetByUrl(device.customModelUrl);
  const presetValue = currentPreset?.id ?? (device.customModelUrl ? '__uploaded__' : '__auto__');
  const isUsingCustomModel = Boolean(device.customModelUrl);

  const handleBuiltInModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPresetId = e.target.value;

    if (nextPresetId === '__auto__') {
      setUploadNotice(null);
      updateDevice(0, {
        customModelUrl: null,
        customModelAssetUrls: null,
        customModelTransform: null,
        screenMeshNames: null,
        screenMaterialNames: null,
      });
      return;
    }

    const preset = builtInPresets.find((entry) => entry.id === nextPresetId);

    if (!preset) {
      return;
    }

    updateDevice(0, createBuiltInDeviceModelUpdate(preset));
    setUploadNotice(null);
  };

  const handleCustomModelLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const uploadedModel = createUploadedModelAssetSet(files);

    if (!uploadedModel) {
      setUploadNotice('Select a .glb or .gltf file to use as the model root.');
      e.target.value = '';
      return;
    }

    updateDevice(0, {
      customModelUrl: uploadedModel.rootUrl,
      customModelAssetUrls: uploadedModel.assetUrls,
      customModelTransform: null,
      screenMeshNames: null,
      screenMaterialNames: null,
    });

    setUploadNotice(
      uploadedModel.rootFile.name.endsWith('.gltf')
        ? 'Uploaded .gltf asset set. Include the .bin and texture files when the model uses sidecars.'
        : 'Uploaded .glb model.',
    );

    e.target.value = '';
  };

  return (
    <section className="inspector-section">
      <h5 className="section-eyebrow">Device Settings</h5>
      
      <div className="control-stack">
        {builtInPresets.length > 0 ? (
          <label className="field">
            Built-In Model
            <select value={presetValue} onChange={handleBuiltInModelChange}>
              <option value="__auto__">Auto Geometry</option>
              {builtInPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
              {presetValue === '__uploaded__' ? (
                <option value="__uploaded__" disabled>
                  Uploaded model
                </option>
              ) : null}
            </select>
          </label>
        ) : null}

        {!isUsingCustomModel ? (
          <>
            <label className="field field--row">
              Body Color
              <input 
                type="color" 
                value={material.color}
                onChange={(e) => updateDevice(0, { material: { ...material, color: e.target.value } })}
              />
            </label>

            <label className="field">
              Corner Radius
              <input 
                type="range" 
                min="0" max="0.5" step="0.01"
                value={geometry.cornerRadius}
                onChange={(e) => updateDevice(0, { geometry: { ...geometry, cornerRadius: parseFloat(e.target.value) } })}
              />
            </label>

            <label className="field">
              Metalness
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={material.metalness}
                onChange={(e) => updateDevice(0, { material: { ...material, metalness: parseFloat(e.target.value) } })}
              />
            </label>

            <label className="field">
              Roughness
              <input 
                type="range" 
                min="0" max="1" step="0.05"
                value={material.roughness}
                onChange={(e) => updateDevice(0, { material: { ...material, roughness: parseFloat(e.target.value) } })}
              />
            </label>
          </>
        ) : null}

        <div style={{ marginTop: 4 }}>
          <input
            type="file"
            ref={fileInputRef}
            hidden
            multiple
            accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.avif,.ktx2"
            onChange={handleCustomModelLoad}
          />
          <button style={{ width: '100%' }} onClick={() => fileInputRef.current?.click()}>
            Load Custom Model
          </button>
          <p className="section-description" style={{ marginTop: 10, marginBottom: 0 }}>
            For `.gltf`, select the root file together with its `.bin` and texture files.
          </p>
          {uploadNotice ? (
            <p className="section-description" style={{ marginTop: 8, marginBottom: 0 }}>
              {uploadNotice}
            </p>
          ) : null}
          {device.customModelUrl && (
            <button 
              style={{ width: '100%', marginTop: 10, backgroundColor: 'rgba(15, 18, 14, 0.78)' }}
              onClick={() => {
                setUploadNotice(null);
                updateDevice(0, {
                  customModelUrl: null,
                  customModelAssetUrls: null,
                  customModelTransform: null,
                  screenMeshNames: null,
                  screenMaterialNames: null,
                });
              }}
            >
              Reset to Auto Geometry
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
