/**
 * slitscan pass — the sky as a grid of cells. Reads FBO_A (the sky gradient), renders into FBO_B.
 * Every time term is a periodic function of the loop phase and every cycle count is an integer, so
 * the loop is perfectly seamless and stateless.
 *
 * Movements (uMovement):
 *   0 · TRUE CLEAN — the sky (~90%). Every cell samples the gradient at its cell CENTRE on both
 *       axes, so the entire bar/pixel is exactly one flat colour that changes as one unit — each
 *       cell on its own phase, like the pixels of a low-res sky video (1×1 → 2×2 → 4×4 → 1×N).
 *   1 · CLEAN SWEEP — flat rows, but the sample keeps the fragment's own x, so the sun-bloom's
 *       horizontal gradient sweeps through the bars (the preserved v3 clean look).
 *   2 · CLASSIC — the original v1 slit-scan: in-band gradient bleed, drift, per-row smear (the
 *       golden-window look of the first canonical picks).
 *   3 · DISTORTED — the venetian-blind smear over the grid geometry.
 */

export const SLITSCAN_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSky;
uniform vec2  uResolution;
uniform float uLoopT;
uniform float uBands;
uniform float uHbands;
uniform float uMovement;
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
  int movement = int(uMovement + 0.5);
  bool blocks = uBlocks > 0.5 && movement != 2; // classic is pure v1: no block mosaic
  float rows = blocks ? max(1.0, floor(uBlocksN + 0.5)) : max(1.0, floor(uBands + 0.5));
  float cols = blocks ? max(1.0, floor(uBlocksN + 0.5))
             : movement == 2 ? 1.0
             : max(1.0, floor(uHbands + 0.5));
  bool grid = cols > 1.5;

  float rowIdx = floor(uv.y * rows);
  float colIdx = floor(uv.x * cols);
  float bandBase = rowIdx / rows;

  // Phase seed: per-ROW for sweep/classic/distorted (bars breathe as bands), per-CELL for true
  // clean (each pixel changes to its own colours, independently).
  float seed = movement == 0 ? hash11(rowIdx + colIdx * 57.0 + 1.0) : hash11(rowIdx + 1.0);

  // A grid gives each column its own vertical slice (colShift) and drift phase (colPhase) so the
  // cells read as a woven patchwork; both are 0 for a single column → the classic bars.
  float colShift = grid ? (hash11(colIdx + 7.3) - 0.5) * 0.5 : 0.0;
  float colPhase = grid ? hash11(colIdx + 19.7) : 0.0;

  // The heartbeat: every cell's colour pulses over the loop — its sample slides up and down the
  // gradient (integer cycles → seamless), so a flat pixel breathes through the sky's colours.
  const float PULSE_GAIN = 1.9;
  float pulse = uBandDrift * PULSE_GAIN
    * sin(TAU * (driftCycles * uLoopT + seed) + (uBandPhase + colPhase) * TAU);

  // Where this fragment samples the sky.
  float yLocal = fract(uv.y * rows) / rows;
  float sx;
  float sy;
  if (movement == 0) {
    // TRUE CLEAN — cell centre on BOTH axes: the whole cell is one flat colour.
    sx = (colIdx + 0.5) / cols;
    sy = bandBase + 0.5 / rows + colShift + pulse;
  } else if (movement == 1) {
    // CLEAN SWEEP — flat row, fragment keeps its own x (the sun-bloom sweeps the bar).
    sx = uv.x;
    sy = bandBase + 0.5 / rows + colShift + pulse;
  } else {
    // CLASSIC / DISTORTED — in-band gradient bleed + the per-row smear.
    float row = floor(uv.y * uResolution.y);
    float rowN = hash11(row + 3.0) - 0.5;
    float xdisp = uRowDisplace * rowN * sin(TAU * (uLoopT + seed));
    sx = uv.x + xdisp;
    sy = bandBase + mix(0.5 / rows, yLocal, 0.35) + colShift + pulse;
  }

  vec2 samp = vec2(sx, sy);
  // Reflect at the edges so displaced/offset samples never read the clamp streak.
  samp = abs(samp);
  samp = mix(samp, 2.0 - samp, step(1.0, samp));
  samp = clamp(samp, 0.0, 1.0);

  vec3 col = texture(uSky, samp).rgb;

  // A faint seam of shadow at each cell edge sells the quantisation on the textured movements.
  // TRUE CLEAN skips it entirely: a pixel is exactly one colour, edge to edge (the seam would
  // posterize into a coloured fringe on a perfectly flat cell).
  if (movement != 0) {
    float fyr = fract(uv.y * rows);
    float edge = smoothstep(0.0, 0.06, fyr) * smoothstep(0.0, 0.06, 1.0 - fyr);
    if (grid) {
      float fxc = fract(uv.x * cols);
      edge *= smoothstep(0.0, 0.06, fxc) * smoothstep(0.0, 0.06, 1.0 - fxc);
    }
    col *= 0.92 + 0.08 * edge;
  }

  fragColor = vec4(col, 1.0);
}
`;
