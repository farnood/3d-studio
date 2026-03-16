# 3D Studio — Technical Architecture & Implementation Plan

---

## 1. Recommended Stack

### Decision summary

| Layer | Choice | Runner-up | Why |
|-------|--------|-----------|-----|
| **App shell** | Vite web app → Tauri wrapper (Phase 2) | Electron | Start as a pure web app to validate scenes fast. Wrap in Tauri later for Mac distribution. Tauri > Electron: ~10× smaller binary, native webview, Rust backend for file I/O, no Chromium tax. |
| **Frontend framework** | React 19 + TypeScript | Svelte | React has the best Three.js integration (R3F), largest ecosystem, and most contributors will already know it. |
| **3D rendering** | Three.js via React Three Fiber (R3F) + Drei | Raw Three.js | R3F makes Three.js declarative and composable. Drei provides battle-tested helpers (OrbitControls, environment maps, shadows, GLTF loaders). This is the industry standard for web 3D in React. |
| **State management** | Zustand | Redux, Jotai | Minimal API, works seamlessly outside React (important for export), no boilerplate. Zustand stores are plain objects — perfect for serialization to project files. |
| **Styling** | Vanilla CSS (custom properties + dark theme) | Tailwind | Full control over the premium dark UI. CSS custom properties give us a design token system without a framework dependency. |
| **Asset format** | GLTF 2.0 + Draco compression | FBX, OBJ | GLTF is the web standard. Draco compression reduces model size by 80-90%. Three.js/R3F has first-class GLTF support. |
| **Export runtime** | Standalone Three.js bundle (Rollup) | R3F | Export must not include React — too heavy. The export runtime is a minimal vanilla Three.js script (~80KB gzipped) that loads a scene descriptor and renders it. |
| **Local storage** | JSON project files + referenced image files | SQLite | Simple, human-readable, git-friendly. No database overhead. The project is just a folder. |
| **Packaging** | Tauri 2 (Phase 2) | Electron | 5–10MB app vs 150MB+. Native macOS experience. Rust backend handles file system, image optimization, and export bundling. |
| **Package manager** | pnpm | npm, yarn | Fast, disk-efficient, strict. Good for monorepo if we split editor/export-runtime. |

### Architecture rationale

The critical insight: **the editor and the export runtime share the same scene description format but use different renderers.**

- The **editor** uses React + R3F for a rich, interactive editing experience.
- The **export** uses vanilla Three.js for a minimal, dependency-light embed.
- Both consume the same `SceneDescriptor` JSON. This is the contract that connects them.

This means we can develop and perfect scenes in the browser (fast iteration, hot reload), then export them as lightweight artifacts. We don't need Tauri or any native shell until we want Mac distribution.

```
┌──────────────────────────────────────────────────────┐
│                    3D Studio App                      │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Gallery    │  │    Studio    │  │   Export     │ │
│  │   (React)    │  │   (React +  │  │   (React)   │ │
│  │             │  │    R3F)      │  │             │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │        │
│         ▼                ▼                  ▼        │
│  ┌───────────────────────────────────────────────┐   │
│  │              Zustand Store                     │   │
│  │   (scene state, project state, UI state)      │   │
│  └───────────────────┬───────────────────────────┘   │
│                      │                               │
│         ┌────────────┴────────────┐                  │
│         ▼                         ▼                  │
│  ┌─────────────┐          ┌──────────────┐          │
│  │   R3F        │          │  Export       │          │
│  │   Renderer   │          │  Bundler     │          │
│  │  (editor)    │          │  (builds     │          │
│  │             │          │   standalone  │          │
│  │             │          │   HTML)       │          │
│  └─────────────┘          └──────────────┘          │
│         │                         │                  │
│         ▼                         ▼                  │
│  ┌─────────────┐          ┌──────────────┐          │
│  │ Scene       │◄────────►│ Scene        │          │
│  │ Descriptor  │  shared  │ Descriptor   │          │
│  │ (JSON)      │  format  │ (JSON)       │          │
│  └─────────────┘          └──────────────┘          │
└──────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### Editor app layers

```
Layer 5  ─  UI Shell (Gallery, Studio, Export modes)
Layer 4  ─  Controls (sliders, color pickers, drop zones)
Layer 3  ─  Scene Renderer (R3F canvas, device components, environment)
Layer 2  ─  Scene Engine (Zustand store, scene descriptor, presets)
Layer 1  ─  Asset Pipeline (GLTF loader, image processor, export bundler)
Layer 0  ─  Platform (Vite dev / Tauri shell / file system)
```

### Scene/template system

A **scene template** is a static JSON file bundled with the app. It defines:
- Which devices appear and where
- Camera position and constraints
- Lighting setup (light count, types, positions, intensities)
- Shadow configuration
- Interaction behavior
- Default environment settings

The user's project *extends* a template by overriding specific values (background color, shadow intensity, screen images, etc.). This means:
- Templates are immutable and curated.
- User projects are thin overlays on top of templates.
- Updating a template in a new app version doesn't break user projects (the project only stores delta values).

### Device model system

Each device is a **DeviceDescriptor** paired with a GLTF model file:
- The GLTF contains the device geometry with a designated "screen" mesh (identified by name convention: `Screen` or `Display`).
- The DeviceDescriptor contains metadata: screen dimensions, aspect ratio, screen mesh name, default material overrides.
- Screen image placement = applying a texture to the screen mesh. The UV mapping on the screen mesh is pre-configured in the model so that a 2D image maps correctly without user intervention.

### Material and texture handling

Materials are handled in two tiers:

1. **Device materials** — baked into the GLTF models. These include PBR properties (metalness, roughness, color) for the device body (aluminum, glass, etc.). Users do not edit these in MVP.
2. **Screen texture** — the user's image, applied as a `map` (diffuse texture) on the screen mesh's material. The screen material also has slight emissive properties to simulate a backlit display.

Environment lighting uses Three.js `EnvironmentMap` (HDR) for realistic reflections on device surfaces, plus 1–3 directional/area lights for key/fill/rim lighting per scene template.

### Image-to-screen mapping

```
User drops image
       │
       ▼
