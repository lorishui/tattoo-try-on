import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { asset, MIN_SKIN_RATIO } from "../presets";
import {
  bodySurface,
  categoryAlpha,
  makeCanvas,
  softenSkinMask,
} from "./image";

let engine: Promise<ImageSegmenter> | null = null;
async function getEngine() {
  if (!engine)
    engine = (async () => {
      const files = await FilesetResolver.forVisionTasks(asset("wasm"));
      return ImageSegmenter.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: asset("models/selfie_multiclass_256x256.tflite"),
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })().catch((e) => {
      engine = null;
      throw e;
    });
  return engine;
}
export async function detectSkin(image: HTMLImageElement) {
  const segmenter = await getEngine();
  const result = segmenter.segment(bodySurface(image));
  try {
    if (!result.categoryMask) throw new Error("No mask returned.");
    const { data, ratio } = categoryAlpha(
      result.categoryMask.getAsUint8Array(),
    );
    if (ratio < MIN_SKIN_RATIO) throw new Error("No usable skin found.");
    const mask = makeCanvas(
      result.categoryMask.width,
      result.categoryMask.height,
    );
    mask
      .getContext("2d")!
      .putImageData(
        new ImageData(new Uint8ClampedArray(data), mask.width, mask.height),
        0,
        0,
      );
    return softenSkinMask(mask);
  } finally {
    result.close();
  }
}
