/**
 * Shared GLSL prelude — pure helper functions injected into every fragment shader (hashing,
 * luma, posterise, ordered dither). Kept free of any uniform references so it composes with any
 * pass. Authored as a template string so it inlines cleanly into the sandboxed token (no fetch).
 */

export const GLSL_COMMON = /* glsl */ `
// --- hashing (deterministic, no textures) ---------------------------------------------------
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// --- colour utilities -----------------------------------------------------------------------
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 posterize(vec3 c, float levels) {
  return floor(c * levels + 0.5) / levels;
}

// 4x4 ordered (Bayer) dither, returns a threshold in [-0.5, 0.5].
float ditherBayer(vec2 fragXY) {
  const float m[16] = float[16](
     0.0,  8.0,  2.0, 10.0,
    12.0,  4.0, 14.0,  6.0,
     3.0, 11.0,  1.0,  9.0,
    15.0,  7.0, 13.0,  5.0
  );
  int x = int(mod(fragXY.x, 4.0));
  int y = int(mod(fragXY.y, 4.0));
  return (m[y * 4 + x] + 0.5) / 16.0 - 0.5;
}
`;
