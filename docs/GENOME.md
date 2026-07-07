# the genome — hash → params

The genome is the DNA of a token: a pure function from a hash to a fixed bag of parameters. Feed the
same `$fx.hash` in and you get byte-identical params on any machine, which is what makes the sky
reproducible forever. `genome(rand)` in
[`packages/core/src/genome.ts`](../packages/core/src/genome.ts) draws a hash-seeded
[`Rng`](../packages/core/src/rng.ts) in a fixed order to fill the `Genome` interface;
`genomeFromHash(hash)` is the convenience wrapper that seeds the RNG for you.

Nothing here touches raw RGB. The palette is *curated then perturbed* — the genome picks one of the
twelve hand-tuned ramps and nudges its stops — so the RNG can never mint mud. See
[AESTHETIC.md](./AESTHETIC.md) for the why.

## the determinism contract: draw order is law

The engine only ever consumes an `fxrand`-shaped `() => number`. On the fxhash token it is
`$fx.rand`; in the browser and tests it is [`createRng`](../packages/core/src/rng.ts) (xmur3 → sfc32,
integer-only). Because both produce the *same shape*, the genome never depends on which PRNG ran —
only on **the order in which `rand()` is called**.

That order is the contract. Every value is drawn from the running stream, so inserting, removing, or
reordering a single draw shifts every value after it — the same hash would then mint a *different*
sky, breaking every token already in the wild.

> **Never reorder, insert, or delete a `rand()` draw without a MAJOR version bump.** This is the one
> rule the whole project rests on. See [DETERMINISM.md](./DETERMINISM.md).

The two conditional branches in the draw stream are both deterministic *per hash*, so they don't
threaten cross-machine reproducibility:

- **`bands`** picks `fine` (a 50/50 `chance`), then draws exactly one int from either range. Both
  branches consume **one** draw, so the stream length past this point is stable regardless of the
  coin flip.
- **`chroma`** gates on a 45% `chance` and draws an *extra* value only when the gate passes. So a
  genome consumes **26 or 27** draws total. This is fine — the gate is deterministic from the hash —
  but it means everything after `chroma` (vignette, loopSeconds) still shifts if you touch the gate.

### the draw stream, in order

```
draw #   field            helper
──────   ─────────────    ────────────────────────
  1      paletteId        pick(PALETTES)          ── palette
  2–7    stopJitter[0..5] range(-0.06, 0.06) ×6      (MAX_STOPS = 6)
  8      horizon          range(0.30, 0.62)       ── sky
  9      sunElevation     range(horizon-.05, +.18)
 10      sunStrength      range(0.15, 0.85)
 11      (fine)           chance(0.5)             ── slit-scan
 12      bands            rangeInt(24,48 | 8,22)     one draw either way
 13      bandPhase        rand()
 14      bandDrift        range(0.015, 0.09)
 15      rowDisplace      range(0.0, 0.06)
 16      driftCycles      rangeInt(1, 3)
 17      tile             rangeInt(3, 12)         ── forward-compat
 18      sortThreshold    range(0.35, 0.72)
 19      sortAxis         chance(0.7) ? vert : horz
 20      moshDecay        range(0.85, 0.98)
 21      quantLevels      rangeInt(5, 16)         ── colour + post
 22      grain            range(0.04, 0.5)
 23      dither           range(0.2, 0.9)
 24      (chroma gate)    chance(0.45)
 24b     chroma value     range(0.0, 0.6)            drawn only if gate passed
 25      vignette         range(0.1, 0.6)
 26      loopSeconds      range(20, 34)           ── loop
```

`mode` is not drawn — v1 locks it to the literal `'bands'`.

## every field of the Genome interface

`range(min, max)` is a uniform float in `[min, max)`; `rangeInt(min, max)` is a uniform integer in
`[min, max]` (inclusive on both ends).

