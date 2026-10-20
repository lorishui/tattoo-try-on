# Tattoo Try-On

**English** · [简体中文](README.zh-CN.md)

A small, open-source **2D tattoo placement editor**. Bring a body photo and a design,
move the ink until the placement feels right, and save a PNG to discuss with your artist.

[Try the tattoo simulator at stencilmytattoo.com ↗](https://stencilmytattoo.com/try-on-tattoo?utm_source=github&utm_medium=referral&utm_campaign=tattoo_try_on_open_source&utm_content=readme_demo)

The hosted simulator is part of **Stencil My Tattoo**, where you can prepare tattoo
linework and explore designs before testing their placement. This repository focuses
on the placement editor and runs independently, without an account or API key.

![Tattoo placement workspace](docs/workspace.png)

## What you can do

- Start with **10 body-part samples** or upload your own photo.
- Try three original vector designs or upload PNG, JPG, or WebP artwork.
- Drag to position, resize with corner handles, and rotate with the top handle.
- Mirror in the preview toolbar; fine-tune size, rotation, opacity and position below the preview.
- Remove near-white backgrounds from line art and blend ink with the photo.
- Use local skin segmentation to keep ink behind clothing, hair, and background.
- Compare with the original and download a PNG, without a watermark.
- Use keyboard arrows or position sliders as an alternative to dragging.

No camera access, server-side image processing, accounts, credits, analytics, or payment integration.

## Run locally

Use **Node.js 22.12+** and pnpm.

```sh
git clone https://github.com/lorishui/tattoo-try-on.git
cd tattoo-try-on
pnpm install
pnpm dev
```

Open **http://127.0.0.1:4207**. Installing copies MediaPipe's WASM files into
`public/wasm/`; the segmentation model is included in `public/models/`.
If install scripts are disabled, run `node scripts/copy-wasm.mjs` before starting.

```sh
pnpm test          # image validation, coordinate transforms, transparency, masks
pnpm format:check
pnpm build         # TypeScript + production build
pnpm preview       # serve the production build on the same local port
```

`dist/` is a static application. You can host it under a domain or subdirectory.
No hosted deployment for this repository is configured automatically.

## How to use it

1. Pick a sample design or upload a tattoo. Transparent PNGs work best.
2. Choose a sample body or upload a photo with a clear view of the skin.
3. Drag the design directly on the photo. Drag a corner to resize and the top
   handle to rotate. Click outside the design or press **Escape** to hide its
   handles; click the design again to edit. Optional **Fine-tune values** sit below the preview. Focus the canvas
   and use the arrow keys to nudge it; Shift + arrows moves farther.
4. Enable **Keep ink on skin** for clothing/hair occlusion. Detection may take a
   moment on the first photo. If it fails, the app explicitly shows an unmasked
   preview and offers Retry; turn it off for manual placement.
5. Compare using **View original**, then use **Download PNG** in the preview toolbar.

The desktop workspace fits the viewport. On mobile, the preview and export appear
first; **Photos & designs** jumps to the tattoo-first inputs below the preview.

Inputs accept PNG, JPEG, or WebP up to 10 MB and 32 megapixels. SVG **uploads** are
not accepted; the three bundled SVGs are trusted, original project illustrations.
Export uses the hosted tool’s 1200 × 1800 reference frame. Body photos fit inside
that frame without stretching. Designs are capped at 1400px wide before placement.

## Processing and privacy

Uploads are decoded into browser memory. They are not sent to an image service,
saved on a server, or retained in localStorage. Refreshing clears your uploads.
The browser still requests the app, demo assets, WASM runtime and model from the
host serving the application. All runtime assets are same-origin; there is no
runtime CDN dependency or tracking SDK. Initial installation needs internet access.

Canvas 2D handles transforms, alpha masking and multiply compositing. MediaPipe's
Selfie Multiclass model supplies body-skin/face-skin masks. Model files and WASM run
on the device. CPU inference currently runs on the main thread once per photo;
slower devices may briefly pause while detecting skin.

## Limits

This is a **flat photo preview**, not live AR, 3D wrapping, a tattoo stencil, a
physical size measurement, or a prediction of healed ink. Mask edges can be wrong
on very dark/light, covered, cropped or poorly lit skin. The small demo collection
does not represent all bodies or skin tones. Review placement with your tattoo artist.
White-background removal is intended for line art; disable it for light-colored designs.

## Reusing the samples

`public/body-parts/manifest.json` lists dimensions, original-file SHA-256 values and
provenance. These are demo assets supplied by Stencil My Tattoo and approved for
redistribution by its owner. A project generation guide exists, but the specific
provider/model used for each original image was not recorded. They are illustrative
assets, not a clinical dataset or a claim about representative model performance.

The body images are offered under **CC BY 4.0**, to the extent rights are held.
Attribute “Stencil My Tattoo — demo body-part images”, link the license, and identify
modifications. Normal attribution is sufficient; no SEO link or badge is required.
The original SVG designs and newly written application code use the MIT license.
Brand names and logos do not receive a trademark license.

## Project background

This project grew out of work on the tattoo preview experience at
[stencilmytattoo.com](https://stencilmytattoo.com/?utm_source=github&utm_medium=referral&utm_campaign=tattoo_try_on_open_source&utm_content=readme_background).
The independent editor and reusable samples are shared here so developers can
experiment with on-device tattoo placement. Contributions improving accessibility,
mask handling, browser compatibility and additional body samples are welcome.

## Licenses

- New application code, documentation and original design SVGs: [MIT](LICENSE).
- Demo body photos: [CC BY 4.0](public/body-parts/LICENSE.md).
- Google MediaPipe model and WASM/library: Apache 2.0; see [third-party notices](THIRD_PARTY_NOTICES.md).

No ShipAny source, commercial template components, authentication code, payment
code, user images, or history from the original commercial repository is included.

## Rendering compatibility

The hosted Stencil My Tattoo tool is the reference for luminance-based ink
extraction, 96% default opacity, body-preset transforms and the 1200 × 1800 output.
Both use MediaPipe Tasks Vision 1.0.1 with the same CPU model, a 1% skin threshold
and a 1px mask feather. The demo keeps its runtime files local.

Editing uses the hosted preview’s normal transparent-layer compositing. PNG
export uses its multiply blend and final mask pass. Consequently, preview and
export can differ in color, as they do in the hosted tool. The demo uses native
Canvas rather than Fabric; fine edges may differ due to rasterization. See
[the actual comparison results](docs/RENDER_PARITY.md) for tested scope.

## More projects

Another project from the same maker: [Burning Bridges Studio](https://burningbridgesstudio.com/).
