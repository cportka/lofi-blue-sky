/**
 * WebGL2 plumbing: context creation, a fullscreen-triangle program wrapper with cached uniform
 * locations, and render-target (FBO) helpers for the ping-pong pipeline. Attributeless drawing —
 * the vertex shader derives a fullscreen triangle from `gl_VertexID`, so there are no buffers.
 */

import { MAX_STOPS } from '../palettes.js';
import { GLSL_COMMON } from './passes/common.js';

/** Vertex shader shared by every pass: a single fullscreen triangle, uv in [0, 1] over the screen. */
export const VERT_SRC = /* glsl */ `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

function assembleFragment(body: string): string {
  return `#version 300 es
precision highp float;
precision highp int;
#define MAX_STOPS ${MAX_STOPS}
#define TAU 6.28318530718
${GLSL_COMMON}
${body}`;
}

export function createGL(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    depth: false,
    stencil: false,
    alpha: false,
    // let both targets read the canvas back for a preview / PNG capture
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  return gl;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type);
  if (!sh) throw new Error('createShader failed');
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile error:\n${log}\n--- source ---\n${numberLines(src)}`);
  }
  return sh;
}

function numberLines(src: string): string {
  return src
    .split('\n')
    .map((l, i) => `${String(i + 1).padStart(3, ' ')}| ${l}`)
    .join('\n');
}

/** A linked program with lazily-cached uniform locations and typed setters. */
export class Program {
  readonly program: WebGLProgram;
  private readonly locs = new Map<string, WebGLUniformLocation | null>();

  constructor(private readonly gl: WebGL2RenderingContext, fragmentBody: string) {
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, assembleFragment(fragmentBody));
    const p = gl.createProgram();
    if (!p) throw new Error('createProgram failed');
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`program link error:\n${log}`);
    }
    this.program = p;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  private loc(name: string): WebGLUniformLocation | null {
    let l = this.locs.get(name);
    if (l === undefined) {
      l = this.gl.getUniformLocation(this.program, name);
      this.locs.set(name, l);
    }
    return l;
  }

  f(name: string, v: number): void {
    this.gl.uniform1f(this.loc(name), v);
  }
  i(name: string, v: number): void {
    this.gl.uniform1i(this.loc(name), v);
  }
  vec2(name: string, x: number, y: number): void {
    this.gl.uniform2f(this.loc(name), x, y);
  }
  fv(name: string, v: Float32Array | number[]): void {
    this.gl.uniform1fv(this.loc(name), v);
  }
  vec3v(name: string, v: Float32Array | number[]): void {
    this.gl.uniform3fv(this.loc(name), v);
  }
  /** Bind `texture` to `unit` and point sampler `name` at it. */
  tex(name: string, unit: number, texture: WebGLTexture): void {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(this.loc(name), unit);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}

export interface RenderTarget {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

/** Create an RGBA8 colour target (texture + framebuffer). `linear` toggles LINEAR vs NEAREST. */
export function createTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  linear: boolean,
): RenderTarget {
  const texture = gl.createTexture();
  if (!texture) throw new Error('createTexture failed');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const filter = linear ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('createFramebuffer failed');
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`framebuffer incomplete: 0x${status.toString(16)}`);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { framebuffer, texture, width, height };
}

export function disposeTarget(gl: WebGL2RenderingContext, t: RenderTarget): void {
  gl.deleteTexture(t.texture);
  gl.deleteFramebuffer(t.framebuffer);
}
