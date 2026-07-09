/**
 * Squall renderer:  squall(datamosh) → FBO_A  →  post → screen.
 * One generative pass (the datamosh is computed procedurally, no history buffer), then the shared
 * post pass so Squall inherits the same lofi finish (dither / posterize / grain / chroma / vignette).
 */

import { Program, createTarget, disposeTarget, type RenderTarget } from '../../gl/context.js';
import { POST_FRAG } from '../../gl/passes/post.js';
import { SQUALL_FRAG } from './passes/squall.js';
import { SQUALL_PALETTES, MAX_SQUALL_STOPS, getSquallPalette } from './palettes.js';
import type { EngineRenderer } from '../types.js';
import type { SquallParams } from './genome.js';

function hex(h: string): [number, number, number] {
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface SkyUniforms {
  stops: Float32Array;
  colors: Float32Array;
  count: number;
  hot: [number, number, number];
  cold: [number, number, number];
}

function buildSky(p: SquallParams): SkyUniforms {
  const pal = getSquallPalette(p.skyPaletteId) ?? SQUALL_PALETTES[0]!;
  const stops = new Float32Array(MAX_SQUALL_STOPS);
  const colors = new Float32Array(MAX_SQUALL_STOPS * 3);
  const n = pal.sky.length;
  for (let i = 0; i < MAX_SQUALL_STOPS; i++) {
    const s = pal.sky[Math.min(i, n - 1)]!;
    stops[i] = s[0];
    const c = hex(s[1]);
    const j = 1 + (p.skyJitter[i] ?? 0);
    colors[i * 3] = clamp01(c[0] * j);
    colors[i * 3 + 1] = clamp01(c[1] * j);
    colors[i * 3 + 2] = clamp01(c[2] * j);
  }
  return { stops, colors, count: n, hot: hex(pal.hot), cold: hex(pal.cold) };
}

export class SquallRenderer implements EngineRenderer<SquallParams> {
  private readonly squall: Program;
  private readonly post: Program;
  private readonly vao: WebGLVertexArrayObject;
  private a: RenderTarget;
  private params!: SquallParams;
  private sky!: SkyUniforms;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private iw: number,
    private ih: number,
  ) {
    this.squall = new Program(gl, SQUALL_FRAG, { MAX_SQUALL_STOPS });
    this.post = new Program(gl, POST_FRAG);
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('createVertexArray failed');
    this.vao = vao;
    this.a = createTarget(gl, iw, ih, false); // nearest → crisp macroblocks on upscale
  }

  setParams(p: SquallParams): void {
    this.params = p;
    this.sky = buildSky(p);
  }

  resizeInternal(iw: number, ih: number): void {
    if (iw === this.iw && ih === this.ih) return;
    this.iw = iw;
    this.ih = ih;
    disposeTarget(this.gl, this.a);
    this.a = createTarget(this.gl, iw, ih, false);
  }

  render(loopT: number, displayW: number, displayH: number): void {
    const gl = this.gl;
    const p = this.params;
    gl.bindVertexArray(this.vao);

    // pass 1: squall (datamosh) → A
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.a.framebuffer);
    gl.viewport(0, 0, this.iw, this.ih);
    this.squall.use();
    this.squall.vec2('uResolution', this.iw, this.ih);
    this.squall.f('uLoopT', loopT);
    this.squall.i('uSkyCount', this.sky.count);
    this.squall.fv('uSkyStops', this.sky.stops);
    this.squall.vec3v('uSkyColors', this.sky.colors);
    this.squall.vec3v('uHot', this.sky.hot);
    this.squall.vec3v('uCold', this.sky.cold);
    this.squall.f('uHorizon', p.horizon);
    this.squall.f('uSunX', p.sunX);
    this.squall.f('uSunStrength', p.sunStrength);
    this.squall.f('uBlocksX', p.blocksX);
    this.squall.f('uBlocksY', p.blocksY);
    this.squall.f('uSteps', p.steps);
    this.squall.f('uBursts', p.bursts);
    this.squall.f('uSharp', p.sharpness);
    this.squall.f('uAmount', p.amount);
    this.squall.f('uMotion', p.motion);
    this.squall.f('uTear', p.tear);
    this.squall.f('uBloom', p.bloom);
    this.squall.f('uStreak', p.streak);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // pass 2: post → screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, displayW, displayH);
    this.post.use();
    this.post.tex('uScene', 0, this.a.texture);
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
    this.squall.dispose();
    this.post.dispose();
    disposeTarget(this.gl, this.a);
    this.gl.deleteVertexArray(this.vao);
  }
}
