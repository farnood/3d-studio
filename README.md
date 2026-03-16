# 3D Studio

3D Studio is a Vite + React + Three.js scene editor for quickly assembling polished device mockups. It ships with a small template gallery, a live studio viewport, and a one-click HTML export path for standalone embeds.

## What It Does

- Browse starter templates for iPhone, iPad, and MacBook hero scenes.
- Swap in a screen image with drag and drop.
- Tweak materials, lighting, camera, and interaction settings in the studio panel.
- Save and reopen `.3dstudio` project files.
- Export the current scene as a self-contained Three.js HTML file.

## Project Structure

- `src/components/gallery`: template selection UI.
- `src/components/studio`: editing workflow and controls.
- `src/components/export`: export screen.
- `src/three`: Three.js scene composition and device rendering.
- `src/store`: Zustand state for UI and scene editing.
- `src/templates`: built-in starter scenes.
- `src/lib`: export, persistence, and browser utility helpers.

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
npm run preview
```

## Open Source

- Source code license: MIT. See [LICENSE](./LICENSE).
- Bundled device model assets keep their original licenses. See [public/models/ATTRIBUTION.md](./public/models/ATTRIBUTION.md).

## Current Notes

- Project save files intentionally strip session-local `blob:` URLs for imported custom GLTF models. Those models can be used during the current session, but they must be re-imported after reopening a saved project.
- The production build currently emits a large `Viewport` chunk warning because the interactive editor pulls in most of the Three.js stack at once. The app still builds successfully.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Three.js
- React Three Fiber / Drei
- Zustand
