/**
 * slitscan pass — the signature 32__OG look. Quantise the frame into a grid of cells; sample the
 * sky at a per-cell vertical offset that drifts over the loop (the venetian-blind reveal), and add
 * a per-row horizontal displacement (the smear). Every time term is a periodic function of the
 * loop phase and every drift cycle count is an integer, so the loop is perfectly seamless and
 * stateless. Reads FBO_A (the sky), renders into FBO_B.
 *
 * v2 opens two axes on top of the classic single-column slit-scan:
 *   • `uHbands` columns → a `cols × rows` grid (`1` reduces exactly to the v1 slit-scan);
 *   • `uClean` → crisp flat cells with drift + smear off;
 *   • `uBlocks`/`uBlocksN` → a square `N × N` mosaic of large pixels.
 * When `uHbands = 1`, `uClean = 0`, `uBlocks = 0` this shader is byte-identical to v1 — that is the
 * contract that keeps every pre-v2 seed's DNA rendering as before (its geometry overlay just
 * activates; see docs/CANON.md).
 */

export const SLITSCAN_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSky;
uniform vec2  uResolution;
uniform float uLoopT;
uniform float uBands;
uniform float uHbands;
uniform float uClean;
uniform float uBlocks;
uniform float uBlocksN;
uniform float uBandPhase;
uniform float uBandDrift;
uniform float uRowDisplace;
uniform float uDriftCycles;

void main() {
  vec2 uv = vUv;

  // Guard the divisors/integer terms in-shader too, so an injected genome (Target B) can never
  // produce a divide-by-zero or a non-integer drift that breaks the seamless loop.
  float driftCycles = max(1.0, floor(uDriftCycles + 0.5));
  bool blocks = uBlocks > 0.5;
  bool clean  = uClean > 0.5;

  // rows = vertical divisions (bands), cols = horizontal divisions (hbands). Blocks forces a square.
  float rows = blocks ? max(1.0, floor(uBlocksN + 0.5)) : max(1.0, floor(uBands + 0.5));
  float cols = blocks ? max(1.0, floor(uBlocksN + 0.5)) : max(1.0, floor(uHbands + 0.5));
  bool grid = cols > 1.5;

  float rowIdx = floor(uv.y * rows);
  float colIdx = floor(uv.x * cols);
  float bandBase = rowIdx / rows;
  float seed = hash11(rowIdx + 1.0);

  // A grid gives each column its own vertical slice (colShift) and drift phase (colPhase) so the
  // cells read as a woven patchwork; both are 0 for a single column → the classic slit-scan.
  float colShift = grid ? (hash11(colIdx + 7.3) - 0.5) * 0.5 : 0.0;
  float colPhase = grid ? hash11(colIdx + 19.7) : 0.0;

  // Per-band vertical drift — integer cycles per loop keeps it seamless. Clean switches it off.
  float drift = clean ? 0.0
    : uBandDrift * sin(TAU * (driftCycles * uLoopT + seed) + (uBandPhase + colPhase) * TAU);

  // Each cell shows a near-flat slice of the gradient at its position. Clean samples the cell
  // centre (a flat colour); distorted bleeds a little in-band gradient back in so bands aren't
  // hard posterisation.
  float yLocal = fract(uv.y * rows) / rows;
  float sy = clean
    ? bandBase + 0.5 / rows + colShift
    : bandBase + mix(0.5 / rows, yLocal, 0.35) + drift + colShift;

  // Per-row horizontal displacement (the smear), also loop-periodic. Off when clean.
  float row = floor(uv.y * uResolution.y);
  float rowN = hash11(row + 3.0) - 0.5;
  float xdisp = clean ? 0.0 : uRowDisplace * rowN * sin(TAU * (uLoopT + seed));

  vec2 samp = vec2(uv.x + xdisp, sy);
  // Reflect at the edges so displaced/offset samples never read the clamp streak.
  samp = abs(samp);
  samp = mix(samp, 2.0 - samp, step(1.0, samp));
  samp = clamp(samp, 0.0, 1.0);

  vec3 col = texture(uSky, samp).rgb;

  // A faint seam of shadow at each cell edge sells the quantisation — horizontal seams always, and
  // vertical seams too once there's more than one column (skipped for cols = 1 so the classic look
  // is untouched).
  float fyr = fract(uv.y * rows);
  float edge = smoothstep(0.0, 0.06, fyr) * smoothstep(0.0, 0.06, 1.0 - fyr);
  if (grid) {
    float fxc = fract(uv.x * cols);
    edge *= smoothstep(0.0, 0.06, fxc) * smoothstep(0.0, 0.06, 1.0 - fxc);
  }
  col *= 0.92 + 0.08 * edge;

  fragColor = vec4(col, 1.0);
}
`;
