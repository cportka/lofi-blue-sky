/**
 * billow pass — a blue-sky gradient with procedural billowing clouds sweeping horizontally.
 *
 * Seamlessness: the cloud field is a *periodic* value-FBM (tiles every `uPeriod` in noise space).
 * Horizontal wind advects x by an INTEGER number of periods per loop, so it wraps exactly; the
 * billowing churn is driven by a time-circle offset (`cos/sin(TAU·loopT)`) that returns to its start.
 * Both close the loop with no seam. Renders into FBO_A; the shared post pass finishes it.
 */

export const BILLOW_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uLoopT;
uniform float uAspect;

uniform int   uSkyCount;
uniform float uSkyStops[MAX_SKY_STOPS];
uniform vec3  uSkyColors[MAX_SKY_STOPS];
uniform vec3  uCloud;
uniform vec3  uTint;

uniform float uHorizon;
uniform float uSunX;
uniform float uSunStrength;
uniform float uCoverage;
uniform float uSoftness;
uniform float uScale;
uniform float uStretch;   // horizontal elongation (cirrus streaks, lenticular waves)
uniform float uDarken;    // storm greying of the cloud body (nimbus types)
uniform float uWind;      // integer periods per loop
uniform float uBillow;
uniform float uPeriod;    // integer noise period (tiles) → seamless wrap
uniform float uLayers;

vec3 sampleSky(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = uSkyColors[0];
  for (int i = 1; i < MAX_SKY_STOPS; i++) {
    if (i >= uSkyCount) break;
    float f = clamp((t - uSkyStops[i - 1]) / max(1e-4, uSkyStops[i] - uSkyStops[i - 1]), 0.0, 1.0);
    c = mix(c, uSkyColors[i], f);
  }
  return c;
}

// periodic value noise: tiles every P in each axis
float phash(vec2 i, float P) {
  i = mod(i, P);
  return fract(sin(dot(i, vec2(41.31, 289.17))) * 43758.5453);
}
float pnoise(vec2 x, float P) {
  vec2 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float a = phash(i, P);
  float b = phash(i + vec2(1.0, 0.0), P);
  float c = phash(i + vec2(0.0, 1.0), P);
  float d = phash(i + vec2(1.0, 1.0), P);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// periodic fbm: every octave tiles at the same world period, so the whole thing is periodic
float pfbm(vec2 x, float P) {
  float s = 0.0, a = 0.5, tot = 0.0;
  for (int o = 0; o < 5; o++) {
    s += a * pnoise(x, P);
    tot += a;
    x *= 2.0;
    P *= 2.0;
    a *= 0.5;
  }
  return s / tot;
}

float cloudField(vec2 uv, float layer) {
  // noise-space coords; scale sets cloud size, aspect keeps them round, stretch elongates the
  // field horizontally (cirrus streaks / lenticular waves)
  vec2 base = vec2(uv.x * uAspect / max(1.0, uStretch), uv.y) * uScale + vec2(layer * 13.7, layer * 4.1);
  // horizontal wind — an INTEGER number of noise periods over the loop => seamless wrap
  vec2 scroll = vec2(uWind * uPeriod * uLoopT, 0.0);
  // time-circle domain warp => seamless billowing churn. The warp scrolls by the SAME integer
  // periods as the field (scroll added at full rate), so the whole thing stays periodic.
  vec2 tc = vec2(cos(TAU * uLoopT), sin(TAU * uLoopT)) * 0.6;
  vec2 wc = base * 0.55 + scroll + tc;
  vec2 warp = vec2(pfbm(wc, uPeriod), pfbm(wc + 5.2, uPeriod)) - 0.5;
  return pfbm(base + scroll + uBillow * warp, uPeriod);
}

void main() {
  vec2 uv = vUv;
  vec3 sky = sampleSky(uv.y);

  // sun glow near the horizon
  vec3 warm = mix(uCloud, uTint, 0.5);
  float d = length((uv - vec2(uSunX, uHorizon)) * vec2(1.0, 1.8));
  sky += warm * exp(-d * d * 6.0) * uSunStrength * 0.6;

  vec3 col = sky;
  // storm types grey the cloud body toward a heavy slate; the whole scene dims a touch with them
  vec3 cloudBase = mix(uCloud, uCloud * vec3(0.40, 0.42, 0.48), uDarken);
  int layers = int(clamp(uLayers, 1.0, 2.0) + 0.5);
  // back layer first, then front, for a little parallax depth
  for (int L = 1; L >= 0; L--) {
    if (L >= layers) continue;
    float lf = float(L);
    float dens = cloudField(uv, lf * 2.3);
    float cover = uCoverage + lf * 0.06;
    float mask = smoothstep(cover - uSoftness, cover + uSoftness, dens);
    // shade: brighter tops, tinted undersides
    vec3 lit = mix(cloudBase * 0.82, cloudBase, smoothstep(0.4, 0.9, dens));
    lit = mix(lit, uTint, (1.0 - uv.y) * 0.35 * (1.0 - dens) * (1.0 - uDarken));
    col = mix(col, lit, mask * (L == 1 ? 0.7 : 1.0));
  }
  col *= 1.0 - 0.12 * uDarken;

  fragColor = vec4(col, 1.0);
}
`;
