function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const hex = color.replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return { r, g, b };
  }
  if (hex.length === 6 || hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function parseRgbColor(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const [r, g, b] = match[1]
    .split(',')
    .map((part) => parseFloat(part.trim()))
    .slice(0, 3);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
}

function toLuminanceComponent(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function getReadableTextColor(
  backgroundColor: string,
  dark = '#111111',
  light = '#FFFFFF'
): string {
  const parsed = backgroundColor.startsWith('#')
    ? parseHexColor(backgroundColor)
    : parseRgbColor(backgroundColor);

  if (!parsed) return light;

  const luminance =
    0.2126 * toLuminanceComponent(parsed.r) +
    0.7152 * toLuminanceComponent(parsed.g) +
    0.0722 * toLuminanceComponent(parsed.b);

  return luminance > 0.55 ? dark : light;
}
