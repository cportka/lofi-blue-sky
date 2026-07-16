# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog
(https://keepachangelog.com) and the project uses Semantic Versioning (https://semver.org).
Every change bumps the version and adds an entry below.

## [0.8.0] - 2026-07-16

The 1×1 origin becomes half the sky, the Squall earns its name, and Billow gets a real cloud
taxonomy.

### Changed
- **Genesis (key → v5): the 1×1 origin is ~50% of all skies.** The original lofi blue sky was a
  single 1×1 pixel pulsing with colour — now half of all seeds render the **entire frame as ONE
  pixel of sky**, its colour journeying deep through the gradient (a boosted pulse gain so the
  single colour clearly travels, 1–3 cycles per loop). 1×1 is True Clean by definition; the grid
  family fills the other half; every non-True-Clean movement stays individually rare, and the <1%
  Classic golden window (the original canonical picks) is untouched. New **Split: Single Pixel**
  trait; keyVersion 4 → 5; DNA byte-identical; canon re-blessed.
- **Squall (key → v4): squall-ish bursts.** When the burst envelope swells, the sky now takes
  **big wind** — whole rows of blocks dragged sideways in held, snapping shears (the long datamosh
  smears of the reference loops) — and **waves**, a loop-periodic warp bending the frame. Corruption
  ceiling raised (amount up to 0.70), up to 4 bursts per loop, and a new **Winds**
  (Breeze/Gusty/Gale) trait. All of it scales with the envelope, so the seam stays clean.
- **Billow (key → v4): a 20-type cloud taxonomy.** Billow is all about cloud types now — the genome
  picks one of 20 named recipes (Cirrus, Cirrostratus, Cirrocumulus, Altocumulus, Altostratus,
  Stratus, Stratocumulus, Nimbostratus, Cumulus Humilis, Cumulus, Cumulus Congestus,
  **Cumulonimbus**, Mammatus, Lenticularis, Castellanus, Undulatus, Fractus, Contrails, Fog, Fair
  Weather) and draws every cloud parameter inside the type's ranges. Two new shader axes carry the
  variety: horizontal **stretch** (cirrus streaks, lenticular waves) and storm **darken** (nimbus
  greying). New **Clouds** trait names the type; the 80/20 clean/distorted finish stays.
- Featured stills re-shot: the hero is a 13×13 sodium pixel grid, and the **filmstrip is now a 1×1
  sky** — five moments of one pixel journeying through the sunset (the original concept, verbatim).

## [0.7.0] - 2026-07-15

**True Clean** — the entire bar/pixel is exactly one colour and changes as one unit. What v0.6 got
wrong: the sun-bloom's horizontal gradient bled through each bar, so a "clean" bar was a glowing
slice, not a pixel. Now Genesis has *movements*, and True Clean is ~90% of the sky.

### Changed
- **Genesis (key → v4): movements.** Every cell samples the gradient at its cell **centre on both
  axes**, so the whole bar/pixel is one flat colour changing as a unit, each cell on its own phase —
  the pixels of a low-res sky video. The movement split: **True Clean ~90%**, **Clean Sweep ~6%**
  (the preserved v0.6 look — the sun-bloom sweeping through flat bars), **Distorted ~4%** (smear +
  full crush), and **Classic <1%** — the original v1 slit-scan, in a "golden window" of the key
  placed so the **two original canonical picks land in it** and render as the v1 beauties they were
  first loved as (raw crush, drift, smear). True Clean also drops the cell-edge seams (a flat pixel
  is one colour edge to edge). keyVersion 3 → 4; canon re-blessed; DNA byte-identical.
- **True Horizon, visualized** (renames Perfect Horizon). The trait is no longer label-only: seeds
  in the window get a crisp colour edge pushed into the gradient exactly at the horizon — always
  distinguishable, in every movement (in True Clean it lands between two pixel rows).
- **Squall (key → v3): more movement.** Sky pulse amplitude/cycles lifted (0.06–0.16 × 2–5 cycles),
  each pixel now breathes on its own per-cell phase, and the corruption hits harder when it lands
  (motion 0.05–0.22, snappier 5–12 step judder, streak 0.1–0.7).
- **Billow (key → v3): wider weather + 80/20 clean.** Coverage 0.25–0.78 (near-clear to
  near-overcast), wind 1–4, scale/softness/churn/horizon/sun all widened; an explicit finish flag
  makes ~80% of skies clean (near-zero crush) and ~20% distorted (full lofi crush).
- **Museum:** all 23 released-edition gifs from `assets/skies/` now live on the page as an animated
  grid ("the skies").
- Featured stills re-shot (`hero`, `filmstrip`, `billow`, `v0.7-*`, including the Classic canon).

## [0.6.0] - 2026-07-10

The whole family becomes **clean pulsating pixel-grids by default** — rooted in the project's
origin (a 1×1 sky-pixel, then 2×2, 4×4, 1×9 …). Motion returns; the glitch/bit-crush becomes rare.

### Changed
- **Genesis (key → v3): clean is the norm, and it pulses.** A sky is a grid of flat, exact pixels
  whose colour **pulses** over the loop (the sample slides up and down the gradient) — clean pixels
  are now ~75% of seeds (was ~28%), and clean no longer means *static* (the "barely moving" bug:
  clean had switched drift off — now it keeps the pulse, only the smear is off). On clean seeds the
  ordered-dither/grain/chroma "bit-crush" is pulled right down, so the pixels read as flat, exact
  colour; the venetian-blind smear + full crush is the rarer **distorted** minority. Pixel-grid
  splits are more prominent (blocks ~30%), size skewed small, and the **1×1 origin** (a single
  pulsing colour) is a rare possibility. keyVersion 2 → 3; canon re-blessed (DNA byte-identical).
- **Squall (key → v2): majority clean.** The calm base is now itself a clean grid of pulsing
  sky-pixels; the datamosh is a **rare** spike — corruption fraction skews light and the burst
  envelope is punchier, so most of the loop (and most seeds) is the clean pixel sky.
- **Billow (key → v2): leaner crush.** Lighter grain/dither and rarer chroma, so most Billow skies
  are clean, smooth clouds.
- **HUD:** the **museum ↗** link moved up into the header row, left of the ◀ ▶ arrows.
- **Featured stills regenerated** (`assets/renders/hero`, `filmstrip`, `billow`, `v0.6-*`) to the
  new clean-pixel look; added `scripts/make-stills.mjs` to regenerate them.

## [0.5.0] - 2026-07-09

Genesis grows a second axis, a third engine arrives, and the generator's HUD is decluttered —
grounded in a full analysis of the released sky loops in `assets/skies/`.

### Added
- **Genesis v2 — clean finish + 2D pixel splits.** Alongside the classic single-column slit-scan
  (still preferred, ~56% of seeds), Genesis can now split the sky into a `hbands × bands` **grid**
  (up to ~40 columns, skewed small), render a **clean** finish (crisp flat bars/pixels, drift +
  smear off), or a square **block** mosaic of large pixels. New **Split** (Bars/Grid/Blocks) and
  **Finish** (Clean/Distorted) traits, both clickable to reroll.
- **Squall — a third engine (stateless datamosh).** A calm sky that a *squall* of signal corruption
  sweeps through and clears, seamlessly, over the loop (from the `13` reference). Macroblock motion
  error + cyan/magenta chroma tearing + held-frame snaps + horizontal sort streaks, all a periodic
  function of the loop phase (no feedback history). Own key, palettes, and traits (Corruption /
  Squalls / Blocks / Tearing + Signal Lost / Clear Skies).
- Design-log stills for the new Genesis looks and Squall (`assets/renders/v0.5-*`), and a reusable
  `render.mjs frameAt <hash> <engine> <t>` for mid-loop stills.

### Changed
- **Genesis key opened (keyVersion 1 → 2).** The first two of the four reserved draws now drive the
  v2 geometry, so what a hash renders can change — but every field up to `loopSeconds` is
  byte-identical, so each seed keeps its **DNA** (palette, horizon, bands, colour, post) and only the
  new geometry overlays. Seeds that land on 1 column / not-clean / not-blocks (≈⅓) are pixel-identical
  (proven by the render golden). Canon picks re-blessed under v2. Pre-release, nothing minted.
- **HUD decluttered.** Removed the confusing WebM **loop** button and the redundant **png** button
  (the OS screenshot covers saving a frame). "New sky" is now a bare ↻ icon in the seed row, right of
  copy. Museum link shortened to "museum ↗". Web bundle 38.4 → 45.7 KB (the third engine); fxhash
  token unchanged at 20.2 KB (Squall tree-shaken out).
- `assets/` restructured into `skies/` (the 23 historical released loops), `renders/` (generator
  stills), and `palettes/`, each documented.

## [0.4.0] - 2026-07-08

Position lofi blue sky as the internet art project it is, and document the real fxhash release path.
No engine/genome changes — docs, a museum, and one new site page.

### Added
- **`docs/fxhash.md`** rewritten around the actual fxhash **art-coin / Open-form** create wizard
  (all 8 steps + every field, transcribed) + a release worksheet. Notes that Open-form
  reroll-and-branch is exactly the engine's reshuffle + `g:` genome tokens.
- **`docs/PROJECT.md`** — lofi blue sky as an internet art project: identity (Chris Portka / djpants
  / `djpants.eth` / lofi_blue_sky) and the full cross-platform presence.
- **`docs/MUSEUM.md`** + **`museum.html`** (a new page on the site, linked from the generator) — a
  library of the released animated skies, linking OpenSea / objkt / Paras / Instagram / X / YouTube /
  Bandcamp, framed as the source loops that became the engines.
- **`docs/DESIGN-LOG.md`** + **`assets/iterations/`** — the generator's visual history (v0.1 Genesis →
  v0.3 Billow) with labeled stills.
