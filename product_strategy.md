# 3D Studio — Product Strategy & UX Direction

---

## 1. Product Definition

**3D Studio** is a focused, local-first Mac app that lets product designers create premium 3D device mockup scenes — phones, tablets, laptops — place their UI screenshots onto screens, adjust lighting and composition through guided controls, and export the result as embeddable, interactive web components for use in portfolios and case studies. It replaces the need for Spline, Blender, or any general-purpose 3D tool by doing one job exceptionally well: turning flat screen designs into polished, interactive 3D presentations.

### Primary User

**You.** A senior product designer who builds portfolio case studies and needs realistic, interactive 3D device scenes to present UI work. You are not a 3D artist. You don't want to learn nodes, materials graphs, or physics engines. You want to drop in a screenshot, pick a scene, tweak the vibe, and ship it.

### Secondary User

**Design-literate makers** — independent designers, small design teams, and developers building personal sites — who want the visual quality of a Spline scene without the subscription cost or learning curve. These are people who would find an open-source, self-hostable 3D presentation tool deeply appealing.

### Main Jobs to Be Done

| # | Job |
|---|-----|
| 1 | **Present my UI work in context** — I need to show my designs on realistic devices so viewers understand scale, platform, and craft quality. |
| 2 | **Create a compelling scene quickly** — I want a polished 3D composition in minutes, not hours. Starting from a good default, not a blank canvas. |
| 3 | **Embed interactive 3D in my portfolio** — I need the scene to be interactive on the web (subtle pan/tilt, hover, spring-back) and lightweight enough for a portfolio page. |
| 4 | **Reuse and iterate** — I want to save scene configurations and swap screens for new projects without rebuilding the entire composition. |
| 5 | **Own my toolchain** — I want a tool I control, that doesn't break with a pricing change, and that I can extend or contribute to. |

### Unique Value Proposition

> The fastest path from a UI screenshot to a premium, interactive 3D device scene — with zero 3D knowledge required.

Where Spline is a general-purpose 3D design tool that *can* do device mockups, 3D Studio is a device-mockup tool that *only* does device mockups — and does them better, faster, and for free.

---

## 2. What This Product Should and Should Not Be

### What it must do very well

- **Premium out-of-the-box scenes.** Predefined scenes should look *at least* as good as a mid-tier Spline project. Lighting, shadow softness, device material fidelity, and camera angle need to feel designer-curated, not "default 3D engine."
- **Effortless screen placement.** Drag-and-drop an image onto a device. It maps correctly, handles aspect ratios intelligently, and looks right immediately. No UV mapping. No texture slots.
- **Guided composition.** Users adjust a small number of meaningful sliders (camera distance, tilt angle, shadow intensity, background tone) rather than manipulating raw transform values.
- **Lightweight, interactive web export.** The exported artifact must be a self-contained web component or embed snippet that loads fast and provides the subtle interactivity (constrained orbit, spring-back) that makes a portfolio feel alive.
- **Beautiful, modern UI.** The app itself must feel like a premium design tool — dark, typographically refined, spatially considered. If the tool doesn't look good, no designer will trust it to produce good output.

### What it should intentionally NOT try to do

- **Be a general 3D editor.** No freeform mesh editing, no boolean operations, no sculpting, no rigging.
- **Support arbitrary 3D content creation.** Users should not be building logos, icons, abstract shapes, or animated characters. The domain is *device mockup scenes only.*
- **Offer a visual scripting or interaction layer.** No Spline-style state machines, no event wiring, no scroll-triggered animation graphs. Interactivity is baked into scene templates (orbit, spring-back, hover response) and configurable through simple toggles, not authored from scratch.
- **Replace Figma, Sketch, or any 2D tool.** This is a presentation-layer tool. It consumes finished UI screenshots, it doesn't help you design them.
- **Try to be collaborative or cloud-first.** V1 is local, single-user, file-based. Cloud sync, multiplayer, and team features are scope poison at this stage.

### What would make it drift into a bad clone

| Drift signal | Why it's dangerous |
|---|---|
| Adding a node-based material editor | You're now building a worse Blender. |
| Adding animation timelines | You're now building a worse Spline. |
| Supporting arbitrary GLTF import for non-device objects | The scene library becomes unpredictable; quality drops. |
| Adding text, shapes, or 2D overlays in the 3D scene | You're building a 3D Canva. Focus is lost. |
| Building a component/variant system | You're designing a design tool, not a presentation tool. |
| Letting users create scenes from scratch | Blank canvas = complexity explosion. Always start from a template. |

---

## 3. MVP Scope

### The smallest version that still feels compelling

