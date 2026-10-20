# Third-party notices

This repository's MIT license covers newly written application code and the three
original sample SVGs. It does not replace third-party licenses.

## React and React DOM

Copyright Meta Platforms, Inc. and affiliates. MIT.
Original notices are preserved in `public/notices/` and included in the static build.

## MediaPipe Tasks Vision and WASM

Copyright Google LLC / MediaPipe Authors. Apache License 2.0.
Package: https://www.npmjs.com/package/@mediapipe/tasks-vision
Source: https://github.com/google-ai-edge/mediapipe
Runtime files are copied from the installed package by `scripts/copy-wasm.mjs`.
The complete Apache license is included at `public/models/LICENSE-APACHE-2.0.txt`.

## Selfie Multiclass segmentation model

Author: Adel Ahmadyan, Google. Model date: May 10, 2023.
License: Apache License 2.0, as stated on page 1 of the official model card:
https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf
Documentation: https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter

Bundled `selfie_multiclass_256x256.tflite` SHA-256:
`c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0`.
It was copied without modification from the source project's Google MediaPipe
model asset. Categories used here: body-skin 2 and face-skin 3.

## Demo images

Body photos supplied by Stencil My Tattoo, with the owner's explicit approval for
this independent public project. See `public/body-parts/LICENSE.md` and
`manifest.json`. The SVG design samples were created for this repository.

Development tools retain their respective licenses; see the pinned lockfile and
the installed packages for Vite, TypeScript, Vitest and Prettier notices.