- README "The project" section with the presence links.

### Notes
- Marketplace pages are egress/bot-blocked from this environment, so the museum **links out** to the
  live collections (the source of truth) rather than mirroring media; it's a curated index that grows.

Make sky algorithms swappable, and start the second one. Genesis is unchanged — every seed renders
byte-identically (render goldens confirm). See `docs/ENGINES.md`.

### Added
- **Engine framework** (`packages/core/src/engines`): an `Engine` interface (key + shaders +
  features + renderer), a registry, and an engine-aware `createSky({ engine, hash })`. Genesis is
  migrated in as an adapter over the existing, frozen pipeline (no pixel change).
- **Billow engine** — rolling billowing clouds sweeping across a blue sky: procedural periodic FBM
  with an integer-wind horizontal drift + time-circle churn (seamless), its own key / palettes /
  features, and a block of **reserved blank draws** for future design.
- **Phase 4 (experimental)**: `mosaic` mode live in Billow (the `31` downsample look); `sort`/`mosh`
  reserved. Genesis stays `bands`-only.
- **Engine switcher** in the full-screen web generator (Genesis ⇄ Billow); a pasted hash reinterprets
  under the selected engine; **engine-tagged** share tokens (`g:<engine>:…`); engine in the URL.
- Tests for the registry, Billow determinism/reserved space, and engine-tagged tokens (37 total).
- `docs/ENGINES.md`; `assets/billow.png`.