Image loaded as HTMLImageElement
       │
       ▼
Compare aspect ratio to device screen ratio
       │
       ├── Match → Apply directly as texture
       │
       └── Mismatch → Apply with fit mode:
                        ├── "cover" → crop to fill (default)
                        └── "contain" → letterbox with black bars
       │
       ▼
Create THREE.Texture from image
       │
       ▼
Assign to screen mesh material.map
       │
       ▼
Viewport updates immediately
```

### Export runtime

The export runtime is a **separate, minimal JavaScript bundle** (not the editor) that:
- Parses a `SceneDescriptor` JSON
- Loads compressed GLTF device models
- Applies screen textures
- Sets up lighting and environment
- Configures constrained orbit + spring-back interaction
- Renders with Three.js directly (no React, no R3F)

Target: **< 150KB JS gzipped + model/texture assets**

### Project file structure

A user project is a folder:

```
my-project.3dstudio/
├── project.json          ← Scene descriptor + user overrides
├── screens/
│   ├── screen-1.png      ← User's screen images (copied into project)
│   └── screen-2.png
└── exports/
    └── latest/
        ├── index.html    ← Last export
        ├── scene.json
        ├── runtime.js
        └── assets/
            ├── device.glb
            └── screen-1.webp
```

### Local persistence model

- **Projects** are saved as `.3dstudio` folders to a user-chosen location (default: `~/Documents/3D Studio/`).
- **Recent projects** list stored in `~/.3dstudio/recent.json` (or platform-appropriate app data directory under Tauri).
- **App preferences** stored in `~/.3dstudio/preferences.json`.
- No database. No cloud. Just files and folders.

---

## 3. Data Model and File Structure

### Project folder structure

```
3d-studio/                            ← Repository root
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   ├── editor/                       ← The editor app (Vite + React + R3F)
│   │   ├── package.json
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.tsx              ← App entry
│   │   │   ├── App.tsx               ← Mode router (Gallery/Studio/Export)
│   │   │   ├── index.css             ← Global styles + design tokens
│   │   │   │
│   │   │   ├── store/
│   │   │   │   ├── sceneStore.ts     ← Zustand: active scene state
│   │   │   │   ├── projectStore.ts   ← Zustand: project metadata, save/load
│   │   │   │   └── uiStore.ts        ← Zustand: UI mode, panel state
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── gallery/
│   │   │   │   │   ├── Gallery.tsx
│   │   │   │   │   ├── SceneCard.tsx
│   │   │   │   │   └── RecentProjects.tsx
│   │   │   │   ├── studio/
│   │   │   │   │   ├── Studio.tsx
│   │   │   │   │   ├── Viewport.tsx        ← R3F Canvas wrapper
│   │   │   │   │   ├── ControlPanel.tsx    ← Right panel container
│   │   │   │   │   ├── ScreenDropZone.tsx
│   │   │   │   │   ├── EnvironmentControls.tsx
│   │   │   │   │   └── CameraControls.tsx
│   │   │   │   ├── export/
│   │   │   │   │   ├── ExportView.tsx
│   │   │   │   │   ├── ExportPreview.tsx
│   │   │   │   │   └── ExportOptions.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── Slider.tsx
│   │   │   │       ├── ColorPicker.tsx
│   │   │   │       ├── Toggle.tsx
│   │   │   │       └── Toolbar.tsx
│   │   │   │
│   │   │   ├── three/                      ← R3F 3D components
│   │   │   │   ├── SceneRenderer.tsx       ← Main R3F scene graph
│   │   │   │   ├── DeviceModel.tsx         ← Loads + renders a device
│   │   │   │   ├── ScreenTexture.tsx       ← Manages screen image → texture
│   │   │   │   ├── SceneLighting.tsx       ← Lights per template config
│   │   │   │   ├── SceneEnvironment.tsx    ← Background + env map
│   │   │   │   ├── CameraRig.tsx          ← Constrained orbit camera
│   │   │   │   └── ShadowPlane.tsx        ← Contact shadow receiver
│   │   │   │
│   │   │   ├── templates/                  ← Built-in scene presets
│   │   │   │   ├── index.ts               ← Template registry
│   │   │   │   ├── hero-iphone.json
│   │   │   │   ├── macbook-perspective.json
│   │   │   │   ├── duo-iphone-ipad.json
│   │   │   │   ├── cascade-triple.json
│   │   │   │   └── flat-lay.json
│   │   │   │
│   │   │   ├── devices/                    ← Device descriptors
│   │   │   │   ├── index.ts
│   │   │   │   ├── iphone-16.json
│   │   │   │   ├── ipad-pro.json
│   │   │   │   └── macbook-pro.json
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── exportBundler.ts        ← Builds self-contained HTML
│   │   │   │   ├── imageProcessor.ts       ← Image loading, sizing, WebP conversion
│   │   │   │   ├── projectIO.ts            ← Save/load project files
│   │   │   │   └── sceneSerializer.ts      ← Scene state ↔ JSON
│   │   │   │
│   │   │   └── types/
│   │   │       ├── scene.ts                ← Core type definitions
│   │   │       ├── device.ts
│   │   │       ├── template.ts
│   │   │       └── project.ts
│   │   │
│   │   └── public/
│   │       ├── models/                     ← GLTF device models
│   │       │   ├── iphone-16.glb
│   │       │   ├── ipad-pro.glb
│   │       │   └── macbook-pro.glb
│   │       ├── envmaps/                    ← HDR environment maps
│   │       │   ├── studio-soft.hdr
│   │       │   └── studio-warm.hdr
│   │       └── thumbnails/                 ← Scene preset preview images
│   │           ├── hero-iphone.webp
│   │           └── ...
│   │
│   └── export-runtime/                     ← Standalone Three.js viewer
│       ├── package.json
│       ├── rollup.config.js
│       ├── src/
│       │   ├── viewer.ts                   ← Main entry: parse scene, render
│       │   ├── loader.ts                   ← GLTF + texture loading
│       │   ├── interaction.ts              ← Constrained orbit + spring
│       │   └── renderer.ts                 ← Three.js setup + render loop
│       └── dist/
│           └── runtime.min.js              ← Built output (~80KB gzipped)
│
├── assets/                                 ← Source assets (not shipped)
│   ├── models-source/                      ← Original high-poly models
│   └── scripts/
│       ├── optimize-models.sh              ← GLTF compression pipeline
│       └── generate-thumbnails.ts          ← Auto-generate preset previews
│
└── docs/
    ├── CONTRIBUTING.md
    ├── adding-scenes.md
    └── adding-devices.md
