/**
 * Color helpers for project badges, blocks and ribbons.
 *
 * Project colors come from `projects.color` (hex, e.g. "#0073EA"). To render
 * them at full saturation with readable text, we compute a relative luminance
 * (WCAG-ish) and pick white or dark ink based on contrast.
 */

/**
 * Parses #RGB or #RRGGBB into [r, g, b] in 0..255. Returns null if invalid.
 */
function parseHex(hex: string): [number, number, number] | null {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return [r, g, b];
}

/**
 * Relative luminance per WCAG 2.1 (0 = black, 1 = white).
 */
function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns "#FFFFFF" for dark backgrounds and the design-system ink for light
 * ones. Threshold ~0.55 so mid-brightness colors (our orange FDAB3D) still get
 * white text, matching Monday.com-style labels.
 */
export function textOn(bg: string): string {
  return luminance(bg) > 0.62 ? "#1F2540" : "#FFFFFF";
}

/**
 * Slightly muted variant for secondary text on a colored background.
 */
export function mutedTextOn(bg: string): string {
  return luminance(bg) > 0.62
    ? "rgba(31, 37, 64, 0.70)"
    : "rgba(255, 255, 255, 0.80)";
}
