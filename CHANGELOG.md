# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog
(https://keepachangelog.com) and the project uses Semantic Versioning (https://semver.org).
Every change bumps the version and adds an entry below.

## [0.3.0] - 2026-07-08

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
