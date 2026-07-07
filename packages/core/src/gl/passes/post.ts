/**
 * post pass — the digital-corruption texture over the natural scene: chromatic bleed, ordered
 * dither, colour posterisation, film grain, and a vignette. Grain is a static function of pixel
 * position (no loop time) so it never breaks the seamless loop. Reads FBO_B, renders to screen.
 */

export const POST_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform vec2  uResolution;
uniform float uQuantLevels;
uniform float uGrain;
uniform float uDither;
uniform float uChroma;
uniform float uVignette;

void main() {
  vec2 uv = vUv;

  // Chromatic bleed: pull R and B along the radial direction.
  vec2 dir = uv - 0.5;
  float amt = uChroma * 0.006;
  float r = texture(uScene, uv + dir * amt).r;
  float g = texture(uScene, uv).g;
  float b = texture(uScene, uv - dir * amt).b;
  vec3 col = vec3(r, g, b);

  // Ordered dither before posterisation to break up the banding.
  float d = ditherBayer(gl_FragCoord.xy) * (uDither / max(2.0, uQuantLevels));
  col = posterize(col + d, uQuantLevels);

  // Static film grain.
  float grain = (hash21(gl_FragCoord.xy) - 0.5) * uGrain * 0.16;
  col += grain;

  // Vignette.
  float vig = smoothstep(1.15, 0.35, length(dir * vec2(1.05, 1.0)));
  col *= mix(1.0, vig, uVignette);

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