A designer opens the app, picks a scene preset (e.g., "Floating iPhone — Hero Shot"), drops a screenshot onto the device screen, tweaks background color and shadow softness, previews the interactive result, and exports an embeddable HTML snippet. Total time: under 5 minutes.

### Must-have features (MVP)

| # | Feature | Notes |
|---|---------|-------|
| 1 | **3–5 curated scene presets** | e.g., Single device hero, two-device composition, three-device cascade. Each preset includes camera, lighting, device position, and interaction behavior. |
| 2 | **3 device models** | iPhone (latest), iPad, MacBook. High-quality, accurate geometry and materials. |
| 3 | **Screen image placement** | Drag-and-drop image onto device. Auto-fit with aspect-ratio-aware scaling. Support PNG, JPG, WebP. |
| 4 | **Environment controls** | Background color/gradient picker. Shadow intensity slider. Ambient light warmth/coolness. A single "mood" control that shifts the entire lighting feel. |
| 5 | **Camera controls** | Constrained orbit (drag to rotate within limits). Camera distance slider. Tilt/elevation slider. Reset to default button. |
| 6 | **Interactive preview** | Live in-app preview of the final interactive behavior: user drags, device tilts, spring-back on release. |
| 7 | **Web export** | Export as a self-contained HTML file (or HTML + JS bundle) that can be embedded via `<iframe>` or dropped into a static site. Must include: WebGL/Three.js rendering, constrained orbit interaction, spring-back, responsive sizing. |
| 8 | **Scene save/load** | Save scene as a local project file. Re-open and edit later. |

### Nice-to-have but NOT MVP

| Feature | Why it can wait |
|---------|----------------|
| Import custom GLTF device models | Useful, but the built-in 3 devices cover 90% of designer needs. |
| Scene template library / community scenes | Requires infrastructure. Ship with built-in presets first. |
| Multiple devices in a single scene with independent screen images | Compositionally powerful, but adds significant UI complexity. MVP can start with presets that have fixed device counts. |
| Video/GIF export | Web embed is the primary output. Static/video export is secondary. |
| Figma plugin or integration | Distribution channel, not core product. |
| Undo/redo | Important for polish, but the control surface is so small that reset-to-default per control is sufficient for MVP. |

### What should be cut to keep it shippable

