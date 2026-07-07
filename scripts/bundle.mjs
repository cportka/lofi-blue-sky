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

/** Assert the produced HTML is truly self-contained (no external fetches, no leftover ESM imports). */
export function assertSelfContained(html) {
  const problems = [];
  const ext = html.match(/\b(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi);
  if (ext) problems.push(`external resource refs: ${ext.slice(0, 3).join(', ')}`);
  if (/\bimport\s+[\w{*]/.test(html) && !/<!--/.test(RegExp.lastMatch))
    problems.push('leftover ESM `import` statement (bundle did not inline)');
  if (/\bfetch\s*\(/.test(html)) problems.push('a fetch() call is present (network at runtime)');
  return problems;
}

export function sizes(str) {
  const raw = Buffer.byteLength(str, 'utf8');
  const gz = gzipSync(Buffer.from(str, 'utf8')).length;
  return { raw, gz, kb: (raw / 1024).toFixed(1), gzkb: (gz / 1024).toFixed(1) };
}
