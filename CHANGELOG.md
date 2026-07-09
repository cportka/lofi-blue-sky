# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog
(https://keepachangelog.com) and the project uses Semantic Versioning (https://semver.org).
Every change bumps the version and adds an entry below.

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
