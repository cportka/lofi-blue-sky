/**
 * Squall palettes — cool, calm sky ramps (the *before*) paired with a hot corruption duo (the
 * cyan/magenta datamosh *bloom* of the `13` reference). Each ramp is sampled bottom (horizon) →
 * top (zenith). The corruption colours are what the signal tears toward when the squall rolls in —
 * curated so the glitch reads as VHS/datamosh, not random RGB. Separate from the other engines'
 * palettes so Squall's key evolves on its own.
 */

export interface SquallPalette {
  id: string;
  name: string;
  sky: Array<[number, string]>; // [t, hex], t: 0 horizon → 1 zenith
  hot: string; // primary corruption bloom (magenta family)
  cold: string; // secondary corruption bloom (cyan family)
}

/** Max sky stops across all Squall palettes (shader array size). */
export const MAX_SQUALL_STOPS = 5;

export const SQUALL_PALETTES: readonly SquallPalette[] = [
  {
    id: 'powder-signal',
    name: 'Powder Signal',
    sky: [[0.0, 'dfeaf0'], [0.45, 'aecbdd'], [1.0, '6f9fc6']],
    hot: 'ff37c6',
    cold: '35e8de',
  },
  {
    id: 'vhs-dusk',
    name: 'VHS Dusk',
    sky: [[0.0, 'e6c1a8'], [0.4, 'b8a2ae'], [0.72, '7c7fa6'], [1.0, '454f78']],
    hot: 'ff2fa0',
    cold: '4fd7e6',
  },
  {
    id: 'teal-carrier',
    name: 'Teal Carrier',
    sky: [[0.0, 'd8ece8'], [0.5, '9fc7c2'], [1.0, '4f8f96']],
    hot: 'f14cd0',
    cold: '2fe0d2',
  },
  {
    id: 'storm-static',
    name: 'Storm Static',
    sky: [[0.0, 'c2c6cc'], [0.5, '9298a4'], [1.0, '5a6472']],
    hot: 'e84cc0',
    cold: '5ce0f0',
  },
  {
    id: 'noon-bleed',
    name: 'Noon Bleed',
    sky: [[0.0, 'cfe6f0'], [0.5, '8fbfe0'], [1.0, '3f78b6']],
    hot: 'ff5ad0',
    cold: '39e6c8',
  },
];

export function getSquallPalette(id: string): SquallPalette | undefined {
  return SQUALL_PALETTES.find((p) => p.id === id);
}
