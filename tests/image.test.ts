import { describe, expect, it } from "vitest";
import {
  defaultPlacement,
  initialPlacement,
  MIN_SKIN_RATIO,
} from "../src/presets";
import {
  hitTestTattoo,
  scaleFromPointer,
  rotationFromPointer,
  categoryAlpha,
  cleanWhitePixels,
  clamp,
  localPoint,
  MAX_FILE_BYTES,
  rotatedPoint,
  validateImage,
} from "../src/lib/image";

describe("safe image inputs", () => {
  it("rejects disguised executable formats and empty files", () => {
    expect(validateImage({ type: "image/svg+xml", size: 100 })).toMatch(/PNG/);
    expect(validateImage({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(
      validateImage({ type: "image/jpeg", size: MAX_FILE_BYTES + 1 }),
    ).toMatch(/large/);
    expect(
      validateImage({ type: "image/webp", size: MAX_FILE_BYTES }),
    ).toBeNull();
  });
});
describe("placement independent of viewport size", () => {
  it("maps a scaled canvas pointer back into normalized image space", () => {
    expect(
      localPoint(170, 360, { left: 20, top: 60, width: 300, height: 600 }),
    ).toEqual({ x: 0.5, y: 0.5 });
    expect(
      localPoint(95, 210, { left: 20, top: 60, width: 150, height: 300 }),
    ).toEqual({ x: 0.5, y: 0.5 });
  });
  it("keeps dragging in bounds", () => {
    expect(clamp(-0.4, 0, 1)).toBe(0);
    expect(clamp(1.4, 0, 1)).toBe(1);
  });
  it("rotates around the design center", () => {
    const p = rotatedPoint(10, 0, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(10);
  });
});
describe("ink and occlusion", () => {
  it("removes white, keeps black and preserves original transparency", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 200, 230, 230, 230, 180, 240, 240, 240, 0,
    ]);
    cleanWhitePixels(pixels);
    expect(pixels[3]).toBe(0);
    expect(pixels[7]).toBe(200);
    expect(pixels[11]).toBe(6);
    expect(pixels[15]).toBe(0);
  });
  it("accepts only body and face skin, excluding hair, clothing and background", () => {
    const mask = categoryAlpha(new Uint8Array([0, 1, 2, 3, 4, 5]));
    expect([...mask.data].filter((_, i) => i % 4 === 3)).toEqual([
      0, 0, 255, 255, 0, 0,
    ]);
    expect(mask.ratio).toBeCloseTo(1 / 3);
  });
});

describe("direct transform handles", () => {
  it("scales proportionally without shifting the center, with safe bounds", () => {
    expect(
      scaleFromPointer(0.3, { x: 30, y: 40 }, { x: 60, y: 80 }),
    ).toBeCloseTo(0.6);
    expect(
      scaleFromPointer(0.3, { x: -30, y: -40 }, { x: -60, y: -80 }),
    ).toBeCloseTo(0.6);
    expect(scaleFromPointer(0.3, { x: 30, y: 40 }, { x: -30, y: -40 })).toBe(
      0.05,
    );
    expect(scaleFromPointer(0.3, { x: 30, y: 40 }, { x: 600, y: 800 })).toBe(
      1.1,
    );
  });
  it("rotates relative to the initial angle and wraps across 180 degrees", () => {
    expect(rotationFromPointer(25, { x: 0, y: -10 }, { x: 10, y: 0 })).toBe(
      115,
    );
    expect(rotationFromPointer(170, { x: 10, y: 0 }, { x: 0, y: 10 })).toBe(
      -100,
    );
    expect(rotationFromPointer(25, { x: 0, y: -10 }, { x: 0, y: 0 })).toBe(25);
  });
});

describe("tattoo selection", () => {
  it("selects inside the design and ignores other parts of the body photo", () => {
    const placement = { ...defaultPlacement(), x: 0.5, y: 0.5, size: 0.2 };
    expect(hitTestTattoo({ x: 0.5, y: 0.5 }, placement, 1.5, 2)).toBe(true);
    expect(hitTestTattoo({ x: 0.59, y: 0.6 }, placement, 1.5, 2)).toBe(true);
    expect(hitTestTattoo({ x: 0.8, y: 0.5 }, placement, 1.5, 2)).toBe(false);
  });
  it("uses the rotated rectangle rather than its larger axis-aligned bounds", () => {
    const placement = {
      ...defaultPlacement(),
      x: 0.5,
      y: 0.5,
      size: 0.2,
      rotation: 90,
      mirror: true,
    };
    expect(hitTestTattoo({ x: 0.68, y: 0.5 }, placement, 1.5, 2)).toBe(true);
    expect(hitTestTattoo({ x: 0.5, y: 0.6 }, placement, 1.5, 2)).toBe(false);
    const diagonal = { ...placement, rotation: 45 };
    expect(hitTestTattoo({ x: 0.69, y: 0.62 }, diagonal, 1.5, 2)).toBe(false);
    expect(hitTestTattoo({ x: 0.5, y: 0.5 }, diagonal, 1.5, 2)).toBe(true);
  });
});

describe("hosted renderer parity", () => {
  it("uses the same luminance ramp, dark-ink enhancement and input alpha", () => {
    const pixels = new Uint8ClampedArray([
      235, 235, 235, 255, 90, 90, 90, 128, 45, 45, 45, 255, 255, 0, 0, 255,
    ]);
    cleanWhitePixels(pixels);
    expect([...pixels]).toEqual([
      235, 235, 235, 0, 90, 90, 90, 128, 23, 23, 23, 255, 216, 0, 0, 255,
    ]);
  });
  it("maps hosted preset coordinates and processed image scale to normalized placement", () => {
    expect(initialPlacement("back", 1024)).toEqual({
      x: 0.5,
      y: 650 / 1800,
      size: (0.48 * 1024) / 1200,
      rotation: 0,
      opacity: 0.96,
      mirror: false,
    });
    expect(initialPlacement("forearm", 2000)).toMatchObject({
      x: 460 / 1200,
      y: 980 / 1800,
      size: (0.28 * 1400) / 1200,
      rotation: -4,
    });
    expect(initialPlacement("upload", 1024).size).toBe((0.7 * 1024) / 1200);
    expect(MIN_SKIN_RATIO).toBe(0.01);
  });
});
