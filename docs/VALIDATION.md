# Local verification — 2026-10-20

- `pnpm test`: 12 tests passed. Covers image input limits, normalized coordinates,
  white removal, skin categories, proportional corner resizing, rotation wrap
  and hit-testing rotated design rectangles.
- `pnpm build`: TypeScript and production Vite bundle passed.
- `pnpm format:check` and `git diff --check`: passed.
- Existing native Chrome, localhost development server: default skin mask ready;
  preset selection, mirroring, original-photo view, real body/design PNG uploads,
  direct dragging, corner resizing (34% to about 48%) and rotation (0° to 30°).
  Resize/rotation arrow keys changed values to 49% and 31°.
- Precision values are collapsed below the preview; the left panel has only
  image uploads and preview options. Original-photo view hides transform handles.
- Actual PNG downloaded and visually inspected: 1023 × 1537, adjusted ink present,
  selection outline and handles absent. Browser download-event notification timed
  out, but the saved file and UI export confirmation verified completion.
- At a temporary 390 × 844 viewport: page width and scroll width both 390px;
  preview and handles displayed without horizontal overflow. Viewport restored.
- Uploading a non-body design as the body image produced the explicit unmasked
  fallback and Retry button. Back preset then restored a successful skin mask.
- Screenshot: `workspace.png` is the real desktop Chrome view.

Not covered: real touch-device gestures, all body/skin types, prolonged-session
memory usage, and a deployed production server. This is a 2D placement reference.
These checks were recorded on `codex/initial-build` before the first publication.
See Git history for the current publication state. No hosted deployment is configured.

## Compact workspace follow-up

- Removed the marketing hero, version chip, image badge, duplicate export block
  and footer. Download now lives in the preview toolbar.
- Sidebar order matches the hosted workflow: tattoo design, body area, options.
- Native Chrome at 1366 × 768 and 1280 × 720: document height equals viewport
  height; the preview, inputs and export control fit the first screen. The sidebar
  can scroll independently when its secondary content exceeds available height.
- Canvas uses observed stage dimensions and preserves the source aspect ratio.
  Direct dragging still changes normalized position; resizing on the smaller
  canvas changed size from 32% to approximately 42%. Toolbar export succeeded.
- At 390 × 844: complete preview, manipulation handles, download, and the link to
  inputs are visible in the first screen; document width stays 390px. The input
  link opens the tattoo-first section below the preview.
- Expanding precision values keeps the desktop page within its viewport and
  reduces the preview to the remaining space. No real touch device was tested.

## Selection visibility follow-up

- Native Chrome: clicking the photo outside the design or the surrounding stage
  removes all five transform handles; clicking the design restores them.
- Dragging empty photo space leaves placement unchanged. Re-selecting supports
  direct moving, resizing and rotation; a 30-degree rotation and approximately
  44% size were retained through deselection and reselection.
- Escape hides handles; Enter on the focused canvas restores selection.
- The same hide/restore behavior passed at a 390 × 844 viewport; viewport restored.
- `preview-deselected.png` shows the actual clean preview without controls.
- The hosted-site button text is `stencilmytattoo.com`; its destination and UTM
  parameters are unchanged. This check was recorded before initial publication.

## Hosted rendering alignment

- See [RENDER_PARITY.md](RENDER_PARITY.md) for the live production comparison,
  raw-file hashes, image metrics, supported settings and remaining differences.
- Replaced the former simplified white removal and 85% opacity with the hosted
  luminance/ink processing and 96% opacity; preset coordinates/scale/angle,
  1200 × 1800 frame, model runtime, mask threshold and blur are aligned.
- Real exports cover white, color and transparent PNG designs on back/upper-arm
  body photos. Clothing-boundary clipping was also checked in both applications.
- The earlier 1023 × 1537 export record describes the superseded renderer.
  Current PNG exports are 1200 × 1800.
- Rechecked 390px first-screen layout and no-skin fallback after the SDK change.

## First public release preparation

- Added English and Simplified Chinese READMEs with language-switch links,
  the hosted Stencil My Tattoo workflow, and a closing link to Burning Bridges Studio.
- Copied sources into a clean temporary directory without `node_modules`, `dist`
  or generated `public/wasm`. `pnpm install --frozen-lockfile` restored the runtime
  through the automatic postinstall script. Existing pnpm package-store cache was
  reused; this does not prove connectivity from every country or package mirror.
- In that clean directory, 12 tests, TypeScript/Vite build and formatting passed.
- Secrets/path checks found no private keys, embedded tokens, user email or local
  absolute paths in the publication sources/docs. Runtime WASM is generated;
  model and authorized body assets are included directly in Git.