```

### Core type definitions

```typescript
// ─── Scene Descriptor (the universal contract) ─────────────────

interface SceneDescriptor {
  templateId: string;
  version: number;

  devices: DevicePlacement[];
  environment: EnvironmentConfig;
  camera: CameraConfig;
  interaction: InteractionConfig;
}

interface DevicePlacement {
  deviceId: string;                     // e.g. "iphone-16"
  position: [number, number, number];   // x, y, z
  rotation: [number, number, number];   // euler angles (degrees)
  scale: number;                        // uniform scale
  screen: ScreenConfig;
}

interface ScreenConfig {
  imageUrl: string | null;              // path to screen image
  fitMode: "cover" | "contain";        // how image maps to screen
  brightness: number;                   // 0–1, screen emissive intensity
}

// ─── Environment ────────────────────────────────────────────────

interface EnvironmentConfig {
  background: BackgroundConfig;
  shadow: ShadowConfig;
  lighting: LightingConfig;
}

interface BackgroundConfig {
  mode: "solid" | "gradient";
  color: string;                        // hex
  gradientTo?: string;                  // hex, if gradient mode
  gradientAngle?: number;               // degrees
}

interface ShadowConfig {
  intensity: number;                    // 0–1
  softness: number;                     // 0–1
  opacity: number;                      // 0–1
}

interface LightingConfig {
  mood: number;                         // -1 (cool) to +1 (warm)
  ambientIntensity: number;             // 0–1
  envMapIntensity: number;              // 0–1 (reflection strength)
}

// ─── Camera ─────────────────────────────────────────────────────

interface CameraConfig {
  distance: number;                     // distance from target
  elevation: number;                    // vertical angle (degrees)
  azimuth: number;                      // horizontal angle (degrees)
  fov: number;                          // field of view (degrees)
  target: [number, number, number];     // look-at point
}

// ─── Interaction ────────────────────────────────────────────────

interface InteractionConfig {
  orbitEnabled: boolean;
  orbitRange: number;                   // max degrees of user orbit
  springBack: boolean;                  // return to rest on release
  springStiffness: number;              // spring physics parameter
  springDamping: number;                // spring physics parameter
  autoRotate: boolean;
  autoRotateSpeed: number;              // degrees per second
  hoverParallax: boolean;              // subtle parallax on mouse move
  hoverParallaxIntensity: number;      // 0–1
}

// ─── Device Descriptor ──────────────────────────────────────────

interface DeviceDescriptor {
  id: string;                           // e.g. "iphone-16"
  name: string;                         // "iPhone 16 Pro"
  type: "phone" | "tablet" | "laptop";
  modelFile: string;                    // "iphone-16.glb"
  screenMeshName: string;               // mesh name in GLTF, e.g. "Screen"
  screenAspectRatio: number;            // width / height
  screenResolution: [number, number];   // native px resolution for reference
  defaultMaterial: {
    bodyColor: string;                  // hex
    bodyMetalness: number;
    bodyRoughness: number;
  };
}

// ─── Scene Template ─────────────────────────────────────────────

interface SceneTemplate {
  id: string;                           // e.g. "hero-iphone"
  name: string;                         // "Hero iPhone"
  description: string;                  // "Single floating iPhone, dramatic lighting"
  thumbnail: string;                    // path to preview image
  tags: string[];                       // ["phone", "hero", "single"]

  // The template IS a fully specified SceneDescriptor with defaults
  scene: SceneDescriptor;
}

// ─── User Project ───────────────────────────────────────────────

interface ProjectFile {
  version: number;
  createdAt: string;                    // ISO date
  updatedAt: string;
  name: string;

  templateId: string;                   // which template this extends
  overrides: Partial<SceneDescriptor>;  // only the values the user changed

  screenImages: {                       // maps device index to local filename
    [deviceIndex: number]: string;      // e.g. 0: "screen-1.png"
  };
}

// ─── Export Config ──────────────────────────────────────────────

interface ExportConfig {
  format: "html-interactive" | "html-static" | "png";
  quality: "high" | "balanced";         // affects texture resolution, AA
  width?: number;                       // for static/png export
  height?: number;
  includeInteraction: boolean;
  responsive: boolean;                  // scale to container
  embedAssets: boolean;                 // inline vs external assets
}
```

### Interaction presets (bundled with templates)

```typescript
// Predefined interaction profiles that templates reference