### Changed
- **Opened the Genesis key** with 4 reserved draws (pre-release headroom) — **no seed's pixels
  change**; the param snapshots gain a trailing `reserved[]` block.
- `createSky`'s `engine` option is now an engine object (defaults to Genesis), so the fxhash token
  tree-shakes the other engines out and stays ONCHFS-lean (~18 KB).

## [0.2.0] - 2026-07-07

Canonize v0.1.0 and make the generator interactive. **No change to any seed's rendered sky** — the
genome, palettes, and shaders are frozen (see `docs/CANON.md`); everything here sits above that line.

### Added
- **Canon**: `docs/CANON.md` + `packages/core/test/canon.test.mjs` pin the exact genome of the
  canonical seeds in CI, and `scripts/render-goldens.json` pins their pixels. Two of Chris's picks
  seeded the anchors.
- **Interactive generator** (`targets/web`): live seed box (paste a hash or `g:…` token — applies
  automatically, no button); **click the sky** to toggle the panel; **click any attribute** to
  reshuffle just that one; **◀ ▶** undo/redo history; **⧉** copy-with-check; **png** frame save and
  **loop** one-loop WebM recording.
- **Exploration helpers** in core (never touch the seed→genome map): `randomHashByPolicy`
  (rejection-sample to bias a family rarer), `rerollFeature` (change one attribute), and
  `encodeGenome`/`decodeGenome` (share a hand-tweaked sky as a `g:…` token).

