import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genomeFromHash } from '../dist/genome.js';
import { rerollFeature } from '../dist/explore.js';
import { billowGenomeFromHash } from '../dist/engines/billow/index.js';
import { encodeSky, decodeSky, isSkyToken } from '../dist/codec.js';

test('encode/decode round-trips a Genesis sky exactly, with its engine id', () => {
  for (let i = 0; i < 40; i++) {
    const g = genomeFromHash('codec-' + i);
    const token = encodeSky('genesis', g);
    assert.ok(isSkyToken(token));
    assert.ok(token.startsWith('g:genesis:'));
    const out = decodeSky(token);
    assert.equal(out.engineId, 'genesis');
    assert.deepEqual(out.params, g);
  }
});

test('round-trips a Billow sky (different engine tag + shape)', () => {
  const p = billowGenomeFromHash('cloudy');
  const token = encodeSky('billow', p);
  assert.ok(token.startsWith('g:billow:'));
  const out = decodeSky(token);
  assert.equal(out.engineId, 'billow');
  assert.deepEqual(out.params, p);
});

test('round-trips an edited (rerolled) Genesis sky — edited skies stay reproducible', () => {
  let g = genomeFromHash('edit-me');
  g = rerollFeature(g, 'Palette');
  g = rerollFeature(g, 'Full Corruption');
  assert.deepEqual(decodeSky(encodeSky('genesis', g)).params, g);
});

test('isSkyToken and decodeSky reject non-tokens and garbage', () => {
  assert.equal(isSkyToken('00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f'), false);
  assert.equal(decodeSky('not a token'), null);
  assert.equal(decodeSky('g:genesis:!!!notbase64!!!'), null);
  assert.equal(decodeSky('g:' + Buffer.from('{"loopSeconds":20}').toString('base64')), null); // no engine id
  assert.equal(decodeSky('g:BAD ID:' + Buffer.from('{"loopSeconds":20}').toString('base64')), null);
});
