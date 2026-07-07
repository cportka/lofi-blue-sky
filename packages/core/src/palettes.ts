/**
 * Curated colour ramps — the palette DNA.
 *
 * The brief is explicit: never let the RNG pick raw RGB (that is how you get mud). Instead we
 * hand-tune a set of ramps pulled from the reference loops, and the genome picks a ramp then
 * *perturbs* its stops. Each ramp is an ordered gradient sampled by vertical position: `t = 0` is
 * the bottom of the frame (horizon glow) and `t = 1` is the top (zenith). Families mirror the
 * loops that seeded them — Sodium (32__OG sunset), Powder (35 blue sky), Olive (31 mosaic),
 * Periwinkle (dusk). See docs/AESTHETIC.md.
 */

export type PaletteFamily = 'Sodium' | 'Powder' | 'Olive' | 'Periwinkle';

export interface PaletteStop {
  /** Position along the gradient, 0 (bottom / horizon) → 1 (top / zenith). */
  t: number;
  /** Linear-ish sRGB colour, each channel normalised to [0, 1]. */
  c: [number, number, number];
}

export interface Palette {
  id: string;
  name: string;
  family: PaletteFamily;
  stops: PaletteStop[];
}

/** Maximum stops any ramp may declare — the shader receives a fixed-size uniform array. */
export const MAX_STOPS = 6;

function hex(h: string): [number, number, number] {
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function ramp(
  id: string,
  name: string,
  family: PaletteFamily,
  entries: Array<[number, string]>,
): Palette {
  return { id, name, family, stops: entries.map(([t, h]) => ({ t, c: hex(h) })) };
}

/** The curated ramps. Order is stable — `paletteId` indexes into this list. */
export const PALETTES: readonly Palette[] = [
  // --- Sodium: the 32__OG horizontal slit-scan sunset -----------------------------------------
  ramp('sodium-sunset', 'Sodium Sunset', 'Sodium', [
    [0.0, 'f3e7c4'], [0.18, 'e6a752'], [0.34, 'b8562f'],
    [0.52, '8f5a5e'], [0.72, '4a4668'], [1.0, '211d38'],
  ]),
  ramp('sodium-ember', 'Sodium Ember', 'Sodium', [
    [0.0, 'ecd8a6'], [0.22, 'd08a3c'], [0.4, '94371f'],
    [0.6, '5b3244'], [1.0, '17131f'],
  ]),
  ramp('sodium-grey', 'Sodium Striation', 'Sodium', [
    [0.0, 'ded3bc'], [0.25, 'c99a63'], [0.45, '94766a'],
    [0.7, '6e6a6e'], [1.0, '45424c'],
  ]),
  // --- Powder: the 35 datamosh blue sky -------------------------------------------------------
  ramp('powder-blue', 'Powder Blue', 'Powder', [
    [0.0, 'e6ebe6'], [0.3, 'c2d2d6'], [0.6, '9fb8c4'], [1.0, '7c93a6'],
  ]),
  ramp('powder-salmon', 'Powder Salmon', 'Powder', [
    [0.0, 'e8c4b4'], [0.28, 'cdb8b0'], [0.55, 'a9c0c8'], [1.0, '8aa1b0'],
  ]),
  ramp('powder-dawn', 'Powder Dawn', 'Powder', [
    [0.0, 'f0e6da'], [0.3, 'd8c3b8'], [0.55, 'b3b6bd'],
    [0.8, '8f9fb2'], [1.0, '6b83a0'],
  ]),
  // --- Olive: the 31 downsample mosaic --------------------------------------------------------
  ramp('olive-haze', 'Olive Haze', 'Olive', [
    [0.0, 'd8d2b0'], [0.3, 'a9a86e'], [0.55, '7d7f52'],
    [0.78, '8a7d78'], [1.0, '5c5b52'],
  ]),
  ramp('olive-dust', 'Olive Dust', 'Olive', [
    [0.0, 'cfc9a2'], [0.35, '9a9a63'], [0.7, '6f6f4c'], [1.0, '4a4a3c'],
  ]),
  ramp('olive-rose', 'Olive Rose', 'Olive', [
    [0.0, 'ddc9b0'], [0.3, 'b0a074'], [0.55, '94745e'],
    [0.8, '7a6b6e'], [1.0, '51494f'],
  ]),
  // --- Periwinkle: dusk -----------------------------------------------------------------------
  ramp('periwinkle-dusk', 'Periwinkle Dusk', 'Periwinkle', [
    [0.0, 'e2d6d0'], [0.3, 'c0b2c0'], [0.55, '9a94b8'],
    [0.8, '7c7aa4'], [1.0, '57567e'],
  ]),
  ramp('periwinkle-mauve', 'Periwinkle Mauve', 'Periwinkle', [
    [0.0, 'e6d2cc'], [0.28, 'cbaeb4'], [0.5, 'a898b0'],
    [0.75, '8481a6'], [1.0, '5d5b82'],
  ]),
  ramp('periwinkle-slate', 'Periwinkle Slate', 'Periwinkle', [
    [0.0, 'd6d8dc'], [0.3, 'aeb2c2'], [0.6, '8388a6'], [1.0, '565a7e'],
  ]),
];

export const PALETTE_FAMILIES: readonly PaletteFamily[] = ['Sodium', 'Powder', 'Olive', 'Periwinkle'];

export function getPaletteById(id: string): Palette | undefined {
  return PALETTES.find((p) => p.id === id);
}

/**
 * CPU-side ramp sampler (mirrors the GLSL `sampleRamp`) — used by tests and asset tooling to
 * reason about a palette without a GPU. Linear interpolation between the two bracketing stops.
 */
export function sampleRamp(palette: Palette, t: number): [number, number, number] {
  const stops = palette.stops;
  const x = Math.min(1, Math.max(0, t));
  if (x <= stops[0]!.t) return [...stops[0]!.c];
  const last = stops[stops.length - 1]!;
  if (x >= last.t) return [...last.c];
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (x >= a.t && x <= b.t) {
      const f = (x - a.t) / Math.max(1e-6, b.t - a.t);
      return [
        a.c[0] + (b.c[0] - a.c[0]) * f,
        a.c[1] + (b.c[1] - a.c[1]) * f,
        a.c[2] + (b.c[2] - a.c[2]) * f,
      ];
    }
  }
  return [...last.c];
}