### Changed
- **Olive is rarer in "new sky"** (~10%, was ~25%) via exploration policy — a pasted Olive hash
  still renders Olive.
- **Feature tuning (labels only, no pixel change)**: widened *Perfect Horizon* (~16%) and
  *Full Corruption* (~4%) so the rare flags actually vary. They freeze at mint.

## [0.1.0] - 2026-07-07

First light. Phases 0–1 of the roadmap: the shared core, the slit-scan sunset, and both targets
building and rendering.

### Added
- **Repo bootstrap (Portka standard)** via the `repo-bootstrap` plugin: `portka-tools` marketplace
  + plugins, workflow `CLAUDE.md`, git/gh permissions allowlist, enforced SemVer version sync, and
  CI (extended with a Node toolchain for this repo's real build).
- **Shared core** (`packages/core`, zero runtime dependencies, TypeScript):
  - `rng.ts` — `fxrand`-compatible deterministic PRNG (xmur3 → sfc32, integer-only).
  - `hash.ts` — 64-hex hash validate / normalize / random.
  - `genome.ts` — `hash → params`, fixed draw order, locked to golden snapshot.
  - `palettes.ts` — 12 curated ramps across Sodium / Powder / Olive / Periwinkle.
  - `features.ts` — deterministic fxhash rarity traits.
  - `loop.ts` — seamless loop phase manager (periodic in `loopT`).
  - `gl/` — WebGL2 context/program/FBO helpers, multi-pass pipeline, and the GLSL passes
    `sky` → `slitscan` → `post` (dither, posterize, chromatic bleed, grain, vignette).
  - `engine.ts` — `createSky()`, the one call both targets drive.
- **Target A — fxhash** (`targets/fxhash`): `$fx` shim (hash · rand · features · preview), build to
  a single self-contained ~16 KB `index.html` + `upload.zip`, with self-containment + size checks.
- **Target B — GitHub Pages** (`targets/web`): live browser generator (randomize, seed input,
  save PNG, feature readout, `?seed=` URL sync), built to the committed repo-root `index.html`.
- **Tests**: 22 deterministic unit tests (rng/genome/palettes/loop/features) run under `node --test`;
  Portka `tests/cases/*.sh` for typecheck, unit, self-contained build, and version mirror.
- **Verification harness** (`scripts/render.mjs`): renders in real headless Chromium and proves
  pixel-level determinism and a seamless loop.
- **Docs + assets**: README, ROADMAP, `docs/` (architecture, aesthetic, genome, determinism,
  fxhash, decisions), palette reference sheet, hero still, and loop filmstrip.

### Notes
- Target A is hash-locked (no fx(params) yet) and stateless (perfect loop); feedback modes are
  reserved for Target B. See `docs/DECISIONS.md`.
