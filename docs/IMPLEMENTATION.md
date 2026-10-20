# Initial implementation contract

One page for people comparing tattoo placement before talking to an artist.
Workflow: choose/upload a tattoo design → choose a body photo → adjust → export PNG.

- Desktop: 56px header; viewport-height workspace with tattoo selection first,
  body selection second, and a larger preview. Export stays in its toolbar.
  No marketing hero or duplicate export/footer sections. The sidebar scrolls
  independently on short screens; preview scales to available stage dimensions.
- Mobile: preview and export first, filling the first screen; a visible link
  jumps to the tattoo-first inputs below it. No horizontal overflow at 390px.
- Direct manipulation: drag the selected design in the preview to move it;
  drag any corner to resize proportionally around its center; drag the top
  handle to rotate. Handles also accept arrow keys. Selection controls are
  DOM overlays, so they are never included in exported PNGs. Clicking outside
  the rotated design rectangle or pressing Escape clears selection; clicking
  the design selects it again. Blank photo areas do not move the design.
- Left panel: body/design presets and uploads, white-background cleanup, skin
  masking. Preview toolbar: reset, mirror, original photo. Optional size,
  rotation, opacity and position values are collapsed below the preview.
- States: initial working demo, image decoding, invalid file, model loading,
  skin detected, detection failure/no skin with visible unmasked fallback,
  export success/error. No account, history, payments, or generation API.
- Visuals: pale neutral background, ink text, forest-green accent; real body
  photographs and the canvas are the visual focus; visible labels and focus.
- Processing: canvas compositing and local MediaPipe model/WASM. Uploads stay in
  memory; refresh clears them. Models/assets load from the hosting server.
- Acceptance: unit tests for transforms, image validation and mask/category
  handling; type/build/format checks; existing Chrome desktop/mobile checks for
  presets, real uploads, placement, PNG bytes, masking and failure recovery.

This repository is independent. No ShipAny source, account/API layer, commercial
template components, or Git history is imported. Only explicitly approved body
assets are copied, with source hashes. Model and dependency licenses are separate.

Development branch: `codex/initial-build`. The inherited workflow tool's `start`
check stopped because a fresh repository has no `dev` branch. Work continues on
this local branch. The owner authorized the first public commit and push on
2026-10-20; hosted deployment remains outside this task.

## Hosted rendering baseline

Reimplement the hosted rendering behavior without importing commercial components:
1200 × 1800 reference canvas with contained body photo; design width capped at
1400px; luminance-based white removal (235/90), dark-ink enhancement, preserved
source alpha and 96% default opacity. Use the same body-preset coordinates and
scales, model, CPU delegate, SDK version, 1% minimum skin ratio and 1px mask blur.
Keep the demo's direct controls, local WASM assets and explicit fallback. Test
real PNG exports from both applications using the same uploaded design/body.

The hosted tool has two compositing paths: source-over for editing over a native
photo, and multiply plus a second skin-mask pass for PNG export. Match each path
separately. Do not silently unify them or modify the commercial application.
