/**
 * squall pass — a stateless datamosh (the `13` reference). A calm sky ramp that a *squall* of
 * signal corruption sweeps through and clears over the loop. Everything is a periodic function of
 * the loop phase, so it is seamless with no feedback history:
 *
 *   • envelope — raised-cosine bursts, exactly 0 at the loop seam, so the storm builds and clears;
 *   • macroblocks — a coarse grid; a rising fraction go "corrupt" as the envelope climbs;
 *   • motion error — corrupt blocks hold a displaced sample, snapping on a held-frame cadence;
 *   • chroma tear — the R/B channels separate (the cyan/magenta datamosh split);
 *   • bloom — heavily corrupt blocks flood toward the palette's hot/cold corruption duo;
 *   • streak — a horizontal pixel-sort smear inside corrupt blocks.
 *
 * Renders into FBO_A; the shared post pass finishes it (dither / posterize / grain / vignette).
 */

export const SQUALL_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uLoopT;
uniform int   uSkyCount;
uniform float uSkyStops[MAX_SQUALL_STOPS];
uniform vec3  uSkyColors[MAX_SQUALL_STOPS];
uniform vec3  uHot;
uniform vec3  uCold;
uniform float uHorizon;
uniform float uSunX;
uniform float uSunStrength;
uniform float uPulse;
uniform float uPulseCycles;
uniform float uBlocksX;
uniform float uBlocksY;
uniform float uSteps;
uniform float uBursts;
uniform float uSharp;
uniform float uAmount;
uniform float uMotion;
uniform float uTear;
uniform float uBloom;
uniform float uStreak;

vec3 skyRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = uSkyColors[0];
  for (int i = 1; i < MAX_SQUALL_STOPS; i++) {
    if (i >= uSkyCount) break;
    float f = clamp((t - uSkyStops[i - 1]) / max(1e-4, uSkyStops[i] - uSkyStops[i - 1]), 0.0, 1.0);
    c = mix(c, uSkyColors[i], f);
  }
  return c;
}

// The calm sky before corruption — itself a clean grid of flat sky-pixels, each breathing in
// colour over the loop (integer cycles → seamless). This is the "majority clean" base a rare
// squall of datamosh sweeps through.
vec3 baseSky(vec2 uv) {
  vec2 grid = vec2(max(1.0, floor(uBlocksX + 0.5)), max(1.0, floor(uBlocksY + 0.5)));
  vec2 cell = (floor(uv * grid) + 0.5) / grid; // this pixel's cell centre
  float pc = max(1.0, floor(uPulseCycles + 0.5));
  float rseed = hash21(floor(uv * grid) + 1.0); // per-CELL phase — every pixel breathes on its own
  float pulse = uPulse * sin(TAU * (pc * uLoopT + rseed)); // the pixel's colour breathe
  float y = clamp(cell.y + pulse, 0.0, 1.0);
  float warped = y < uHorizon
    ? (y / max(1e-3, uHorizon)) * 0.5
    : 0.5 + (y - uHorizon) / max(1e-3, 1.0 - uHorizon) * 0.5;
  vec3 col = skyRamp(warped);
  float d = cell.y - uHorizon * 0.7;
  float glow = exp(-d * d * 40.0) * uSunStrength;
  float hx = exp(-pow((cell.x - uSunX) * 1.4, 2.0) * 1.2);
  col += skyRamp(0.05) * glow * (0.5 + 0.5 * hx);
  return col;
}

void main() {
  vec2 uv = vUv;

  float steps = max(1.0, floor(uSteps + 0.5));
  float bursts = max(1.0, floor(uBursts + 0.5));

  // Seamless corruption envelope: raised-cosine bursts, 0 at the loop seam, shaped punchy.
  float e = 0.5 - 0.5 * cos(TAU * bursts * uLoopT);
  float env = pow(e, uSharp); // 0 = clear sky .. 1 = full squall

  // Held-frame step index (the datamosh judder). Wraps at the loop end, where env ≈ 0, so the snap
  // is invisible at the seam.
  float stp = mod(floor(uLoopT * steps), steps);

  // Macroblock this fragment falls in.
  vec2 grid = vec2(max(1.0, floor(uBlocksX + 0.5)), max(1.0, floor(uBlocksY + 0.5)));
  vec2 blockId = floor(uv * grid);
  vec2 blockUv = blockId / grid;

  // Is this block corrupt this step? The corrupt fraction rises with the envelope.
  float bh = hash21(blockId + stp * 17.31);
  float corrupt = step(1.0 - env * uAmount, bh);

  // Macroblock motion error — a held displacement for corrupt blocks, snapping each step.
  vec2 mv = vec2(0.0);
  if (corrupt > 0.5) {
    float a = hash21(blockId + stp * 3.7 + 1.3);
    float b = hash21(blockId + stp * 9.1 + 5.9);
    mv = (vec2(a, b) - 0.5) * uMotion * (0.5 + 0.5 * env);
  }

  // Horizontal pixel-sort streak inside corrupt blocks: pull the sample toward the block's left
  // edge so bright/dark runs smear sideways.
  float sx = mix(uv.x, blockUv.x, corrupt * uStreak);
  vec2 duv = vec2(sx, uv.y) + mv;

  // Chroma tear: sample R/B at separated positions (the cyan/magenta datamosh split).
  float t = corrupt * uTear * (0.4 + 0.6 * env);
  vec3 col;
  col.r = baseSky(duv + vec2(t, 0.0)).r;
  col.g = baseSky(duv).g;
  col.b = baseSky(duv - vec2(t, 0.0)).b;

  // Bloom: heavily corrupt blocks flood toward the hot/cold duo (chosen by the block's own hash),
  // scaled by the envelope so the storm builds and clears.
  if (corrupt > 0.5) {
    float pickHot = step(0.5, hash21(blockId + 41.0));
    vec3 flood = mix(uCold, uHot, pickHot);
    float amt = uBloom * env * (0.4 + 0.6 * hash21(blockId + stp * 2.0 + 7.0));
    col = mix(col, flood, clamp(amt, 0.0, 0.9));
  }

  fragColor = vec4(col, 1.0);
}
`;