const INTERACTION_PRESETS = {
  "gentle-orbit": {
    orbitEnabled: true,
    orbitRange: 20,               // ±20° from center
    springBack: true,
    springStiffness: 120,
    springDamping: 14,
    autoRotate: false,
    autoRotateSpeed: 0,
    hoverParallax: true,
    hoverParallaxIntensity: 0.3,
  },

  "showcase-spin": {
    orbitEnabled: true,
    orbitRange: 45,
    springBack: true,
    springStiffness: 80,
    springDamping: 12,
    autoRotate: true,
    autoRotateSpeed: 15,          // degrees/sec
    hoverParallax: false,
    hoverParallaxIntensity: 0,
  },

  "subtle-tilt": {
    orbitEnabled: false,
    orbitRange: 0,
    springBack: true,
    springStiffness: 150,
    springDamping: 18,
    autoRotate: false,
    autoRotateSpeed: 0,
    hoverParallax: true,
    hoverParallaxIntensity: 0.5,
  },
} as const;
```

---

## 4. Editor Architecture

### Core canvas/view architecture

The editor viewport is a single `<Canvas>` component from React Three Fiber that fills the left 70% of the Studio mode. It renders the current scene in real time.

```
┌───────────────────────────────────────────────┐
│ <Canvas>                                       │
│  ├── <CameraRig>              ← orbital cam   │
│  ├── <SceneEnvironment>       ← bg + envmap   │
│  ├── <SceneLighting>          ← key/fill/rim  │
│  ├── <ShadowPlane>            ← contact       │
│  │                              shadows        │
│  └── <DeviceGroup>                             │
│       ├── <DeviceModel id="0"> ← GLTF mesh    │
│       │    └── <ScreenTexture> ← user image   │
│       ├── <DeviceModel id="1"> ← (if multi)   │
│       └── ...                                  │
│                                                │
│  ├── <EffectComposer>         ← post effects  │
│  │    ├── <SMAA>              ← anti-aliasing  │
│  │    └── <Bloom>             ← subtle glow    │
│  │                                             │
│  └── <PerformanceMonitor>     ← auto-quality   │
└───────────────────────────────────────────────┘
```

Key design points:

- **No scene graph editor.** The user does not see or interact with a node tree. The scene graph is internal — the user interacts with the visual result.
- **The viewport IS the preview.** There is no separate "render" mode. What you see in the editor is what the export will produce (within the limits of the export runtime).
- **Performance monitor** automatically downgrades quality (lower resolution, fewer shadow samples) on weak hardware.

### Scene graph approach

The scene graph is a **fixed-structure tree** defined by the template, not a user-editable graph. This is the key architectural constraint that keeps things simple.

```
Scene (root)
├── Environment
│   ├── Background (color/gradient — rendered as CSS behind canvas)
│   ├── EnvironmentMap (HDR for reflections)
│   └── Lights[]
│       ├── KeyLight (directional)
│       ├── FillLight (directional, softer)
│       └── RimLight (directional, subtle)
├── ShadowPlane (invisible mesh receiving contact shadows)
└── DeviceGroup (group node, target for camera orbit)
    ├── Device[0]
    │   ├── Body mesh (from GLTF)
    │   └── Screen mesh (from GLTF, textured with user image)
    ├── Device[1] (if applicable)
    └── ...
```

The user **cannot** add nodes, remove nodes, or re-parent nodes. They can only adjust the properties of existing nodes through the control panel (lighting intensity, shadow softness, camera angle, etc.).

### Selection model

**There is no selection model in MVP.**

The user doesn't click on objects in the viewport. All editing happens through the control panel. This eliminates the need for:
- Raycasting and hit testing
- Selection highlights / outlines
- Transform gizmos
- Multi-selection

The viewport is used only for orbit interaction (dragging to rotate the camera). This is a major simplification.

Post-MVP: clicking a device in a multi-device scene could scroll the panel to that device's controls. But even then, no gizmos.

### Property editing model

All editable properties live in the Zustand store and are exposed as controls in the right panel. The data flow is strictly **one-directional**:

```
Panel Control (slider/picker/toggle)
       │
       ▼
Zustand store update (sceneStore.setEnvironment({ mood: 0.3 }))
       │
       ▼
R3F components re-render reactively (useStore selectors)
       │
       ▼
Viewport updates in real time
```

Each control maps to exactly one property in the `SceneDescriptor`. No computed or derived properties. No "apply" button.

### Camera and transform constraints

The camera is implemented as a custom `<CameraRig>` component (not raw OrbitControls) that enforces template-defined limits:

```typescript
interface CameraConstraints {
  minDistance: number;
  maxDistance: number;
  minElevation: number;         // degrees, prevents looking from below
  maxElevation: number;         // prevents going directly overhead
  minAzimuth: number;           // horizontal rotation limit
  maxAzimuth: number;
  enablePan: false;             // always disabled — no panning
  enableZoom: boolean;          // usually disabled in export
  dampingFactor: number;        // smooth deceleration
}
```

In the **editor**, the user has slightly wider orbit range than the export will allow, so they can inspect the scene from more angles. The panel shows the export orbit range as a visual indicator.

Transform constraints on devices: **none exposed to the user.** Devices are positioned by the template and stay there. This is the fundamental constraint that keeps the product focused.

### Undo/redo strategy

**MVP: per-control reset buttons.**

Each control shows a small "reset" icon that restores the template default for that property. Since there are only ~8 controls, this is sufficient.

**Phase 2: simple undo stack.**

```typescript
interface UndoEntry {
  timestamp: number;
  propertyPath: string;         // e.g. "environment.lighting.mood"
  previousValue: any;
  newValue: any;
}

// Zustand middleware captures changes
const useSceneStore = create(
  undoMiddleware(
    (set) => ({
      // ... scene state
    })
  )
);
```

The undo stack is a flat list of property changes with `Cmd+Z` / `Cmd+Shift+Z` support. No branching history.

### Preset system

Templates are loaded from static JSON files at app startup:

```typescript
// templates/index.ts
import heroIphone from './hero-iphone.json';
import macbookPerspective from './macbook-perspective.json';
// ...

export const TEMPLATES: SceneTemplate[] = [
  heroIphone,
  macbookPerspective,
  duoIphoneIpad,
  cascadeTriple,
  flatLay,
];