- Custom interaction authoring (scroll triggers, state machines, hover events)
- Animation timeline or keyframe system
- Material editing on devices (no changing phone color, bezel material, etc.)
- Multi-device scene *building* (MVP uses fixed-composition presets; the user doesn't place devices in 3D space)
- Cloud storage, accounts, sharing
- Collaborative editing
- Plugin system

---

## 4. UX Concept

### Main screens

The app has **three modes**, not screens. The user flows through them linearly but can jump back at any point.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   GALLERY    │────▶│   STUDIO    │────▶│   EXPORT    │
│  Pick scene  │     │  Edit scene │     │  Preview &  │
│              │     │             │     │  export     │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### Mode 1 — Gallery

- Full-screen grid of scene presets, each shown as a live 3D thumbnail (slowly rotating).
- Each preset has a name, a short description, and device count/type badges.
- Clicking a preset opens it in Studio.
- A "Recent Projects" section at the top for returning to saved work.
- Feels like: Apple TV's movie picker or Notion's template gallery. Spacious, visual, low-friction.

#### Mode 2 — Studio

The core editing environment. Layout:

```
┌─────────────────────────────────────────────┐
│  Toolbar (minimal)             [Preview] [⚙] │
├───────────────────────────┬─────────────────┤
│                           │                 │
│                           │   Panel         │
│      3D Viewport          │   (contextual)  │
│      (interactive)        │                 │
│                           │                 │
│                           │  ┌───────────┐  │
│                           │  │ Screen    │  │
│                           │  │ Image     │  │
│                           │  │ drop zone │  │
│                           │  ├───────────┤  │
│                           │  │ Environ-  │  │
│                           │  │ ment      │  │
│                           │  ├───────────┤  │
│                           │  │ Camera    │  │
│                           │  └───────────┘  │
├───────────────────────────┴─────────────────┤
│  Status bar                                  │
└─────────────────────────────────────────────┘
```

- **Left ~70%:** Live 3D viewport. The user can orbit (constrained) by dragging. This is both the editing view and a preview of what the exported scene will feel like.
- **Right ~30%:** A single contextual panel with collapsible sections. Not tabs. Not multiple panels. One column, scrollable, always visible. Sections:
  - **Screen Image** — drop zone + fit controls
  - **Environment** — background, shadows, lighting mood
  - **Camera** — distance, tilt, orbit limits
  - **Scene Info** — preset name, device type (read-only in MVP)

#### Mode 3 — Export

- Side-by-side: interactive preview on the left, export options on the right.
- Export options: download HTML embed, copy embed code, download as image (screenshot of current view).
- Preview shows exactly what the embed will look and feel like, in an iframe-like sandbox.

### Primary editing flow

1. **Pick a scene** from the Gallery.
2. **Drop a screenshot** onto the device in the right panel. The viewport updates immediately.
3. **Tweak the environment** — adjust 2–4 sliders. Every change is live in the viewport.
4. **Adjust camera** — drag in the viewport or use the panel sliders.
5. **Preview** — tap the Preview button; the panel collapses and the viewport goes full-width, simulating the embed experience.
6. **Export** — tap Export; choose format; done.

### How users pick a scene

Gallery mode. Visual grid. No dropdowns, no lists. Each preset is a rich, slowly-rotating 3D card. Click to select. This is the *first thing* the user sees, and it sets the tone: "this tool gives you beautiful results."

### How users assign a device

In MVP, the device is fixed per scene preset (e.g., "Hero iPhone," "MacBook + iPad Duo"). The user doesn't pick a device separately — the scene *is* the device choice. This is intentional: it keeps the decision space small and ensures every scene preset is visually curated.

Post-MVP: a device-swap dropdown appears in the panel, letting users change the device within a compatible scene.

### How users place screen images

- A prominent drop zone in the right panel (dashed border, clear "Drop image here" label).
- Drag a file from Finder → drop on the zone → image maps to the device screen instantly.
- Alternatively: click the zone to open a file picker.
- The image auto-scales to fit the device screen. If the aspect ratio doesn't match, the app either letterboxes or crops-to-fit (user toggles between the two).
- For multi-device presets (post-MVP): each device has its own labeled drop zone.

### How users adjust environment and composition

The right panel has three sections, each with a minimal set of controls:

**Environment**
| Control | Type | What it does |
|---------|------|--------------|
| Background | Color picker + gradient toggle | Sets scene background |
| Shadow | Slider (0–100) | Controls shadow intensity/softness |
| Mood | Slider (cool ← → warm) | Shifts lighting color temperature globally |
| Ambient | Slider (dim ← → bright) | Overall scene brightness |

**Camera**
| Control | Type | What it does |
|---------|------|--------------|
| Distance | Slider | Zoom in/out |
| Elevation | Slider | Camera height angle |
| Orbit range | Slider | How much the user can rotate in the exported scene |
| Auto-rotate | Toggle | Slow continuous spin in export |

That's it. No more than ~8 controls total. Every control has a visible default and a reset button.

### How they preview and export

- **Quick preview:** A button in the toolbar collapses the panel and shows the viewport full-bleed, with a subtle browser-chrome overlay to simulate "this is what it looks like embedded."
- **Export:** Opens the Export mode. Left side: live interactive preview. Right side: export options (download HTML, copy snippet, screenshot PNG).

---

## 5. UX Principles

### 1. Curated starting points over blank canvases
Never show an empty viewport. Every interaction begins from a beautiful, opinionated default. The user's job is to *refine*, not *construct*.

### 2. Constrained freedom over unlimited control
Expose 8 sliders, not 80. Every control maps to a visually meaningful change. If a parameter requires 3D knowledge to understand, hide it.

### 3. Premium defaults over deep customization
The built-in scenes, lighting, and materials should look stunning with zero adjustment. Customization exists to *personalize*, not to *fix*.

### 4. Direct manipulation over inspector panels
The viewport is the primary input surface. Drag to orbit, drop to place. The side panel exists to fine-tune, not to be the main interaction model.

### 5. Live feedback over apply-and-wait
Every slider, every toggle, every drag updates the viewport in real time. There are no "render" or "apply" buttons. The viewport *is* the result.

### 6. One clear path over multiple workflows
Gallery → Studio → Export. There is one way to do things. This isn't a limitation — it's a gift to the user. Decision fatigue is the enemy.

### 7. Finished artifacts over raw assets
The export is not a GLTF file or a Three.js project. It's a ready-to-embed interactive scene. The user should never need to write code to use the output.

### 8. Calm density over visual noise
The UI should be spacious and quiet. Dark backgrounds, subtle borders, restrained color. The 3D viewport is the hero — the chrome should recede.

### 9. Speed over features
A designer should go from "I have a screenshot" to "I have an embeddable 3D scene" in under 5 minutes. If a feature slows this path, it doesn't ship.

### 10. Tools for designers, not 3D artists
Every label, every metaphor, every default should make sense to someone who has never opened Blender. No "meshes." No "normals." No "ambient occlusion slider." Use language like "shadow softness," "lighting mood," "camera distance."

---

## 6. Risks and Product Critique

### What is strong

- **Painfully clear problem.** You are solving your own problem. The use case is specific, real, and immediately testable.
- **Obvious market gap.** Spline is powerful but expensive and complex. Blender is free but wildly overcomplicated. There is no tool that says: "You're a product designer. Here are beautiful device scenes. Drop your screenshots in and go."
- **Embeddable export is a killer feature.** Most mockup tools produce static images. An interactive, web-embeddable 3D scene is meaningfully differentiated and immediately impressive in a portfolio.
- **Open-source angle is compelling.** Designers are underserved by open-source tools. A beautiful, focused, open-source 3D mockup tool could build genuine community loyalty.

### What is risky

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Visual quality bar.** If the default scenes don't look as good as Spline, the product has no reason to exist. Three.js can match Spline's quality, but it requires serious attention to lighting, materials, and anti-aliasing. | High | Invest heavily in scene crafting. Treat each preset like a design deliverable, not a code demo. |
| **Export file size and performance.** Self-contained WebGL embeds can be heavy (Three.js + device geometry + textures). Slow-loading portfolio embeds defeat the purpose. | High | Use compressed GLTF (Draco), lazy-load textures, tree-shake Three.js aggressively. Target < 2MB total embed size. |
| **Device model quality.** Low-poly or inaccurate device models instantly look cheap. | Medium | Source or commission high-quality device models. Consider Apple's own marketing-reference proportions. |
| **Scope creep into general 3D editing.** Every "small" feature request (custom materials, animation, freeform positioning) pushes toward Spline territory. | High | Hard product boundary: if a feature requires explaining a 3D concept, it doesn't belong. |
| **Mac-only limits adoption.** Open-source community is cross-platform. | Medium | Build on web technologies (Electron or Tauri). Cross-platform is achievable later without a rewrite if the core is web-based. |

### What could make it fail

1. **The scenes don't look premium.** This is a visual product. If the output looks like a Three.js tutorial demo, designers will stay on Spline.
2. **Trying to be too general too soon.** Adding features that serve the "maybe one day" user instead of the "right now" user.
3. **Over-engineering the architecture** before validating the scene quality and export workflow. Spending weeks on plugin systems and extensibility before confirming the core loop works.
4. **Underestimating the craft in device models and lighting.** The app is only as good as its built-in assets. These are not afterthoughts; they are the product.

### What would make it uniquely valuable

- **A library of genuinely beautiful, ready-to-use scenes** that a designer can personalize in minutes. This is the moat. Not the technology — the taste.
- **One-click interactive web export.** No other free tool provides this.
- **Open-source with designer-grade aesthetics.** This combination is extremely rare and would attract a passionate community.

### Biggest scope traps

| Trap | Why it's tempting | Why it's deadly |
|------|-------------------|-----------------|
| "Let users build scenes from scratch" | Feels like it unlocks creativity | Turns the tool into a 3D editor overnight |
| "Support animation and transitions" | Makes scenes more impressive | Requires a timeline, keyframes, easing controls — Spline territory |
| "Add a material editor" | Users will want custom device colors | Opens a complexity Pandora's box |
| "Build a plugin/extension system" | Good for open-source community | Premature abstraction; the core product isn't proven yet |
| "Cloud save and sharing" | Feels modern | Requires infrastructure, auth, hosting — completely orthogonal to the core problem |

---

## 7. Recommendation

### Recommended product direction

Build **a scene-first, device-mockup-only 3D presentation tool** that treats curated scenes as its primary asset and interactive web export as its primary output. Position it as *the* open-source alternative to Spline for product designers who need portfolio-quality 3D mockups. Keep the scope surgically narrow: devices, screens, scenes, export. Nothing else.

### Recommended MVP

| What | Detail |
|------|--------|
| **Scenes** | 3–5 hand-crafted presets (single hero, duo, cascade, flat-lay, perspective grid). |
| **Devices** | iPhone, iPad, MacBook — high-quality models with realistic materials. |
| **Core flow** | Gallery → Studio → Export. One path, no branching. |
| **Controls** | ~8 sliders/pickers total: background, shadow, mood, ambient, distance, elevation, orbit range, auto-rotate. |
| **Output** | Self-contained HTML embed file with interactive constrained orbit + spring-back. |
| **Platform** | Mac-first desktop app (web-technology based for future portability). |
| **File format** | Local project file (JSON + referenced images). |

### The single biggest mistake to avoid

> **Do not build the infrastructure before you build the scenes.**
>
> The first milestone is not "the app runs." The first milestone is "I have 3 scenes that look stunning in a browser, with my screenshots on the device screens, and they feel better than what I had in Spline." If the scenes aren't beautiful, the app surrounding them doesn't matter. Start with the visual output. Build the tool around it.

---

*This document defines the product. The next step is to discuss technical architecture and implementation approach — but only after we agree on what we're building.*
