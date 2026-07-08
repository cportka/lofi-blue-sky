/**
 * Engine registry — the list of available sky algorithms and how to look one up. Add an engine by
 * importing it and appending to ENGINES; everything else (createSky, the UI switcher) reads from here.
 */

import type { Engine } from './types.js';
import { GENESIS } from './genesis/index.js';
import { BILLOW } from './billow/index.js';

/** All engines, in display order. The first is the default. */
export const ENGINES: readonly Engine[] = [GENESIS, BILLOW];

export const DEFAULT_ENGINE_ID = ENGINES[0]!.id;
export const ENGINE_IDS: readonly string[] = ENGINES.map((e) => e.id);

/** Look up an engine by id, falling back to the default. */
export function getEngine(id?: string): Engine {
  return ENGINES.find((e) => e.id === id) ?? ENGINES[0]!;
}
