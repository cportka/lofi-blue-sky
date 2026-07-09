/**
 * Multi-pass orchestration:  sky → FBO_A  →  slitscan(A) → FBO_B  →  post(B) → screen.
 *
 * The sky and slitscan passes render at a seed-stable internal resolution (the lofi crush); the
 * post pass upscales to the canvas. For v1 both feedback-free modes make the loop trivially
 * seamless, so there is no history buffer yet — pipeline.ts is where sort/mosh would add one.
 */

import { Program, createTarget, disposeTarget, type RenderTarget } from './context.js';
import { SKY_FRAG } from './passes/sky.js';
import { SLITSCAN_FRAG } from './passes/slitscan.js';
import { POST_FRAG } from './passes/post.js';
import { MAX_STOPS, getPaletteById, PALETTES } from '../palettes.js';
import type { Genome } from '../genome.js';

interface PaletteUniforms {
  stops: Float32Array; // length MAX_STOPS
  colors: Float32Array; // length MAX_STOPS * 3
  count: number;
}

function buildPaletteUniforms(g: Genome): PaletteUniforms {
  const palette = getPaletteById(g.paletteId) ?? PALETTES[0]!;
  const stops = new Float32Array(MAX_STOPS);
  const colors = new Float32Array(MAX_STOPS * 3);
  const n = palette.stops.length;
  for (let i = 0; i < MAX_STOPS; i++) {
    const s = palette.stops[Math.min(i, n - 1)]!;
    stops[i] = s.t;
    // stopJitter nudges each stop's value (curate, then perturb).
    const j = 1 + (g.stopJitter[i] ?? 0);
    colors[i * 3 + 0] = Math.min(1, Math.max(0, s.c[0] * j));
    colors[i * 3 + 1] = Math.min(1, Math.max(0, s.c[1] * j));
    colors[i * 3 + 2] = Math.min(1, Math.max(0, s.c[2] * j));
  }
  return { stops, colors, count: n };
}

export class Pipeline {
  private readonly sky: Program;
  private readonly slit: Program;
  private readonly post: Program;
  private readonly vao: WebGLVertexArrayObject;
  private a: RenderTarget;
  private b: RenderTarget;
  private genome!: Genome;
  private pal!: PaletteUniforms;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private iw: number,
    private ih: number,
  ) {
    this.sky = new Program(gl, SKY_FRAG);
    this.slit = new Program(gl, SLITSCAN_FRAG);
    this.post = new Program(gl, POST_FRAG);
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('createVertexArray failed');
    this.vao = vao;
    this.a = createTarget(gl, iw, ih, true); // sky: linear (smooth gradient sampling)
    this.b = createTarget(gl, iw, ih, false); // slitscan out: nearest (lofi crunch on upscale)
  }

  setGenome(g: Genome): void {
    this.genome = g;
    this.pal = buildPaletteUniforms(g);
  }

  /** Resize the internal render targets (call when the canvas / DPR changes). */
  resizeInternal(iw: number, ih: number): void {
    if (iw === this.iw && ih === this.ih) return;
    this.iw = iw;
    this.ih = ih;
    disposeTarget(this.gl, this.a);
    disposeTarget(this.gl, this.b);
    this.a = createTarget(this.gl, iw, ih, true);
    this.b = createTarget(this.gl, iw, ih, false);
  }

  /** Render one frame. `loopT ∈ [0,1)`; `displayW/H` is the canvas backing-store size. */
  render(loopT: number, displayW: number, displayH: number): void {
    const gl = this.gl;
    const g = this.genome;
    gl.bindVertexArray(this.vao);

    // --- pass 1: sky → A ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.a.framebuffer);
    gl.viewport(0, 0, this.iw, this.ih);
    this.sky.use();
    this.sky.vec2('uResolution', this.iw, this.ih);
    this.sky.i('uStopCount', this.pal.count);
    this.sky.fv('uStops', this.pal.stops);
    this.sky.vec3v('uColors', this.pal.colors);
    this.sky.f('uHorizon', g.horizon);
    this.sky.f('uSunElev', g.sunElevation);
    this.sky.f('uSunStrength', g.sunStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- pass 2: slitscan(A) → B ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.b.framebuffer);
    gl.viewport(0, 0, this.iw, this.ih);
    this.slit.use();
    this.slit.tex('uSky', 0, this.a.texture);
    this.slit.vec2('uResolution', this.iw, this.ih);
    this.slit.f('uLoopT', loopT);
    this.slit.f('uBands', g.bands);
    this.slit.f('uHbands', g.hbands);
    this.slit.f('uClean', g.clean ? 1 : 0);
    this.slit.f('uBlocks', g.blocks ? 1 : 0);
    this.slit.f('uBlocksN', g.blocksN);
    this.slit.f('uBandPhase', g.bandPhase);
    this.slit.f('uBandDrift', g.bandDrift);
    this.slit.f('uRowDisplace', g.rowDisplace);
    this.slit.f('uDriftCycles', g.driftCycles);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // --- pass 3: post(B) → screen ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, displayW, displayH);
    this.post.use();
    this.post.tex('uScene', 0, this.b.texture);
    this.post.vec2('uResolution', displayW, displayH);
    this.post.vec2('uInternalRes', this.iw, this.ih);
    this.post.f('uQuantLevels', g.quantLevels);
    this.post.f('uGrain', g.grain);
    this.post.f('uDither', g.dither);
    this.post.f('uChroma', g.chroma);
    this.post.f('uVignette', g.vignette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.sky.dispose();
    this.slit.dispose();
    this.post.dispose();
    disposeTarget(this.gl, this.a);
    disposeTarget(this.gl, this.b);
    this.gl.deleteVertexArray(this.vao);
  }
}
