import type { SceneDescriptor } from '../types';
import { getBackgroundCss } from './sceneUtils';

function blobToDataUrl(blob: Blob) {
  return blob.arrayBuffer().then((arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    let base64: string;
    const bufferCtor = (
      globalThis as typeof globalThis & {
        Buffer?: {
          from(data: Uint8Array): {
            toString(encoding: 'base64'): string;
          };
        };
      }
    ).Buffer;

    if (bufferCtor) {
      base64 = bufferCtor.from(bytes).toString('base64');
    } else {
      let binary = '';
      const chunkSize = 0x8000;

      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }

      base64 = btoa(binary);
    }

    return `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
  });
}

async function fetchAsDataUrl(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch export asset: ${url}`);
  }

  return blobToDataUrl(await response.blob());
}

async function inlineSceneAssets(scene: SceneDescriptor) {
  const nextScene = structuredClone(scene);

  await Promise.all(
    nextScene.devices.map(async (device) => {
      if (device.customModelUrl) {
        device.customModelUrl = await fetchAsDataUrl(device.customModelUrl);
      }

      if (device.customModelAssetUrls) {
        const assetEntries = await Promise.all(
          Object.entries(device.customModelAssetUrls).map(async ([path, url]) => {
            return [path, await fetchAsDataUrl(url)] as const;
          }),
        );

        device.customModelAssetUrls = Object.fromEntries(assetEntries);
      }

      if (device.screen.imageUrl) {
        device.screen.imageUrl = await fetchAsDataUrl(device.screen.imageUrl);
      }
    }),
  );

  return nextScene;
}

export async function generateExportHtml(scene: SceneDescriptor): Promise<string> {
  const inlinedScene = await inlineSceneAssets(scene);
  const sceneJson = JSON.stringify(inlinedScene, null, 2);
  const backgroundCss = getBackgroundCss(inlinedScene.environment.background);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Studio Embedded Scene</title>
    <style>
        body { 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            background: ${backgroundCss};
            height: 100vh;
            width: 100vw;
        }
        canvas { 
            display: block; 
            width: 100%; 
            height: 100%; 
            outline: none;
        }
        #loading {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            color: #888;
            font-family: sans-serif;
            pointer-events: none;
        }
    </style>
    <script type="importmap">
    {
        "imports": {
            "three": "https://unpkg.com/three@0.183.2/build/three.module.js",
            "three/addons/": "https://unpkg.com/three@0.183.2/examples/jsm/"
        }
    }
    </script>
