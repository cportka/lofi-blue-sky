/**
 * Shared build helper — bundle a target's entry into one inline `<script>` and inject it into an
 * HTML template, producing a single self-contained file. esbuild does the bundling/minification;
 * the output has zero external resources, which is what both fxhash (sandbox) and GitHub Pages want.
 */

import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

/** Bundle `entry` (a .ts/.js file) into a single minified IIFE string. */
export async function bundleJs(entry) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    write: false,
  });
  return result.outputFiles[0].text;
}

/** Inject a bundled script (and optional pre-snippet) into a template that has the marker comments. */
export function injectHtml(template, { script, snippet = '' }) {
  const safe = script.replace(/<\/script/gi, '<\\/script');
  let html = template.replace(/<!-- FX_SNIPPET[\s\S]*?-->/, snippet);
  html = html.replace(/<!-- INLINE_SCRIPT[\s\S]*?-->/, `<script>${safe}</script>`);
  return html;
}

/**
 * Assert the produced HTML is truly self-contained: no external fetches, no leftover ESM imports,
 * no CSS-side external references. This is a build-time lint (a safety net), not the security
 * guarantee — the guarantee is that esbuild inlines the module graph. It errs toward flagging.
 */
export function assertSelfContained(html) {
  const problems = [];
  const push = (label, re) => {
    const m = html.match(re);
    if (m) problems.push(`${label}: ${[...new Set(m)].slice(0, 3).join(' , ')}`);
  };
  // markup attributes pointing off-box (absolute or protocol-relative)
  push('external src/href', /\b(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+/gi);
  // CSS-side external references
  push('css url() to a non-data resource', /url\(\s*["']?(?!data:)(?:https?:)?\/\/[^)]+/gi);
  push('@import', /@import\b[^;]*/gi);
  push('@font-face (external font)', /@font-face\b/gi);
  // runtime network APIs
  push('fetch()', /\bfetch\s*\(/g);
  push('XMLHttpRequest', /\bXMLHttpRequest\b/g);
  push('WebSocket', /\bnew\s+WebSocket\b/g);
  // leftover ESM that means the bundle did not inline
  push('leftover ESM import ... from', /\bimport\b[^;\n]*\bfrom\b/g);
  return problems;
}

export function sizes(str) {
  const raw = Buffer.byteLength(str, 'utf8');
  const gz = gzipSync(Buffer.from(str, 'utf8')).length;
  return { raw, gz, kb: (raw / 1024).toFixed(1), gzkb: (gz / 1024).toFixed(1) };
}
