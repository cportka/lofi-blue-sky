/**
 * mosaic pass — EXPERIMENTAL (Phase 4, the `31` downsample look). Crushes the scene into a grid of
 * flat tiles and posterises. Stateless, so it stays perfectly loopable. Runs between the billow
 * pass and post when the genome's mode is `mosaic`. sort / mosh (feedback modes) are reserved.
 */

export const MOSAIC_FRAG = /* glsl */ `
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uScene;
uniform vec2  uResolution;
uniform float uTile;
uniform float uQuant;

void main() {
  vec2 grid = max(vec2(2.0), floor(uResolution / max(2.0, uTile)));
  vec2 uv = (floor(vUv * grid) + 0.5) / grid; // sample each tile's centre
  vec3 c = texture(uScene, uv).rgb;
  c = posterize(c, max(2.0, uQuant));
  fragColor = vec4(c, 1.0);
}
`;