// Templates are immutable at runtime. User changes are stored as overrides.
```

To **apply** a template:

```typescript
function applyTemplate(template: SceneTemplate): void {
  sceneStore.setState({
    templateId: template.id,
    scene: structuredClone(template.scene),   // deep copy
    overrides: {},                             // fresh start
  });
}
```

### Import flow for new device models (post-MVP)

1. User provides a `.glb` file.
2. App validates: file is valid GLTF, file size < 10MB, contains a mesh named `Screen` (or user maps one).
3. App generates a `DeviceDescriptor` with sensible defaults.
4. Model is copied into the project's device library.
5. User can use the device in compatible scene templates.

Validation is strict to maintain quality. The app should warn or reject models that don't meet minimum standards (vertex count, proper naming).

---

## 5. Web Export Architecture

### What gets exported

```
export-bundle/
├── index.html              ← Self-contained page (or embeddable fragment)
├── scene.json              ← SceneDescriptor (full, resolved — no overrides)
├── runtime.js              ← Minified Three.js viewer (~80KB gzipped)
└── assets/
    ├── device.glb           ← Draco-compressed device model(s)
    ├── screen-0.webp        ← Optimized screen image(s)
    └── env.hdr              ← Compressed environment map (or baked)
```

Alternatively, for **single-file embed** mode:
- All assets are base64-inlined into a single `index.html`
- Larger file (~2-4MB) but zero external dependencies
- Can be dropped anywhere: iframe, static host, email

### Static vs interactive export modes

| Mode | What it produces | Use case |
|------|------------------|----------|
| **Interactive HTML** | Full WebGL scene with orbit + spring-back | Portfolio embed via `<iframe>` |
| **Static PNG** | High-res screenshot of current viewport | Social media, thumbnails, fallback images |

Both modes share the same rendering pipeline. The static export simply captures a frame from the Three.js renderer at a specified resolution.

### How the runtime loads assets

```javascript
// runtime.js (simplified)

async function init(container) {
  // 1. Parse scene descriptor
  const scene = await fetch('./scene.json').then(r => r.json());

  // 2. Set up Three.js renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // 3. Load device model(s) with Draco decoder
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  const gltf = await loader.loadAsync(`./assets/${scene.devices[0].deviceId}.glb`);

  // 4. Apply screen texture
  const screenMesh = gltf.scene.getObjectByName('Screen');
  const texture = await new THREE.TextureLoader()
    .loadAsync(`./assets/screen-0.webp`);
  screenMesh.material.map = texture;
  screenMesh.material.emissive = new THREE.Color(0xffffff);
  screenMesh.material.emissiveMap = texture;
  screenMesh.material.emissiveIntensity = scene.devices[0].screen.brightness;

  // 5. Set up environment, lights, shadows from scene descriptor
  setupEnvironment(threeScene, scene.environment);
  setupLighting(threeScene, scene.environment.lighting);
  setupShadows(threeScene, scene.environment.shadow);

  // 6. Set up camera
  setupCamera(camera, scene.camera);

  // 7. Set up interaction
  const interaction = new ConstrainedOrbit(camera, container, scene.interaction);

  // 8. Render loop
  function animate() {
    requestAnimationFrame(animate);
    interaction.update();
    renderer.render(threeScene, camera);
  }
  animate();
}
```

### How interactions are configured

The `scene.json` contains the full `InteractionConfig`. The runtime reads it and configures:

- **Orbit limits:** `orbitRange` maps to min/max azimuth and elevation on the orbit controller.
- **Spring-back:** When the user releases, the camera smoothly springs back to the rest position using a spring physics simulation.
- **Hover parallax:** On `mousemove`, a subtle rotation is applied to the device group (not the camera) proportional to mouse offset from center.
- **Auto-rotate:** If enabled, a slow continuous azimuth rotation that pauses on user interaction and resumes after a delay.

### How to embed in a portfolio

**Option A: iframe (recommended)**

```html
<iframe
  src="./scene/index.html"
  style="width: 100%; height: 600px; border: none;"
  loading="lazy"
  title="3D device mockup"
></iframe>
```

**Option B: web component (Phase 2)**

```html
<script src="https://unpkg.com/3d-studio-viewer/runtime.min.js"></script>
<three-d-studio
  scene="./scene/scene.json"
  assets="./scene/assets/"
  style="width: 100%; height: 600px;"
></three-d-studio>
```

**Option C: inline embed (single-file mode)**

```html
<!-- Paste entire index.html content directly into your page -->
<div id="scene-container" style="width: 100%; height: 600px;">
  <script>/* inlined runtime + assets */</script>
</div>
```

### How to keep export lightweight

| Technique | Impact |
|-----------|--------|
| Draco GLTF compression | 80-90% model size reduction |
| WebP screen images at 80% quality | 60-70% vs PNG |
| Tree-shaken Three.js build (only used modules) | ~80KB gzipped vs ~200KB full |
| Baked environment instead of HDR | Replace 2MB HDR with 50KB cube texture |
| `devicePixelRatio` capped at 2 | Prevents 4x rendering on Retina |
| Lazy initialization (IntersectionObserver) | Scene only loads when scrolled into view |
| Low-res placeholder → progressive load | Instant visual, then sharp within 1-2s |

**Target total export size: < 1.5MB** (runtime + model + screen image + env map)

---

## 6. Interaction Model for Final Output

### Hover / parallax

- **Desktop:** On `mousemove`, the device group rotates subtly toward the cursor. The rotation is proportional to cursor distance from the container center.
- Mapped as: `rotationX = (mouseY - centerY) / centerY * maxTilt` and `rotationY = (mouseX - centerX) / centerX * maxTilt`.
- `maxTilt` is controlled by `hoverParallaxIntensity` (default: ~3° of rotation).
- Uses `lerp` smoothing so the movement feels organic, not mechanical.

### Drag / pan limits

- **Drag orbit:** User clicks/touches and drags to rotate the camera around the device group.
- **Constrained:** Azimuth limited to `±orbitRange` degrees from the rest position. Elevation limited to `±(orbitRange * 0.5)` degrees (less vertical range feels more natural).
- **No panning.** The camera always looks at the device group center. No translation is allowed.
- **No zoom.** Distance is fixed. Users cannot scroll-to-zoom.

### Tilt behavior

- On drag, the camera orbits around the `CameraConfig.target` point.
- On hover (without drag), the device group tilts relative to cursor position.
- These two systems merge: during drag, hover parallax is suppressed. On release, hover parallax resumes alongside spring-back.

### Easing and spring-back to origin

Spring physics using a simple damped harmonic oscillator:

```typescript
class SpringValue {
  current: number = 0;
  target: number = 0;
  velocity: number = 0;

