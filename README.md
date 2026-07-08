# lofi blue sky

> (っ◔◡◔)っ ♥ abstraction ♥
> a beautiful blue sky — i've been filming the sky for over a decade
> it is my meditation — sit with me and watch the sky go by
> ˜”°•.˜”°• hello •°”˜.•°”˜

**Version:** 0.4.0 · **License:** MIT · [Roadmap](./ROADMAP.md) · [Docs](./docs) · **Live:** https://cportka.github.io/lofi-blue-sky/

A procedurally generated **lofi glitch-sky**, synthesized entirely in a fragment shader from a
hash. No footage, no assets — a slow, meditative, seamless loop of a slit-scan sunset built from
math. Same hash, same sky, on every machine, forever.

![a lofi blue sky](./assets/hero.png)

_The same sky, five moments across one loop — the bands drift, the horizon breathes:_

![loop filmstrip](./assets/filmstrip.png)

## The thesis

**The masterpiece is in the GLSL — one idea executed completely. The platform is the frame.**

One shared engine, two frames:

- **Target A — the fxhash token** (`targets/fxhash/`). A single, restrained slit-scan sunset,
  deterministic from `$fx.hash`, bundled into one **self-contained ~16 KB HTML** with no network
  and no external resources — small enough to store fully on-chain (ONCHFS). The disciplined
  masterpiece: it thrives inside fxhash's limits instead of fighting them.
- **Target B — breathe** (`targets/web/`). The generator with the cap off — for now, a small
  GitHub Pages preview of the live engine (randomize, paste a seed, save a frame). It grows into
  the full edition: all glitch modes, audio, high-res + video export.

Both are built from the **same GLSL core + the same genome** — two entry points, one shader set.

## The project

lofi blue sky is a long-running **internet art project** by Chris Portka (**djpants** ·
`djpants.eth`) — a decade of filming the sky, distilled into slow, glitched loops. This repo is the
generative engine; the wider project is a body of released animated skies:
[Website](https://lofibluesky.io/) ·
[OpenSea](https://opensea.io/collection/lofibluesky) ·
[objkt](https://objkt.com/collections/KT1LYDrLXqJBgrs414HjER6qTqAgre2moq3u) ·
[Paras](https://paras.id/lofibluesky.near) ·
[Instagram](https://www.instagram.com/lofi_blue_sky/) ·
[X](https://x.com/lofi_blue_sky).

See [docs/PROJECT.md](./docs/PROJECT.md) for the full picture and [the museum](./docs/MUSEUM.md) for
the library of released skies.

## Engines

One core, swappable **engines** — each a sky algorithm with its own hash→params key and shaders
([docs/ENGINES.md](./docs/ENGINES.md)):

- **Genesis** — the horizontal slit-scan sunset (above). Frozen and canonical.
- **Billow** — rolling billowing clouds sweeping across a blue sky, procedural and seamless. Young;
  carries the experimental Phase-4 mosaic mode.

![Billow — rolling clouds](./assets/billow.png)

## The look

Genesis: slit-scan horizontal-band skies — a sunset gradient quantized into drifting bands, each
phase-shifted into a venetian-blind smear, with per-row displacement, ordered dither, posterization,
chromatic bleed and grain. Slow 20–34s seamless loops. Muted, dusty, quantized palettes — Sodium,
Powder, Olive, Periwinkle. See [docs/AESTHETIC.md](./docs/AESTHETIC.md) and the
[palette sheet](./assets/palettes/palettes.svg).

## Quickstart

```bash
npm install          # dev tooling only (typescript, esbuild) — zero runtime dependencies
npm test             # version sync + typecheck + deterministic unit suite + self-contained build
npm run build        # → targets/fxhash/dist/index.html (+ upload.zip) and ./index.html (Pages)
npm run render       # local: render in headless Chromium, verify determinism + seamless loop
```

Open `targets/fxhash/dist/index.html?fxhash=<any-hex>` or the root `index.html` in a browser.

## How it works

```
$fx.hash ─► genome (hash → params) ─► engine ─► sky.frag ─► slitscan.frag ─► post.frag ─► screen
            (deterministic DNA)                  gradient    drifting bands   dither/grain
```

- `packages/core/` — the platform-agnostic engine: a deterministic RNG, the genome, curated
  palettes, the WebGL2 pipeline, and the GLSL passes. Never imports `$fx` or the DOM UI.
- `targets/fxhash/` — wires `$fx` (hash · rand · features · preview) and builds the token bundle.
- `targets/web/` — the GitHub Pages generator UI.

Determinism is the whole game: **same hash → byte-identical params → byte-identical pixels**,
verified in CI and in a real browser. See [docs/DETERMINISM.md](./docs/DETERMINISM.md) and
[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Explore (the live generator)

On [the site](https://cportka.github.io/lofi-blue-sky/) (full-screen, always looping): **switch
engine** (Genesis / Billow) with the chips — the same seed reinterprets under it; **click the sky**
to hide/show the panel; **click any attribute** to reshuffle just that one; **◀ ▶** undo/redo;
**↻ new sky** rolls a fresh seed; the seed box updates live and takes a pasted hash automatically;
**⧉** copies it; **png** saves the frame and **loop** records one seamless loop as WebM. A
hand-tweaked sky is shared as an engine-tagged `g:<engine>:…` token. See
[docs/CANON.md](./docs/CANON.md).

Two canonical seeds to try:
`00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f` (a sodium sunset) and
`3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64` (an olive sky).

## Status

**Genesis v0.1.0 is canonical and frozen** — its genome, palettes, and shaders never change, so
every Genesis seed regenerates byte-identically (locked by [docs/CANON.md](./docs/CANON.md) + CI).
v0.2.0 added the interactive generator + WebM export; **v0.3.0** makes engines swappable and starts
**Billow** (rolling clouds) with the experimental Phase-4 mosaic mode — all without changing any
Genesis seed's pixels. Open design calls (storage, params) are in
[docs/DECISIONS.md](./docs/DECISIONS.md); the engine model is in [docs/ENGINES.md](./docs/ENGINES.md).

---

_lofi blue sky is an art project by Chris Portka ([djpants](https://fxhash.xyz/u/djpants) ·
`djpants.eth`)._
