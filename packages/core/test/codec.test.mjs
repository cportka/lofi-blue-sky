import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeFromHash } from '../dist/genome.js';
import { rerollFeature } from '../dist/explore.js';
import { encodeGenome, decodeGenome, isGenomeToken } from '../dist/codec.js';

test('encode/decode round-trips a genome exactly', () => {
  for (let i = 0; i < 50; i++) {
    const g = genomeFromHash('codec-' + i);
    const token = encodeGenome(g);
    assert.ok(isGenomeToken(token));
    assert.deepEqual(decodeGenome(token), g);
  }
});

test('round-trips an edited (rerolled) genome — edited skies stay reproducible', () => {
  let g = genomeFromHash('edit-me');
  g = rerollFeature(g, 'Palette');
  g = rerollFeature(g, 'Full Corruption');
  assert.deepEqual(decodeGenome(encodeGenome(g)), g);
});

test('isGenomeToken and decodeGenome reject non-tokens and garbage', () => {
  assert.equal(isGenomeToken('00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f'), false);
  assert.equal(decodeGenome('not a token'), null);
  assert.equal(decodeGenome('g:!!!!notbase64!!!!'), null);
  assert.equal(decodeGenome('g:' + Buffer.from('{"foo":1}').toString('base64')), null); // wrong shape
});
