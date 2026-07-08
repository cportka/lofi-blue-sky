/**
 * Billow palettes — blue-sky ramps with a cloud colour and an underside tint (the salmon clouds of
 * the `35` reference). Each ramp is sampled bottom (horizon) → top (zenith). Curated, then the
 * genome perturbs; never raw RGB. Separate from the Genesis palettes so each engine's key evolves
 * on its own.
 */

export interface BillowPalette {
  id: string;
  name: string;
  sky: Array<[number, string]>; // [t, hex], t: 0 horizon → 1 zenith
  cloud: string; // lit cloud colour
  tint: string; // warm underside tint
}

export const BILLOW_PALETTES: readonly BillowPalette[] = [
  {
    id: 'day-blue',
    name: 'Day Blue',
    sky: [[0.0, 'dfeaf0'], [0.4, 'a9c8dc'], [0.75, '6f9fc6'], [1.0, '4a7db0']],
    cloud: 'f4f1ea',
    tint: 'e7c3b0',
  },
  {
    id: 'powder-day',
    name: 'Powder Day',
    sky: [[0.0, 'e8eeec'], [0.45, 'c2d6d8'], [1.0, '86a9bd']],
    cloud: 'f6f4ee',
    tint: 'e9cabb',
  },
  {
    id: 'salmon-drift',
    name: 'Salmon Drift',
    sky: [[0.0, 'ecd0c2'], [0.4, 'c8c2cc'], [0.72, '93a6c2'], [1.0, '5f6f9c']],
    cloud: 'f2ece6',
    tint: 'e0a892',
  },
  {
    id: 'storm',
    name: 'Storm',
    sky: [[0.0, 'c2c6cc'], [0.5, '9298a4'], [1.0, '5a6472']],
    cloud: 'e4e2df',
    tint: 'b9a9a6',
  },
  {
    id: 'high-noon',
    name: 'High Noon',
    sky: [[0.0, 'cfe6f0'], [0.5, '8fbfe0'], [1.0, '3f78b6']],
    cloud: 'fbf9f4',
    tint: 'dcc2b4',
  },
  {
    id: 'dusk-blue',
    name: 'Dusk Blue',
    sky: [[0.0, 'e6c1a8'], [0.35, 'b8a2ae'], [0.7, '7c7fa6'], [1.0, '454f78']],
    cloud: 'ece2dc',
    tint: 'd79a86',
  },
];

export const MAX_SKY_STOPS = 4;

export function getBillowPalette(id: string): BillowPalette | undefined {
  return BILLOW_PALETTES.find((p) => p.id === id);
}
