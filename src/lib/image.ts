import {
  MAX_DESIGN_WIDTH,
  RENDER_WIDTH,
  RENDER_HEIGHT,
  type Placement,
} from "../presets";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 32_000_000;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
export function validateImage(
  file: Pick<File, "type" | "size">,
): string | null {
  if (!ACCEPTED.includes(file.type)) return "Choose a PNG, JPG, or WebP image.";
  if (file.size > MAX_FILE_BYTES)
    return "This image is too large. Choose a file under 10 MB.";
  if (file.size === 0) return "This file is empty. Choose another image.";
  return null;
}
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
export function localPoint(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
) {
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}
export function rotatedPoint(x: number, y: number, angle: number) {
  const r = (angle * Math.PI) / 180;
  return {
    x: x * Math.cos(r) - y * Math.sin(r),
    y: x * Math.sin(r) + y * Math.cos(r),
  };
}
type Vector = { x: number; y: number };
/** Hit-test the rotated image rectangle; aspect ratios are height / width. */
export function hitTestTattoo(
  point: Vector,
  placement: Placement,
  photoAspect: number,
  designAspect: number,
) {
  // Work in photo-width units so rotated corners remain correct on tall photos.
  const local = rotatedPoint(
    point.x - placement.x,
    (point.y - placement.y) * photoAspect,
    -placement.rotation,
  );
  return (
    Math.abs(local.x) <= placement.size / 2 + 1e-8 &&
    Math.abs(local.y) <= (placement.size * designAspect) / 2 + 1e-8
  );
}
export function scaleFromPointer(
  initialSize: number,
  start: Vector,
  now: Vector,
) {
  // Project onto the original corner direction: preserve aspect and center.
  const lengthSquared = start.x * start.x + start.y * start.y;
  if (lengthSquared < 1) return initialSize;
  return clamp(
    (initialSize * (now.x * start.x + now.y * start.y)) / lengthSquared,
    0.05,
    1.1,
  );
}
export function rotationFromPointer(
  initialAngle: number,
  start: Vector,
  now: Vector,
) {
  if (Math.hypot(now.x, now.y) < 1) return initialAngle;
  const delta =
    ((Math.atan2(now.y, now.x) - Math.atan2(start.y, start.x)) * 180) / Math.PI;
  return Math.round(((((initialAngle + delta + 540) % 360) + 360) % 360) - 180);
}
export function cleanWhitePixels(data: Uint8ClampedArray) {
  // Extract ink by perceptual luminance, preserving existing alpha and color.
  for (let pixel = 0; pixel < data.length; pixel += 4) {
    if (!data[pixel + 3]) continue;
    const luminance =
      0.299 * data[pixel] + 0.587 * data[pixel + 1] + 0.114 * data[pixel + 2];
    const coverage = clamp((235 - luminance) / 145, 0, 1);
    data[pixel + 3] = Math.round(data[pixel + 3] * coverage);
    const darken = Math.min(1, luminance / 90);
    if (data[pixel + 3]) {
      for (let channel = 0; channel < 3; channel++)
        data[pixel + channel] = Math.round(data[pixel + channel] * darken);
    }
  }
  return data;
}
export function categoryAlpha(categories: Uint8Array) {
  const data = new Uint8ClampedArray(categories.length * 4);
  let skin = 0;
  for (let i = 0; i < categories.length; i++) {
    if (categories[i] === 2 || categories[i] === 3) {
      data[i * 4 + 3] = 255;
      skin++;
    }
  }
  return { data, ratio: skin / categories.length };
}
export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (
        !image.naturalWidth ||
        image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS
      )
        reject(new Error("Choose an image under 32 megapixels."));
      else resolve(image);
    };
    image.onerror = () =>
      reject(
        new Error(
          "This image could not be opened. Try another PNG, JPG, or WebP.",
        ),
      );
    image.src = src;
  });
}
export async function readUpload(file: File) {
  const error = validateImage(file);
  if (error) throw new Error(error);
  const url = URL.createObjectURL(file);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
export function prepareTattoo(image: HTMLImageElement, removeWhite: boolean) {
  const factor = Math.min(1, MAX_DESIGN_WIDTH / image.naturalWidth);
  const c = makeCanvas(
    Math.max(1, Math.round(image.naturalWidth * factor)),
    Math.max(1, Math.round(image.naturalHeight * factor)),
  );
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, c.width, c.height);
  if (removeWhite) {
    const pixels = ctx.getImageData(0, 0, c.width, c.height);
    cleanWhitePixels(pixels.data);
    ctx.putImageData(pixels, 0, 0);
  }
  return c;
}
export function bodySurface(image: HTMLImageElement) {
  const canvas = makeCanvas(RENDER_WIDTH, RENDER_HEIGHT);
  const factor = Math.min(
    RENDER_WIDTH / image.naturalWidth,
    RENDER_HEIGHT / image.naturalHeight,
  );
  const width = image.naturalWidth * factor,
    height = image.naturalHeight * factor;
  canvas
    .getContext("2d")!
    .drawImage(
      image,
      (RENDER_WIDTH - width) / 2,
      (RENDER_HEIGHT - height) / 2,
      width,
      height,
    );
  return canvas;
}
export function softenSkinMask(smallMask: HTMLCanvasElement) {
  const mask = makeCanvas(RENDER_WIDTH, RENDER_HEIGHT);
  const context = mask.getContext("2d")!;
  context.filter = "blur(1px)";
  context.drawImage(smallMask, 0, 0, RENDER_WIDTH, RENDER_HEIGHT);
  return mask;
}
export function drawPreview(
  canvas: HTMLCanvasElement,
  body: HTMLImageElement,
  tattoo: HTMLCanvasElement | null,
  placement: Placement,
  mask: HTMLCanvasElement | null,
  before: boolean,
  output: "preview" | "export" = "preview",
) {
  const w = RENDER_WIDTH,
    h = RENDER_HEIGHT;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(bodySurface(body), 0, 0);
  if (!tattoo || before) return;
  const layer = makeCanvas(w, h);
  const ink = layer.getContext("2d")!;
  const width = w * placement.size,
    height = (width * tattoo.height) / tattoo.width;
  ink.save();
  ink.translate(w * placement.x, h * placement.y);
  ink.rotate((placement.rotation * Math.PI) / 180);
  ink.scale(placement.mirror ? -1 : 1, 1);
  ink.globalAlpha = placement.opacity;
  ink.drawImage(tattoo, -width / 2, -height / 2, width, height);
  ink.restore();
  if (mask) {
    ink.globalCompositeOperation = "destination-in";
    ink.drawImage(mask, 0, 0, w, h);
    // The hosted export applies its absolute clip and the final mask pass.
    if (output === "export") ink.drawImage(mask, 0, 0, w, h);
  }
  // Hosted editing shows the transparent ink layer over a native photo;
  // its downloadable result composites that layer with multiply.
  ctx.globalCompositeOperation =
    output === "export" ? "multiply" : "source-over";
  ctx.drawImage(layer, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}
