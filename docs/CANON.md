# Canon — what is frozen, and what may move

**v0.1.0 is the canonical first version.** From it forward, a hash always renders the same sky.
This is the whole promise of the piece; this doc draws the line between what is frozen and what is
free to evolve.

## Frozen forever (the seed → pixels contract)

These define what a hash renders. Changing any of them would make an existing sky render
differently — so they do **not** change without a **MAJOR** version bump and a new, clearly-labelled
genome:

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

| seed | look |
|------|------|
| `00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f` | sodium sunset · degraded · perfect horizon |
| `3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64` | olive sky · clean |

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
- **New engines.** Adding an engine (Billow) can't touch what a Genesis hash renders — each engine
  has its own key. A *young* engine's key (Billow) is still evolving and **not** frozen yet; it
  freezes when it's minted. See [ENGINES.md](./ENGINES.md).
- **Reserved-draw appends.** *Appending* unused reserved draws to a key (Genesis gained 4 in v0.3.0)
  is allowed pre-release: they're drawn last and unused by the shaders, so **pixels are byte-identical**
  (the render goldens confirm it) — only the params object grows a trailing `reserved[]`.

## Rule of thumb

> If a change could make `genomeFromHash(h)` or the rendered pixels differ for an existing `h`, it is
> a new genome (MAJOR). If it only affects exploration, UI, or labels, it is MINOR/PATCH. When in
> doubt, run `npm test` — the canon tests answer the question.