| field | type | range / values | meaning |
|-------|------|----------------|---------|
| `mode` | `SkyMode` | `'bands'` (v1) | active glitch mode. Locked to `bands` — the slit-scan sunset. |
| `paletteId` | `string` | one of 12 ramp ids | index into the curated `PALETTES` (e.g. `sodium-sunset`). |
| `stopJitter` | `number[]` | length 6, each `[-0.06, 0.06)` | per-stop luminance/hue nudge — "curate, then perturb". |
| `horizon` | `number` | `[0.30, 0.62)` | vertical centre of the horizon glow, 0 (bottom) → 1 (top). |
| `sunElevation` | `number` | `[horizon-0.05, horizon+0.18)` | sun-glow height, drawn *relative to* `horizon`. |
| `sunStrength` | `number` | `[0.15, 0.85)` | sun-glow intensity. |
| `bands` | `number` (int) | Fine `[24,48]` or Wide `[8,22]` | quantised horizontal bands; the 50/50 `fine` flip picks the range. |
| `bandPhase` | `number` | `[0, 1)` | per-band drift phase seed (raw `rand()`). |
| `bandDrift` | `number` | `[0.015, 0.09)` | vertical smear amplitude of the venetian-blind reveal. |
| `rowDisplace` | `number` | `[0.0, 0.06)` | per-row horizontal displacement strength. |
| `driftCycles` | `number` (int) | `[1, 3]` | drift cycles per loop — **integer** keeps the seamless loop closed. |
| `tile` | `number` (int) | `[3, 12]` | mosaic downsample tile size. **forward-compat.** |
| `sortThreshold` | `number` | `[0.35, 0.72)` | luma cutoff for the sort/smear mask. **forward-compat.** |
| `sortAxis` | `SortAxis` | `'vertical'` 70% / `'horizontal'` 30% | sort/smear axis. **forward-compat.** |
| `moshDecay` | `number` | `[0.85, 0.98)` | feedback persistence for datamosh. **forward-compat.** |
| `quantLevels` | `number` (int) | `[5, 16]` | posterisation levels (colour quantisation). |
| `grain` | `number` | `[0.04, 0.5)` | film-grain intensity. |
| `dither` | `number` | `[0.2, 0.9)` | ordered-dither intensity. |
| `chroma` | `number` | `0.0`, or `[0.0, 0.6)` with 45% chance | chromatic-bleed intensity; often off. |
| `vignette` | `number` | `[0.1, 0.6)` | vignette intensity. |
| `loopSeconds` | `number` | `[20, 34)` | seamless-loop length, in seconds. |

## v1-active vs forward-compat fields

v1 ships one mode — `bands`, the slit-scan sunset (Target A, the fxhash token). Only some fields
actually reach a shader today:

- **active in v1** — `mode`, `paletteId`, `stopJitter`, the whole sky group (`horizon`,
  `sunElevation`, `sunStrength`), the slit-scan group (`bands`, `bandPhase`, `bandDrift`,
  `rowDisplace`, `driftCycles`), the post group (`quantLevels`, `grain`, `dither`, `chroma`,
  `vignette`), and `loopSeconds`.
- **forward-compat** — `tile` (mosaic), `sortThreshold`, `sortAxis`, and `moshDecay` (sort / mosh).
  These modes don't exist yet.

**Why draw them now if nothing reads them?** Because the draw stream is the contract. If the
forward-compat draws weren't spent today, adding the mosaic/sort/mosh modes later would have to
insert draws mid-stream — shifting every value after them and changing the sky of every
already-minted token. Spending those draws now reserves their slots, so a token minted today keeps a
byte-stable genome when those modes come online in **Target B** (breathe / GitHub Pages). It costs
four draws to keep every past mint honest. See [ROADMAP.md](../ROADMAP.md) Phase 4 and
[DECISIONS.md](./DECISIONS.md).

## genome → fxhash rarity traits

[`deriveFeatures(genome)`](../packages/core/src/features.ts) maps the genome to the human-readable
traits fxhash shows on a token and indexes for rarity. It's a pure function of the genome — same
hash, same features — registered via `$fx.features(...)`. Six traits:

| trait | values | rule |
|-------|--------|------|
| **Palette** | `Sodium` · `Powder` · `Olive` · `Periwinkle` | family of the picked ramp (`getPaletteById(paletteId).family`; defaults `Sodium`). |
| **Band Density** | `Fine` · `Wide` | `Fine` when `bands >= 24`, else `Wide`. |
| **Drift** | `Still` · `Flowing` | `motion = bandDrift + rowDisplace + (driftCycles-1)·0.03`; `Flowing` when `motion > 0.09`. |
| **Processing** | `Clean` · `Grained` · `Degraded` | `wear = grain + dither·0.5 + chroma + (16-quantLevels)·0.03`; `>1.0` → `Degraded`, `>0.55` → `Grained`, else `Clean`. |
| **Perfect Horizon** | `true` / `false` | a clean, level horizon near the golden band: `horizon > 0.42 && horizon < 0.5 && rowDisplace < 0.02`. |
| **Full Corruption** | `true` / `false` | the rare wrecked one: `chroma > 0.4 && grain > 0.35 && quantLevels <= 7`. |

The four palette families — **Sodium** (the `32__OG` sunset), **Powder** (blue sky), **Olive**
(mosaic), **Periwinkle** (dusk) — mirror the reference loops that seeded them
([palettes.ts](../packages/core/src/palettes.ts)).

## see also

- [../README.md](../README.md) — the thesis, the two targets, quickstart.
- [DETERMINISM.md](./DETERMINISM.md) — why byte-identical output is the whole game.
- [DECISIONS.md](./DECISIONS.md) — open calls: Target-A mode, ONCHFS vs IPFS, fx(params) exposure.
- [../ROADMAP.md](../ROADMAP.md) — where the forward-compat modes land.
