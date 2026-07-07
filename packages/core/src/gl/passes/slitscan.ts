/**
 * slitscan pass — the signature 32__OG look. Quantise the frame into N horizontal bands; sample
 * the sky at a per-band vertical offset that drifts over the loop (the venetian-blind reveal), and
 * add a per-row horizontal displacement (the smear). Every time term is a periodic function of the
 * loop phase and every drift cycle count is an integer, so the loop is perfectly seamless and
 * stateless. Reads FBO_A (the sky), renders into FBO_B.
 */

export const SLITSCAN_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSky;
uniform vec2  uResolution;
uniform float uLoopT;
uniform float uBands;
uniform float uBandPhase;
uniform float uBandDrift;
uniform float uRowDisplace;
uniform float uDriftCycles;

void main() {
  vec2 uv = vUv;

  float bandIdx = floor(uv.y * uBands);
  float bandBase = bandIdx / uBands;
  float seed = hash11(bandIdx + 1.0);

  // Per-band vertical drift — integer cycles per loop keeps it seamless.
  float drift = uBandDrift * sin(TAU * (uDriftCycles * uLoopT + seed) + uBandPhase * TAU);

  // Each band shows a near-flat slice of the gradient at its drifting position, with a little
  // of the in-band gradient bled back in so the bands don't look like hard posterisation.
  float yLocal = fract(uv.y * uBands) / uBands;
  float sy = bandBase + mix(0.5 / uBands, yLocal, 0.35) + drift;

  // Per-row horizontal displacement (the smear), also loop-periodic.
  float row = floor(uv.y * uResolution.y);
  float rowN = hash11(row + 3.0) - 0.5;
  float xdisp = uRowDisplace * rowN * sin(TAU * (uLoopT + seed));

  vec2 samp = vec2(uv.x + xdisp, sy);
  // Reflect at the edges so displaced samples never read the clamp streak.
  samp = abs(samp);
  samp = mix(samp, 2.0 - samp, step(1.0, samp));
  samp = clamp(samp, 0.0, 1.0);

  vec3 col = texture(uSky, samp).rgb;

  // A faint seam of shadow at each band edge sells the slit-scan quantisation.
  float edge = smoothstep(0.0, 0.06, yLocal * uBands) * smoothstep(0.0, 0.06, (1.0 - yLocal * uBands));
  col *= 0.92 + 0.08 * edge;

  fragColor = vec4(col, 1.0);
}
`;