  update(stiffness: number, damping: number, dt: number): void {
    const force = -stiffness * (this.current - this.target);
    const dampingForce = -damping * this.velocity;
    this.velocity += (force + dampingForce) * dt;
    this.current += this.velocity * dt;
  }
}

// Used for both azimuth and elevation spring-back
const azimuthSpring = new SpringValue();
const elevationSpring = new SpringValue();

// On pointer release:
azimuthSpring.target = restAzimuth;
elevationSpring.target = restElevation;
// Springs animate back smoothly over ~0.5-1s
```

Default spring parameters: `stiffness: 120`, `damping: 14`. These feel snappy but not mechanical. Tunable per template.

### Mobile behavior

| Behavior | Desktop | Mobile |
|----------|---------|--------|
| Hover parallax | Mouse position | **Disabled** (no hover on touch) |
| Orbit | Click + drag | Touch + drag (single finger) |
| Scroll passthrough | N/A | Touch events must not block page scroll. Use a touch threshold: small movements → page scroll, larger movements → orbit. |
| Spring-back | On mouse release | On touch end |
| Auto-rotate | Same | Same, pauses on touch |

**Touch scroll handling:**

```typescript
let startY: number;
let isOrbiting = false;

onTouchStart(e) {
  startY = e.touches[0].clientY;
}

onTouchMove(e) {
  const deltaY = Math.abs(e.touches[0].clientY - startY);
  if (deltaY > 10 && !isOrbiting) {
    // Vertical scroll — let the page scroll
    return;
  }
  // Horizontal or significant movement — orbit
  isOrbiting = true;
  e.preventDefault();
  updateOrbit(e);
}
```

### Accessibility considerations

| Concern | Solution |
|---------|----------|
| Screen reader | The `<canvas>` element gets `role="img"` and an `aria-label` describing the scene: "Interactive 3D mockup of [device] showing [app name]." |
| Keyboard navigation | Arrow keys can orbit within the constrained range. Escape resets to rest. |
| Reduced motion | Respect `prefers-reduced-motion`: disable auto-rotate, disable spring animation (snap instead), disable hover parallax. |
| Color contrast | The exported page includes a configurable background color. The export UI warns if the device blends into the background. |

### Fallback for poor GPU / weak WebGL support

**Tier 1 — WebGL 2 supported:**
Full rendering at `devicePixelRatio` capped at 2.

**Tier 2 — WebGL 1 only:**
Reduced quality: no anti-aliasing, no shadow maps, simplified materials (`MeshPhongMaterial` instead of `MeshStandardMaterial`).

**Tier 3 — No WebGL:**
Render a static PNG fallback image (generated during export). The `<canvas>` is replaced with an `<img>` tag. The export includes this fallback automatically.

```html
<canvas id="scene" aria-label="Interactive 3D device mockup">
  <!-- Fallback for no WebGL -->
  <img src="./assets/fallback.png" alt="3D device mockup" />
</canvas>
```

---

## 7. Installation and Contributor Experience

### Easiest install path for non-technical Mac users

**Phase 1 (before Tauri):** hosted web version. Users open a URL. No install.

**Phase 2 (Tauri):**
1. Download `.dmg` from GitHub Releases or project website.
2. Drag to Applications.
3. Open. macOS Gatekeeper prompt → allow.
4. Done.

The `.dmg` should be **< 15MB** (Tauri + web assets + compressed models).

Code-sign the app with an Apple Developer certificate to avoid Gatekeeper friction. This costs $99/year but is near-mandatory for Mac distribution.

### Easiest local dev setup

```bash
# Prerequisites: Node.js 20+, pnpm
git clone https://github.com/your-org/3d-studio.git
cd 3d-studio
pnpm install
pnpm dev                # starts Vite dev server with hot reload

