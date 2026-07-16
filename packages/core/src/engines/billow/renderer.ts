/**
 * Billow renderer:  billow → FBO_A  →  [mosaic → FBO_B]  →  post → screen.
 * Reuses the shared GL helpers and the shared post pass, so Billow inherits the same lofi finish
 * (dither / posterize / grain / chroma / vignette) as Genesis.
 */

import { Program, createTarget, disposeTarget, type RenderTarget } from '../../gl/context.js';
import { POST_FRAG } from '../../gl/passes/post.js';
import { BILLOW_FRAG } from './passes/billow.js';
import { MOSAIC_FRAG } from './passes/mosaic.js';
import { BILLOW_PALETTES, MAX_SKY_STOPS, getBillowPalette } from './palettes.js';
import type { EngineRenderer } from '../types.js';
import type { BillowParams } from './genome.js';

function hex(h: string): [number, number, number] {
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface SkyUniforms {
  stops: Float32Array;
  colors: Float32Array;
  count: number;
  cloud: [number, number, number];
  tint: [number, number, number];
}

function buildSky(p: BillowParams): SkyUniforms {
  const pal = getBillowPalette(p.skyPaletteId) ?? BILLOW_PALETTES[0]!;
  const stops = new Float32Array(MAX_SKY_STOPS);
  const colors = new Float32Array(MAX_SKY_STOPS * 3);
  const n = pal.sky.length;
  for (let i = 0; i < MAX_SKY_STOPS; i++) {
    const s = pal.sky[Math.min(i, n - 1)]!;
    stops[i] = s[0];
    const c = hex(s[1]);
    const j = 1 + (p.skyJitter[i] ?? 0);
    colors[i * 3] = clamp01(c[0] * j);
    colors[i * 3 + 1] = clamp01(c[1] * j);
    colors[i * 3 + 2] = clamp01(c[2] * j);
  }
  return { stops, colors, count: n, cloud: hex(pal.cloud), tint: hex(pal.tint) };
}

export class BillowRenderer implements EngineRenderer<BillowParams> {
  private readonly billow: Program;
  private readonly mosaic: Program;
  private readonly post: Program;
  private readonly vao: WebGLVertexArrayObject;
  private a: RenderTarget;
  private b: RenderTarget;
  private params!: BillowParams;
  private sky!: SkyUniforms;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private iw: number,
    private ih: number,
  ) {
    const defs = { MAX_SKY_STOPS };
    this.billow = new Program(gl, BILLOW_FRAG, defs);
    this.mosaic = new Program(gl, MOSAIC_FRAG);
    this.post = new Program(gl, POST_FRAG);
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('createVertexArray failed');
    this.vao = vao;
    this.a = createTarget(gl, iw, ih, true);
    this.b = createTarget(gl, iw, ih, false);
  }

  setParams(p: BillowParams): void {
    this.params = p;
    this.sky = buildSky(p);
  }

  resizeInternal(iw: number, ih: number): void {
    if (iw === this.iw && ih === this.ih) return;
    this.iw = iw;
    this.ih = ih;
    disposeTarget(this.gl, this.a);
    disposeTarget(this.gl, this.b);
    this.a = createTarget(this.gl, iw, ih, true);
    this.b = createTarget(this.gl, iw, ih, false);
  }

  render(loopT: number, displayW: number, displayH: number): void {
    const gl = this.gl;
    const p = this.params;
    gl.bindVertexArray(this.vao);

    // pass 1: billow → A
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.a.framebuffer);
    gl.viewport(0, 0, this.iw, this.ih);
    this.billow.use();
    this.billow.vec2('uResolution', this.iw, this.ih);
    this.billow.f('uAspect', this.iw / this.ih);
    this.billow.f('uLoopT', loopT);
    this.billow.i('uSkyCount', this.sky.count);
    this.billow.fv('uSkyStops', this.sky.stops);
    this.billow.vec3v('uSkyColors', this.sky.colors);
    this.billow.vec3v('uCloud', this.sky.cloud);
    this.billow.vec3v('uTint', this.sky.tint);
    this.billow.f('uHorizon', p.horizon);
    this.billow.f('uSunX', p.sunX);
    this.billow.f('uSunStrength', p.sunStrength);
    this.billow.f('uCoverage', p.coverage);
    this.billow.f('uSoftness', p.softness);
    this.billow.f('uScale', p.scale);
    this.billow.f('uStretch', p.stretch);
    this.billow.f('uDarken', p.darken);
    this.billow.f('uWind', p.wind);
    this.billow.f('uBillow', p.billow);
    this.billow.f('uPeriod', p.period);
    this.billow.f('uLayers', p.layers);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // pass 2 (experimental): mosaic → B
    let scene = this.a.texture;
    if (p.mode === 'mosaic') {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.b.framebuffer);
      gl.viewport(0, 0, this.iw, this.ih);
      this.mosaic.use();
      this.mosaic.tex('uScene', 0, this.a.texture);
      this.mosaic.vec2('uResolution', this.iw, this.ih);
      this.mosaic.f('uTile', p.tile);
      this.mosaic.f('uQuant', p.quantLevels);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      scene = this.b.texture;
    }

    // pass 3: post → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, displayW, displayH);
    this.post.use();
    this.post.tex('uScene', 0, scene);
    this.post.vec2('uResolution', displayW, displayH);
    this.post.vec2('uInternalRes', this.iw, this.ih);
    this.post.f('uQuantLevels', p.quantLevels);
    this.post.f('uGrain', p.grain);
    this.post.f('uDither', p.dither);
    this.post.f('uChroma', p.chroma);
    this.post.f('uVignette', p.vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.billow.dispose();
    this.mosaic.dispose();
    this.post.dispose();
    disposeTarget(this.gl, this.a);
    disposeTarget(this.gl, this.b);
    this.gl.deleteVertexArray(this.vao);
  }
}
