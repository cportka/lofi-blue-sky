# Canon — what is frozen, and what may move

**A hash always renders the same sky — from mint forward.** That is the whole promise of the piece.
This doc draws the line between what is frozen and what is free to evolve.

**Pre-release caveat (we are here).** Nothing is minted yet, and the engines are still `0.x`
(under SemVer 0.x, anything may change). While an engine's key is *pre-release* it can still be
**opened** — most gently by appending reserved draws (pixels byte-identical), and, once, by
*spending* those reserved draws to give them meaning (a `keyVersion` bump). The rule below binds
**at mint**; until then, a key change is allowed if it bumps `keyVersion` and preserves each seed's
**DNA** (every draw *before* the reserved block). Genesis is currently at **`keyVersion 3`**: v2
spent two reserved draws on the clean/grid/block geometry (v0.5.0); v3 (v0.6.0) re-thresholded those
same draws so a **clean pulsing pixel grid** is the default and the bit-crush is pulled down on clean
seeds — same DNA per seed, a new finish/geometry overlay. (Billow and Squall are at `keyVersion 2`,
still young and unfrozen.) See [ENGINES.md](./ENGINES.md#keys-versions-and-reserved-space).

## Frozen at mint (the seed → pixels contract)

These define what a hash renders. Changing any of them makes an existing sky render differently — so
post-mint they do **not** change without a **MAJOR** version bump and a new, clearly-labelled genome.
(Pre-release, they may still move under a `keyVersion` bump per the caveat above — that is how
`slitscan.ts` grew grids and `genome.ts` spent two reserved draws for Genesis v2.)

- **`genome.ts`** — the draw order, ranges, and field set. (The determinism contract; see
  [DETERMINISM.md](./DETERMINISM.md) and [GENOME.md](./GENOME.md).)
- **`palettes.ts`** — the `PALETTES` array: its order, ids, colours, and stops. Reordering or
  reweighting it would remap `pick(rand, PALETTES)` and change every seed's palette.
- **The shaders** — `sky.ts`, `slitscan.ts`, `post.ts`, and the shared `common.ts` math.

This is enforced, not just promised:

- `packages/core/test/canon.test.mjs` pins the **exact genome** of the canonical seeds (params
  level, in CI).
- `packages/core/test/genome.test.mjs` pins the golden genome snapshot + draw-path vectors.
- `scripts/render-goldens.json` pins a **pixel signature** for the canonical seeds (via
  `npm run render golden` — a same-driver regression guard).

If you change a shader or the genome, these fail on purpose. That failure is the system working.

### Canonical seeds

Held as regression anchors (add your favourites here — pin both the genome and the pixels):

| seed | look (under Genesis v3) |
|------|------|
| `00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f` | sodium sunset · **clean** pulsing bars · perfect horizon |
| `3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64` | olive sky · woven into a **clean 21-column grid** |

`canon.test.mjs` also asserts each pick's **pre-reserved DNA** (palette, bands, horizon, …) is
byte-identical to v1 — the v2/v3 overlay changed the finish/geometry, never the DNA.

## Free to move (never changes what a hash renders)

Everything that sits *above* the seed → pixels mapping can evolve in **MINOR/PATCH** releases:

- **The browser UI** (`targets/web`) — controls, layout, exports.
- **Exploration policy** — e.g. "make Olive rarer in *new sky*" is [rejection sampling in
  `explore.ts`](../packages/core/src/explore.ts), **not** a genome change. Olive is simply surfaced
  less often by the randomizer; every Olive hash still renders Olive, and single-attribute reshuffles
  produce genomes shared as `g:…` tokens ([codec.ts](../packages/core/src/codec.ts)) — never altering
  what a *hash* means.
- **Feature labels** — `deriveFeatures` thresholds (`features.ts`) are trait *names* over the same
  pixels; tuning them (as v0.2.0 did for Perfect Horizon / Full Corruption) changes no sky. They do
  become fixed for a given token **at mint** on fxhash.
- **New engines.** Adding an engine (Billow, Squall) can't touch what a Genesis hash renders — each
  engine has its own key. A *young* engine's key (Billow, Squall) is still evolving and **not** frozen
  yet; it freezes when it's minted. See [ENGINES.md](./ENGINES.md).
- **Reserved-draw appends.** *Appending* unused reserved draws to a key (Genesis gained 4 in v0.3.0)
  is allowed pre-release: they're drawn last and unused by the shaders, so **pixels are byte-identical**
  (the render goldens confirm it) — only the params object grows a trailing `reserved[]`.
- **Spending reserved draws — pre-release only, with a `keyVersion` bump.** Giving those blanks
  meaning *does* change pixels, so it is **not** a MINOR move at mint. Pre-release it is allowed under
  one discipline: the draw positions don't move (DNA byte-identical), `keyVersion` bumps, canon is
  re-blessed, and the goldens + snapshots are updated to the new truth. Genesis v2 did exactly this.

## Rule of thumb

> If a change could make `genomeFromHash(h)` or the rendered pixels differ for an existing `h`, it is
> a new genome (MAJOR). If it only affects exploration, UI, or labels, it is MINOR/PATCH. When in
> doubt, run `npm test` — the canon tests answer the question.
