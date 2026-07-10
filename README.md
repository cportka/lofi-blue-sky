# lofi blue sky

> (っ◔◡◔)っ ♥ abstraction ♥
> a beautiful blue sky — i've been filming the sky for over a decade
> it is my meditation — sit with me and watch the sky go by
> ˜”°•.˜”°• hello •°”˜.•°”˜

**Version:** 0.6.0 · **License:** MIT · [Roadmap](./ROADMAP.md) · [Docs](./docs) · **Live:** https://cportka.github.io/lofi-blue-sky/

A procedurally generated **lofi sky**, synthesized entirely in a fragment shader from a hash. No
footage, no assets — a slow, meditative, seamless loop of a **clean grid of sky-pixels that pulse
in colour**, in the 1×1 → 2×2 → 4×4 → 1×N lineage the project grew out of. Same hash, same sky, on
every machine, forever.

![a lofi blue sky](./assets/renders/hero.png)

_The same sky, five moments across one loop — the pixels pulse, the sky breathes:_

![loop filmstrip](./assets/renders/filmstrip.png)

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

- **Genesis** (above) — a grid of flat sky-pixels that pulse in colour, in the 1×1 → 2×2 → 4×4 → 1×N
  lineage. **Clean, exact pixels by default**; the venetian-blind slit-scan smear is the rarer
  distorted look. Canonical.
- **Billow** — rolling billowing clouds sweeping across a blue sky, procedural and seamless — clean
  and smooth by default. Young; carries the experimental Phase-4 mosaic mode.
- **Squall** — a clean pixel sky that a **rare squall of datamosh** sweeps through and clears,
  seamlessly (macroblock motion error, cyan/magenta chroma tearing). Mostly calm; corruption is the
  seasoning. Young and experimental.

![Billow — rolling clouds](./assets/renders/billow.png)

| Genesis — clean bars | Genesis — blue pixels | Squall — a passing squall |
|---|---|---|
| ![](./assets/renders/v0.6-genesis-bars.png) | ![](./assets/renders/v0.6-genesis-blue.png) | ![](./assets/renders/v0.6-squall.png) |

## The look

Genesis: a sky is a grid of flat, exact **pixels** (`1×1 → 2×2 → 4×4 → 1×N`) sampled from a sunset
gradient; over a slow 20–34s seamless loop each pixel's sample slides up and down the gradient, so
it **pulses in colour** like a low-res sky. Clean by default — the venetian-blind slit-scan smear
and the ordered-dither "bit-crush" are the rarer, distorted minority. Muted, dusty, quantized
palettes — Sodium, Powder, Olive, Periwinkle. See [docs/AESTHETIC.md](./docs/AESTHETIC.md) and the
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
engine** (Genesis / Billow / Squall) with the chips — the same seed reinterprets under it; **click
the sky** to hide/show the panel; **click any attribute** to reshuffle just that one; **◀ ▶**
undo/redo; **⧉** copies the seed and **↻** rolls a fresh one, side by side in the seed row (which
takes a pasted hash automatically). Save a frame with the OS screenshot. A hand-tweaked sky is
shared as an engine-tagged `g:<engine>:…` token. See [docs/CANON.md](./docs/CANON.md).

Two canonical seeds to try:
`00f50f353cf56cfa55f3b32404db3196e7cef86e37bd4b0fbca9304a8dd6097f` (a clean sodium pixel column) and
`3ebed465933f11af41fb9f999635ca11ea55c1357cdcba0f3d4bc11f9de5ff64` (a clean olive grid).

## Status

**Genesis is canonical** — each seed's DNA (palette, horizon, bands, sun, loop) is locked by
[docs/CANON.md](./docs/CANON.md) + CI. v0.2.0 added the interactive generator; **v0.3.0** made
engines swappable and started **Billow** (rolling clouds); **v0.4.0** added the museum + fxhash
release path; **v0.5.0** opened the Genesis key with 2D pixel splits and added **Squall** (a
datamosh); **v0.6.0** made the whole family **clean pulsating pixel-grids by default** — the sky
that was barely moving now breathes, and the bit-crush is the rare seasoning (Genesis key → v3).
Open design calls are in [docs/DECISIONS.md](./docs/DECISIONS.md); the engine model is in
[docs/ENGINES.md](./docs/ENGINES.md).

---

_lofi blue sky is an art project by Chris Portka ([djpants](https://fxhash.xyz/u/djpants) ·
`djpants.eth`)._
