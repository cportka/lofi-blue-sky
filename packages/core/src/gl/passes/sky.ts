/**
 * sky pass — the natural scene before any glitch. A vertical sunset gradient sampled from the
 * curated ramp plus a soft sun glow near the horizon. Stateless; renders into FBO_A.
 */

export const SKY_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;
uniform int   uStopCount;
uniform float uStops[MAX_STOPS];
uniform vec3  uColors[MAX_STOPS];
uniform float uHorizon;
uniform float uSunElev;
uniform float uSunStrength;
uniform float uTrueHorizon;

// Piecewise-linear ramp sampler (mirrors palettes.ts sampleRamp).
vec3 sampleRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = uColors[0];
  for (int i = 1; i < MAX_STOPS; i++) {
    if (i >= uStopCount) break;
    float f = clamp((t - uStops[i - 1]) / max(1e-4, uStops[i] - uStops[i - 1]), 0.0, 1.0);
    c = mix(c, uColors[i], f);
  }
  return c;
}

void main() {
  vec2 uv = vUv;

  // Warp the vertical coordinate so the horizon glow concentrates around uHorizon.
  float y = uv.y;
  float warped = y < uHorizon
    ? (y / max(1e-3, uHorizon)) * 0.5
    : 0.5 + (y - uHorizon) / max(1e-3, 1.0 - uHorizon) * 0.5;

  // True Horizon: push the gradient apart across the horizon so a crisp, always-distinguishable
  // colour edge sits exactly at uHorizon (in True Clean it lands between two pixel rows).
  if (uTrueHorizon > 0.5) {
    float side = step(uHorizon, y);
    warped = clamp(warped + (side - 0.5) * 0.16, 0.0, 1.0);
  }

  vec3 col = sampleRamp(warped);

  // Sun glow: a soft horizontal band centred at uSunElev, tinted with the warm low end of the ramp.
  // Mostly a glowing horizon with a gentle brightening toward the centre — a low sun through haze,
  // not a headlight.
  vec3 warm = sampleRamp(0.08);
  float d = abs(uv.y - uSunElev);
  float glow = exp(-d * d * 70.0) * uSunStrength;
  float hx = exp(-pow((uv.x - 0.5) * 1.25, 2.0) * 1.3);
  col += warm * glow * (0.62 + 0.38 * hx);

  fragColor = vec4(col, 1.0);
}
`;