</head>
<body>
    <div id="loading">Loading 3D...</div>
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

        const config = ${sceneJson};
        const CITY_ENVIRONMENT_URL = 'https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/potsdamer_platz_1k.hdr';

        // --- Init ---
        const container = document.createElement('div');
        document.body.appendChild(container);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        container.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.environmentIntensity = config.environment.lighting.envMapIntensity;
        const environmentLoader = new RGBELoader();
        environmentLoader.load(
            CITY_ENVIRONMENT_URL,
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.colorSpace = THREE.LinearSRGBColorSpace;
                scene.environment = texture;
            },
            undefined,
            (error) => {
                console.warn('Failed to load export environment map', error);
            }
        );

        const camera = new THREE.PerspectiveCamera(config.camera.fov, window.innerWidth / window.innerHeight, 0.1, 100);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = config.interaction.panEnabled;
        controls.enableZoom = config.interaction.zoomEnabled;
        controls.enableRotate = config.interaction.orbitEnabled;
        controls.screenSpacePanning = true;
        controls.zoomSpeed = 0.9;
        controls.panSpeed = 0.95;
        controls.rotateSpeed = 0.8;
        controls.autoRotate = config.interaction.autoRotate;
        controls.autoRotateSpeed = config.interaction.autoRotateSpeed;
        controls.minDistance = Math.max(0.75, config.camera.distance * 0.35);
        controls.maxDistance = Math.max(28, config.camera.distance * 4);
        
        const polarAngle = Math.PI / 2 - (config.camera.elevation * Math.PI / 180);
        const azimuthAngle = config.camera.azimuth * Math.PI / 180;
        const orbitHalfRange = (config.interaction.orbitEnabled ? config.interaction.orbitRange : 0) * Math.PI / 360;
        const target = new THREE.Vector3(...config.camera.target);
        const offset = new THREE.Vector3().setFromSphericalCoords(config.camera.distance, polarAngle, azimuthAngle);
        
        camera.position.copy(target.clone().add(offset));
        camera.lookAt(target);
        controls.target.copy(target);
        controls.minPolarAngle = 0.05;
        controls.maxPolarAngle = Math.PI - 0.05;
        controls.minAzimuthAngle = azimuthAngle - orbitHalfRange;
        controls.maxAzimuthAngle = azimuthAngle + orbitHalfRange;
        controls.update();

        // --- Lighting ---
        const ambient = new THREE.AmbientLight(0xffffff, config.environment.lighting.ambientIntensity);
        scene.add(ambient);

        // Convert mood to color simple
        const moodColor = config.environment.lighting.mood > 0 ? 0xfff4e5 : config.environment.lighting.mood < 0 ? 0xe5f0ff : 0xffffff;
        
        const keyLight = new THREE.DirectionalLight(moodColor, 1.2);
        keyLight.position.set(5, 5, 5);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xe5f0ff, 0.5);
        fillLight.position.set(-5, 3, 5);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 4, -5);
        scene.add(rimLight);

        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.ShadowMaterial({
                color: 0x000000,
                opacity: Math.min(1, config.environment.shadow.opacity * config.environment.shadow.intensity)
            })
        );
        const shadowAnchor = config.devices.reduce((accumulator, deviceConfig) => {
            accumulator.minX = Math.min(accumulator.minX, deviceConfig.position[0]);
            accumulator.maxX = Math.max(accumulator.maxX, deviceConfig.position[0]);
            accumulator.minZ = Math.min(accumulator.minZ, deviceConfig.position[2]);
            accumulator.maxZ = Math.max(accumulator.maxZ, deviceConfig.position[2]);
            return accumulator;
        }, {
            minX: Number.POSITIVE_INFINITY,
            maxX: Number.NEGATIVE_INFINITY,
            minZ: Number.POSITIVE_INFINITY,
            maxZ: Number.NEGATIVE_INFINITY
        });
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.set(
            Number.isFinite(shadowAnchor.minX) ? (shadowAnchor.minX + shadowAnchor.maxX) / 2 : 0,
            -1,
            Number.isFinite(shadowAnchor.minZ) ? (shadowAnchor.minZ + shadowAnchor.maxZ) / 2 : 0
        );
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const deviceRoot = new THREE.Group();
        scene.add(deviceRoot);
        const pointerState = {
            current: new THREE.Vector2(),
            target: new THREE.Vector2()
        };
        const baseShadowPosition = shadowPlane.position.clone();

        // --- Devices ---
        const textureLoader = new THREE.TextureLoader();
        const gltfLoader = new GLTFLoader();
        
        function createScreenMaterial(texture, brightness) {
            return new THREE.MeshStandardMaterial({
                color: 0x111111,
                map: texture,
                emissive: 0xffffff,
                emissiveMap: texture,
                emissiveIntensity: texture ? brightness : 0,
                roughness: 0.1,
                metalness: 0.1
            });
        }

        function normalizeTargetNames(names) {
            return new Set((names || []).map((entry) => entry.toLowerCase()));
        }

        function isScreenMesh(mesh, targetMeshNames) {
            const name = mesh.name.toLowerCase();
            return targetMeshNames.has(name) || name.includes('screen') || name.includes('display');
        }

        function isScreenMaterial(material, targetMaterialNames) {
            return targetMaterialNames.has((material.name || '').toLowerCase());
        }

        function assignScreenMaterialToMesh(mesh, texture, brightness, targetMeshNames, targetMaterialNames) {
            const screenMaterial = createScreenMaterial(texture, brightness);

            if (isScreenMesh(mesh, targetMeshNames)) {
                mesh.material = screenMaterial;
                return;
            }

            if (!Array.isArray(mesh.material)) {
                if (!isScreenMaterial(mesh.material, targetMaterialNames)) {
                    screenMaterial.dispose();
                    return;
                }

                mesh.material = screenMaterial;
                return;
            }

            let hasReplacement = false;
            const nextMaterials = mesh.material.map((entry) => {
                if (!isScreenMaterial(entry, targetMaterialNames)) {
                    return entry;
                }

                hasReplacement = true;
                return screenMaterial;
            });

            if (hasReplacement) {
                mesh.material = nextMaterials;
                return;
            }

            screenMaterial.dispose();
        }

        function normalizeAssetPath(path) {
            return path
                .replace(/\\\\/g, '/')
                .replace(/^\\.\\/+/, '')
                .replace(/^\\/+/, '');
        }

        function getAssetPathCandidates(path) {
            const normalized = normalizeAssetPath(path);
            const decoded = normalizeAssetPath(decodeURIComponent(path));
            const candidates = new Set([normalized, decoded]);

            const addTail = (value) => {
                const parts = value.split('/');
                const tail = parts[parts.length - 1];

                if (tail) {
                    candidates.add(tail);
                }
            };

            addTail(normalized);
            addTail(decoded);

            return [...candidates].filter(Boolean);
        }

        function resolveEmbeddedModelAssetUrl(requestUrl, assetUrls) {
            if (!requestUrl || requestUrl.startsWith('data:')) {
                return requestUrl;
            }

            for (const candidate of getAssetPathCandidates(requestUrl)) {
                if (assetUrls[candidate]) {
                    return assetUrls[candidate];
                }
            }

            try {
                const parsedUrl = new URL(requestUrl);

                for (const candidate of getAssetPathCandidates(parsedUrl.pathname)) {
                    if (assetUrls[candidate]) {
                        return assetUrls[candidate];
                    }
                }
            } catch {
                return requestUrl;
            }

            return requestUrl;
        }

        config.devices.forEach(deviceConfig => {
            const group = new THREE.Group();
            group.position.set(...deviceConfig.position);
            group.rotation.set(...deviceConfig.rotation);
            group.scale.setScalar(deviceConfig.scale);

            if (deviceConfig.customModelUrl) {
                const modelGroup = new THREE.Group();
                const modelTransform = deviceConfig.customModelTransform || {};
                const loadingManager = new THREE.LoadingManager();
                const dracoLoader = new DRACOLoader(loadingManager);
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
                const deviceGltfLoader = new GLTFLoader(loadingManager);
                deviceGltfLoader.setDRACOLoader(dracoLoader);

                if (deviceConfig.customModelAssetUrls) {
                    loadingManager.setURLModifier((url) => resolveEmbeddedModelAssetUrl(url, deviceConfig.customModelAssetUrls));
                }

                if (modelTransform.position) {
                    modelGroup.position.set(...modelTransform.position);
                }

                if (modelTransform.rotation) {
                    modelGroup.rotation.set(...modelTransform.rotation);
                }

                modelGroup.scale.setScalar(modelTransform.scale || 1);

                deviceGltfLoader.load(deviceConfig.customModelUrl, (gltf) => {
                    const model = gltf.scene;
                    const screenMeshNames = normalizeTargetNames(deviceConfig.screenMeshNames);
                    const screenMaterialNames = normalizeTargetNames(deviceConfig.screenMaterialNames);
                    const applyScreenMaterial = (texture) => {
                        model.traverse(child => {
                            if (!child.isMesh) {
                                return;
                            }

                            assignScreenMaterialToMesh(
                                child,
                                texture,
                                deviceConfig.screen.brightness,
                                screenMeshNames,
                                screenMaterialNames
                            );
                        });
                    };
                    
                    if (deviceConfig.screen.imageUrl) {
                        textureLoader.load(deviceConfig.screen.imageUrl, t => {
                            t.colorSpace = THREE.SRGBColorSpace;
                            t.minFilter = THREE.LinearFilter;
                            applyScreenMaterial(t);
                        });
                    } else {
                        applyScreenMaterial(null);
                    }

                    modelGroup.add(model);
                    group.add(modelGroup);
                    deviceRoot.add(group);
                });
                return;
            }

            const materialProps = deviceConfig.material || { color: '#2d2d2d', metalness: 0.8, roughness: 0.2 };
            const radius = deviceConfig.geometry?.cornerRadius ?? 0.15;

            // Create procedural geometry based on deviceId
            let bodyGeo, screenGeo, bodyPos = [0,0,0], screenPos = [0,0,0];
            
            if (deviceConfig.deviceId === 'ipad-pro') {
                bodyGeo = new RoundedBoxGeometry(2.8, 3.8, 0.1, 4, radius);
                screenGeo = new RoundedBoxGeometry(2.6, 3.6, 0.01, 4, radius * 0.8);
                screenPos = [0, 0, 0.05];
            } else if (deviceConfig.deviceId === 'macbook-pro') {
                const baseGeometry = new RoundedBoxGeometry(5.0, 0.1, 3.4, 4, radius * 0.3);
                const baseMesh = new THREE.Mesh(baseGeometry, new THREE.MeshStandardMaterial(materialProps));
                baseMesh.position.set(0, 0, 1.7);
                group.add(baseMesh);

                const lidGroup = new THREE.Group();
                lidGroup.position.set(0, 0.05, 0);
                lidGroup.rotation.set(-Math.PI * 0.1, 0, 0);
                
                bodyGeo = new RoundedBoxGeometry(5.0, 3.4, 0.08, 4, radius * 0.3);
                bodyPos = [0, 1.7, 0];
                
                screenGeo = new RoundedBoxGeometry(4.8, 3.0, 0.01, 4, radius * 0.1);
                screenPos = [0, 1.7, 0.04];
                
                const lidBody = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial(materialProps));
                lidBody.position.set(...bodyPos);
                lidGroup.add(lidBody);
                
                const lidScreen = new THREE.Mesh(screenGeo, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.1 }));
                lidScreen.position.set(...screenPos);
                
                if (deviceConfig.screen.imageUrl) {
                    textureLoader.load(deviceConfig.screen.imageUrl, t => {
                        t.colorSpace = THREE.SRGBColorSpace;
                        t.minFilter = THREE.LinearFilter;
                        lidScreen.material.map = t;
                        lidScreen.material.emissive = new THREE.Color(0xffffff);
                        lidScreen.material.emissiveMap = t;
                        lidScreen.material.emissiveIntensity = deviceConfig.screen.brightness;
                        lidScreen.material.needsUpdate = true;
                    });
                }
                lidGroup.add(lidScreen);
                group.add(lidGroup);
                group.position.set(0, -1, 0);
                deviceRoot.add(group);
                return; // Early return for macbook custom structure
            } else {
                bodyGeo = new RoundedBoxGeometry(1.4, 2.9, 0.15, 4, radius);
                screenGeo = new RoundedBoxGeometry(1.3, 2.8, 0.01, 4, radius * 0.8);
                screenPos = [0, 0, 0.08];
            }

            const bodyMat = new THREE.MeshStandardMaterial(materialProps);
            const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
            bodyMesh.position.set(...bodyPos);
            group.add(bodyMesh);

            const screenMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.1 });
            if (deviceConfig.screen.imageUrl) {
                textureLoader.load(deviceConfig.screen.imageUrl, t => {
                    t.colorSpace = THREE.SRGBColorSpace;
                    t.minFilter = THREE.LinearFilter;
                    screenMat.map = t;
                    screenMat.emissive = new THREE.Color(0xffffff);
                    screenMat.emissiveMap = t;
                    screenMat.emissiveIntensity = deviceConfig.screen.brightness;
                    screenMat.needsUpdate = true;
                });
            }
            const screenMesh = new THREE.Mesh(screenGeo, screenMat);
            screenMesh.position.set(...screenPos);
            group.add(screenMesh);

            deviceRoot.add(group);
        });

        // Hide loading text once parsed
        document.getElementById('loading').style.display = 'none';

        // --- Events ---
        window.addEventListener('resize', onWindowResize);
        renderer.domElement.addEventListener('pointermove', onPointerMove);
        renderer.domElement.addEventListener('pointerleave', onPointerLeave);

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function onPointerMove(event) {
            const rect = renderer.domElement.getBoundingClientRect();

            pointerState.target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            pointerState.target.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        }

        function onPointerLeave() {
            pointerState.target.set(0, 0);
        }

        function updateViewerEffects() {
            pointerState.current.lerp(pointerState.target, 0.08);

            const parallaxIntensity = config.interaction.hoverParallax
                ? (config.interaction.hoverParallaxIntensity || 0.3)
                : 0;
            const attractionIntensity = config.interaction.cursorAttraction
                ? (config.interaction.cursorAttractionIntensity || 0.28)
                : 0;

            deviceRoot.position.x = pointerState.current.x * parallaxIntensity * 0.16;
            deviceRoot.position.y = pointerState.current.y * parallaxIntensity * 0.12;
            deviceRoot.rotation.x = -pointerState.current.y * attractionIntensity * 0.18;
            deviceRoot.rotation.y = pointerState.current.x * attractionIntensity * 0.24;
            shadowPlane.position.x = baseShadowPosition.x + pointerState.current.x * parallaxIntensity * 0.08;
            shadowPlane.position.z = baseShadowPosition.z - pointerState.current.y * parallaxIntensity * 0.04;
        }

        // --- Render Loop ---
        function animate() {
            requestAnimationFrame(animate);
            updateViewerEffects();
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>`;
}
