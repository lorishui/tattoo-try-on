export type Placement = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  mirror: boolean;
};
export const defaultPlacement = (): Placement => ({
  x: 0.5,
  y: 650 / 1800,
  size: (0.48 * 300) / 1200,
  rotation: 0,
  opacity: 0.96,
  mirror: false,
});
export const RENDER_WIDTH = 1200;
export const RENDER_HEIGHT = 1800;
export const MAX_DESIGN_WIDTH = 1400;
export const MIN_SKIN_RATIO = 0.01;
export const bodyPresets = [
  { id: "back", label: "Back", left: 600, top: 650, scale: 0.48, angle: 0 },
  {
    id: "back-male",
    label: "Back · broad",
    left: 600,
    top: 760,
    scale: 0.42,
    angle: 0,
  },
  {
    id: "upper-arm",
    label: "Upper arm",
    left: 470,
    top: 760,
    scale: 0.34,
    angle: -6,
  },
  {
    id: "forearm",
    label: "Forearm",
    left: 460,
    top: 980,
    scale: 0.28,
    angle: -4,
  },
  { id: "hand", label: "Hand", left: 600, top: 760, scale: 0.2, angle: 0 },
  { id: "wrist", label: "Wrist", left: 520, top: 850, scale: 0.2, angle: -4 },
  {
    id: "shoulder",
    label: "Shoulder",
    left: 500,
    top: 620,
    scale: 0.32,
    angle: -12,
  },
  { id: "thigh", label: "Thigh", left: 470, top: 920, scale: 0.32, angle: 2 },
  { id: "calf", label: "Calf", left: 470, top: 980, scale: 0.28, angle: 2 },
  { id: "ankle", label: "Ankle", left: 500, top: 1120, scale: 0.2, angle: 0 },
];
export function initialPlacement(
  bodyId: string,
  designWidth: number,
): Placement {
  const preset = bodyPresets.find((p) => p.id === bodyId) ?? {
    left: 600,
    top: 760,
    scale: 0.7,
    angle: 0,
  };
  return {
    x: preset.left / RENDER_WIDTH,
    y: preset.top / RENDER_HEIGHT,
    size:
      (preset.scale * Math.min(designWidth, MAX_DESIGN_WIDTH)) / RENDER_WIDTH,
    rotation: preset.angle,
    opacity: 0.96,
    mirror: false,
  };
}
export const designPresets = [
  { id: "botanical", label: "Botanical sprig" },
  { id: "crescent", label: "Celestial moon" },
  { id: "compass", label: "Compass rose" },
];
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const hostedDemo =
  "https://stencilmytattoo.com/try-on-tattoo?utm_source=github&utm_medium=referral&utm_campaign=tattoo_try_on_open_source&utm_content=app_demo";
