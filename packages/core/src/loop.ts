/**
 * Seamless-loop phase manager.
 *
 * The engine never hands raw wall-clock time to the shaders — it hands a normalised loop phase
 * `loopT ∈ [0, 1)`. Every time-varying term in the stateless modes is a periodic function of
 * `loopT` (sin/cos of integer multiples of TAU·loopT), so the frame at `loopT = 0` is identical to
 * the frame approaching `loopT = 1` and the video export loops with no seam. See docs/DETERMINISM.md
 * §"Seamless loop".
 */

export const TAU = Math.PI * 2;

export interface LoopClock {
  /** Normalised phase in [0, 1). */
  loopT: number;
  /** How many whole loops have elapsed since t = 0. */
  cycle: number;
}

/** Normalised loop phase in [0, 1) for a given wall-clock time. */
export function loopPhase(timeSeconds: number, loopSeconds: number): number {
  const s = loopSeconds > 0 ? loopSeconds : 1;
  const p = (timeSeconds % s) / s;
  return p < 0 ? p + 1 : p;
}

/** Full clock (phase + whole-loop count). */
export function loopClock(timeSeconds: number, loopSeconds: number): LoopClock {
  const s = loopSeconds > 0 ? loopSeconds : 1;
  return { loopT: loopPhase(timeSeconds, s), cycle: Math.floor(timeSeconds / s) };
}

/**
 * A smooth [0,1] envelope that returns to 0 at both ends of the loop — handy for effects that
 * should breathe in and out once per loop without a seam.
 */
export function loopEnvelope(loopT: number): number {
  return 0.5 - 0.5 * Math.cos(TAU * loopT);
}