# That's it. Opens in browser at localhost:5173
```

No native dependencies for the web version. Tauri development adds Rust/Cargo as a requirement, but this is only needed for contributors working on the desktop shell.

### Package management

- **pnpm workspaces** for the monorepo (`editor` + `export-runtime`).
- Lock file committed. CI validates `pnpm install --frozen-lockfile`.
- No global dependencies.

### Asset handling

Device models and environment maps are stored in `public/models/` and `public/envmaps/`. They are:
- **Version-controlled via Git LFS** (models are binary, 1-5MB each).
- **Not npm-published** (they ride along with the git clone, not the package).
- **Optimized at source time** using a script (`pnpm run optimize-assets`) that runs Draco compression and texture optimization.

### Template contribution model

Contributing a new scene template:

1. Fork the repo.
2. Create a new JSON file in `src/templates/`.
3. The JSON references existing device IDs and follows the `SceneTemplate` schema.
4. Add a thumbnail image in `public/thumbnails/`.
5. Register the template in `src/templates/index.ts`.
6. Open a PR. CI validates the JSON schema and renders a preview.

Contributing a new device model:

1. Model must be GLTF 2.0 with a mesh named `Screen`.
2. UV mapping on the `Screen` mesh must be a simple planar projection filling the quad.
3. Run the optimization script to generate a compressed `.glb`.
4. Create a `DeviceDescriptor` JSON file.
5. Open a PR. Maintainers review visual quality.

**Guidelines:**
- Templates must look good with default settings (no "empty/broken" presets).
- Device models must be high-quality (certified by visual review, not just automated checks).
- A `CONTRIBUTING.md` with visual examples and a template JSON annotated with comments.

### How contributors add scenes or devices safely

- **Schema validation:** A JSON Schema for `SceneTemplate` and `DeviceDescriptor`. CI runs `ajv` to validate all JSON files on every PR.
- **Visual regression:** CI renders each template to a PNG and compares against a reference image. If the delta exceeds a threshold, the PR is flagged for manual review.
- **Sandbox preview:** PR descriptions auto-link to a Vercel/Netlify preview deployment where the reviewer can interact with the new template live.

---

## 8. Phased Implementation Plan

### Phase 1: Foundation & MVP Editor
**Duration: 6–8 weeks**

| Aspect | Detail |
|--------|--------|
| **Goal** | A working editor in the browser where you (Farnood) can create a scene that replaces your current Spline embeds. |
| **Features** | 1 scene template (Hero iPhone), 1 device model (iPhone), screen image placement, 4 environment controls, camera orbit in viewport, save/load project JSON, basic export (HTML bundle). |
| **Key decisions** | Vite + React + R3F stack confirmed. Zustand store shape finalized. SceneDescriptor v1 schema locked. Export runtime architecture proven with a manual prototype. |
| **Risks** | Visual quality of the scene may not match Spline initially — lighting, materials, and anti-aliasing need iteration. The export bundle size may exceed targets. |
| **Exit criteria** | You can replace one Spline embed on your portfolio with a 3D Studio export, and the result looks at least 80% as good. The editor runs in the browser with hot reload. The project saves and re-opens. |

**Week-by-week breakdown:**

| Week | Focus |
|------|-------|
| 1 | Project setup (Vite, React, R3F, Zustand). Basic canvas rendering. Load a GLTF device model. |
| 2 | Screen texture mapping. Image drop zone. Device model with screen image rendering correctly. |
| 3 | Scene lighting system (key/fill/rim). Environment map. Shadow plane. Achieve "looks premium" milestone. |
| 4 | Control panel UI: background picker, shadow slider, mood slider, ambient slider. Camera distance/elevation sliders. All controls wired to live viewport. |
| 5 | Camera orbit with constraints. Spring-back physics. Interaction model working in editor. |
| 6 | Export bundler: generates self-contained HTML with vanilla Three.js runtime. Test export in an iframe. |
| 7 | Gallery mode with scene card. Project save/load. Polish: transitions, typography, dark theme. |
| 8 | Bug fixes, performance optimization, your personal portfolio test. |

### Phase 2: Templates, Devices & Export Polish
**Duration: 4–6 weeks**

| Aspect | Detail |
|--------|--------|
| **Goal** | A product with enough variety and export quality to be usable by other designers. |
| **Features** | Add 4 more scene templates (duo, cascade, flat-lay, MacBook perspective). Add iPad and MacBook models. Multi-device scenes with per-device drop zones. Export quality improvements (Draco compression, WebP, lazy loading, fallback image). Static PNG export. |
| **Key decisions** | How multi-device scenes work in the UI. Whether templates are hardcoded or dynamically loaded. |
| **Risks** | Multi-device scenes are significantly more complex (multiple drop zones, per-device positioning). Model quality variance across devices. |
| **Exit criteria** | 5 scene templates, 3 devices, all exports < 1.5MB, PNG fallback works, mobile touch interaction works in export. |

### Phase 3: Open-Source Hardening & Documentation
**Duration: 3–4 weeks**

| Aspect | Detail |
|--------|--------|
| **Goal** | The project is ready for public release on GitHub. |
| **Features** | README, CONTRIBUTING guide, adding-scenes guide, adding-devices guide. JSON schema validation in CI. Visual regression testing. License (MIT or Apache 2.0). Issue templates. Basic project website / landing page. |
| **Key decisions** | License choice. Whether to publish the export runtime as a standalone npm package. How to handle device model licensing (Apple device likenesses). |
| **Risks** | Device model IP — Apple-like device models in an open-source project could face legal concerns. Use generic "smartphone/tablet/laptop" models or clearly label as "inspired by" with original geometry. |
| **Exit criteria** | A designer can clone the repo, run `pnpm dev`, and start using the tool. A contributor can add a template by following the guide and opening a PR. |

### Phase 4: Extensibility & Ecosystem
**Duration: 4–6 weeks**

| Aspect | Detail |
|--------|--------|
| **Goal** | The product supports growth beyond the initial templates. |
| **Features** | Import custom GLTF devices (UI + validation). Tauri desktop app for Mac. Undo/redo. Device swap within scenes. Export as web component (`<three-d-studio>` tag). Community template gallery (curated, not user-generated). |
| **Key decisions** | Tauri integration approach. Web component API design. Template curation process. |
| **Risks** | Custom model import opens quality control problems. Tauri adds build complexity. |
| **Exit criteria** | Mac `.dmg` available. Custom device import works. At least 2 community-contributed templates merged. |

---

## 9. Technical Risks and Tradeoffs

### Biggest technical risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Three.js visual quality gap vs Spline** | Medium | Critical | Spline uses a custom renderer with specific material tweaks. Three.js with proper PBR setup, ACES tone mapping, PMREM environment maps, and PCF soft shadows can match it. Budget time specifically for "visual tuning" — this is not something that happens automatically. |
| **Export bundle size too large** | Medium | High | Three.js tree-shaking is imperfect. Mitigate: build the export runtime from scratch using only the Three.js modules you need (WebGLRenderer, PerspectiveCamera, GLTFLoader, etc.). Manual imports, not `import * as THREE`. |
| **Spring-back physics feel wrong** | Low | Medium | The spring simulation is simple math, but the *feel* requires iteration. Budget 1-2 days just for tuning spring constants with your actual scenes. |
| **GLTF model screen UV mapping issues** | Medium | Medium | The screen texture mapping depends on correct UV coordinates on the screen mesh. Each device model must be validated. Write a test that loads each model and verifies the Screen mesh exists with valid UVs. |
| **Cross-browser WebGL inconsistencies** | Low | Medium | Test on Safari (WebKit), Chrome, and Firefox. Safari has historically lagged on WebGL features. Stick to WebGL 2 baseline, no WebGPU yet. |

### Likely performance bottlenecks

| Bottleneck | Where | Solution |
|------------|-------|----------|
| Shadow map rendering | Every frame | Use `ContactShadows` from Drei (baked, not real-time shadow maps). Much cheaper and often looks better for ground-plane shadows. |
| High-DPI rendering | Retina displays | Cap `devicePixelRatio` at 2. Use SMAA instead of MSAA (cheaper on fill-rate limited devices). |
| GLTF loading time | Initial load | Use Draco compression. Show a loading spinner with progress. Cache models in memory once loaded. |
| Large screen textures | Texture upload | Resize user images to maximum 2048×2048 before creating textures. Use WebP format in export. |
| Animation frame budget | Render loop | Target 60fps. If a frame exceeds 16ms, R3F's `<PerformanceMonitor>` reduces quality automatically. |

### Where 3D complexity could explode

1. **Custom materials per device.** If users can change device color, metalness, roughness — you need a material editor. Don't.
2. **Freeform device positioning.** If users can drag devices in 3D space — you need transform gizmos, snapping, alignment tools. Don't.
3. **Multiple camera angles / saved views.** If users can save camera positions and switch between them — you're building camera management. Don't.
4. **Reflection probes.** If you try to get perfect reflections on device screens showing the environment — this requires real-time environment capture or planar reflections, both expensive. Use a simple emissive screen material instead.

### What to simplify early

| Decision | Simplified approach |
|----------|-------------------|
| Shadow system | Use Drei `<ContactShadows>` (pre-blurred, raycast-based). Not real-time shadow maps on every light. |
| Anti-aliasing | SMAA post-processing. Not MSAA (expensive on some GPUs). |
| Environment reflections | Pre-filtered PMREM environment map. Not screen-space reflections. |
| Screen material | Emissive + diffuse map. Not a separate PBR material with roughness/metalness on the screen glass. |
| Background | CSS behind a transparent canvas. Not a 3D skybox or gradient shader. |

### What to keep opinionated instead of customizable

| Area | Opinionated choice | Why not customizable |
|------|--------------------|--------------------|
| Device materials | Baked in GLTF, not editable | Material editing is a complexity black hole |
| Light count and type | Template-defined, 2-3 lights | Adding/removing lights requires 3D knowledge |
| Shadow type | Contact shadows only | Real-time shadow maps are a performance variable |
| Post-processing | SMAA + optional subtle bloom | Letting users add effects = infinite permutations |
| Interaction spring constants | Template default, adjustable via 1 slider | Exposing stiffness + damping separately is too technical |
| Camera FOV | Fixed per template (35-50°) | FOV changes are disorienting to non-3D users |

---

## 10. Final Recommendation

### The final stack

```
┌─────────────────────────────────────────────────────┐
│  App Shell        Vite (dev) → Tauri (distribution) │
│  Frontend         React 19 + TypeScript             │
│  3D Engine        Three.js via React Three Fiber    │
│  3D Helpers       @react-three/drei                 │
│  Post-processing  @react-three/postprocessing       │
│  State            Zustand                           │
│  Styling          Vanilla CSS (dark theme tokens)    │
│  Assets           GLTF 2.0 + Draco + WebP          │
│  Export runtime   Vanilla Three.js (Rollup bundle)  │
│  Package mgr      pnpm workspaces                   │
│  GLTF pipeline    gltf-transform CLI                │
│  Type checking    TypeScript strict mode             │
│  Linting          ESLint + Prettier                  │
└─────────────────────────────────────────────────────┘
```

### The MVP implementation approach

1. **Week 1-2:** Get a single iPhone model rendering in an R3F canvas with a screen texture. Make it look good — this is the entire product in a microcosm.
2. **Week 3-4:** Add lighting, shadows, environment. Build the first "Hero iPhone" scene preset that looks premium. Iterate on visual quality until you'd be proud to embed it in your portfolio.
3. **Week 5-6:** Build the editor UI around the scene: control panel with the 8 sliders, image drop zone, camera orbit. Wire everything to Zustand.
4. **Week 7:** Build the export bundler. Generate a self-contained HTML file. Test it in an iframe on your actual portfolio site.
5. **Week 8:** Gallery mode, project save/load, polish pass. Ship yourself a working version.

### The fastest credible path to version 1

Focus on a **single scene** end-to-end. Don't build 5 templates before the first one is perfect.

The milestone sequence is:

```
Scene renders beautifully → Screen texture works → Controls work → Export works → Gallery exists → Save/load works
```

Not:

```
Gallery built → Multiple templates → Controls designed → Export planned → Scene rendering started
```

**Start from the output and work backwards.** The first thing you build should be an HTML file with a spinning iPhone that has your screenshot on the screen and looks stunning. Then build the tool that generates it.

### The one architectural mistake to avoid

> **Do not build two separate renderers prematurely.**
>
> It will be tempting to build the export runtime (vanilla Three.js) in parallel with the editor (R3F). Don't. Build everything in R3F first. Extract the export runtime only when the scene quality and interaction model are proven. The export runtime is a *translation* of what R3F already does — it should be derived, not independently designed.
>
> Until Phase 1 is complete, export can simply be an iframe pointing at the editor in "preview mode" (panel hidden, interaction constrained). A proper standalone runtime is a Phase 1 exit criterion, but the visual quality and interaction design should be validated in R3F first.

---

*This architecture serves the product strategy: narrow, opinionated, premium-by-default. It's designed so that the first thing you build is the thing that matters most — a beautiful 3D scene with your UI on the screen. Everything else is infrastructure to make that scene editable and exportable.*
