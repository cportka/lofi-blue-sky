# Engines — swappable sky algorithms

A **sky** is produced by an **engine**: a self-contained algorithm with its own **key**
(`hash → params`), shaders, and rarity features. Engines are swappable, so one core + one UI can ship
more than one look. Today there are two:

| Engine | Look | Status |
|--------|------|--------|
| **Genesis** | horizontal slit-scan sunset (the `32__OG` look) | **frozen** — canonical, every seed byte-identical |
| **Billow** | rolling billowing clouds across a blue sky (toward `35`) | **young** — evolving; key reserves blank space |

![Billow](../assets/renders/billow.png)

## The interface

Each engine implements [`Engine`](../packages/core/src/engines/types.ts):

```ts
interface Engine<P extends BaseParams> {
  id; name; description;
  keyVersion;                              // bump on any key change
  genome(rand): P;                          // hash → params (the key)
  features(params): Features;               // params → rarity traits
  createRenderer(gl, iw, ih): EngineRenderer<P>;   // its GL passes
  reroll?(params, featureKey, rand): P;     // optional: change one attribute (browser)
}
```

The registry ([`engines/registry.ts`](../packages/core/src/engines/registry.ts)) lists them;
`getEngine(id)` looks one up. `createSky(canvas, { engine, hash })` runs one.

```
hash ─► engine.genome ─► params ─► engine.createRenderer ─► pass₁ … ─► post ─► screen
        (the key)                    (the shaders)
```

## Keys, versions, and reserved space

An engine's **key** is its `genome()` draw order — the determinism contract (see
[DETERMINISM.md](./DETERMINISM.md), [CANON.md](./CANON.md)). Rules:

- **Frozen once minted.** Reordering/inserting/removing a draw changes every seed → a new key
  (bump `keyVersion`, MAJOR).
- **Reserved blank draws.** A young engine draws a block of unused values at the end of its key
  (`BILLOW_RESERVED = 8`), so new params can fill that space later without shifting existing fields.
- **Opening a key "a little".** You can *append* reserved draws to a mature key (Genesis gained
  `GENESIS_RESERVED = 4` in v0.3.0) — because they're drawn last and unused by the shaders, **every
  seed's pixels stay byte-identical** (the render goldens prove it). Only the params object grows.

## One engine per token; both in the app

`createSky`'s `engine` option takes an **engine object**, defaulting to Genesis. So a single-engine
target — the **fxhash token** — imports just `createSky` (→ Genesis) and the bundler **tree-shakes
the other engines out** (the token stays ~18 KB, ONCHFS-lean). The **web app** imports the registry
for its switcher and carries all engines.

## Sharing across engines

A pure-hash sky is shared as its hash (its engine rides in the URL / UI). A hand-tweaked sky is
shared as an **engine-tagged token** — `g:<engineId>:<base64url(params)>` — so it reproduces exactly
on the right engine ([codec.ts](../packages/core/src/codec.ts)).

## Experimental modes (Phase 4)

Phase-4 glitch modes live as an **experimental** `mode` in Billow's key: `clouds` and `mosaic` (the
`31` downsample look) are live; `sort` / `mosh` (feedback modes) are **reserved** — named but not yet
implemented, held in the blank key space until the design settles. Genesis stays `bands`-only.

## Adding an engine

1. `engines/<name>/` — `genome.ts` (the key, with reserved draws), shaders under `passes/`,
   `features.ts`, `renderer.ts` (an `EngineRenderer`), and `index.ts` exporting the `Engine`.
2. Append it to `ENGINES` in `registry.ts`.
3. Give it unit tests (determinism, in-range, features) and — if it's a candidate for canon — pixel
   goldens. That's it; the UI switcher and share codec pick it up automatically.
