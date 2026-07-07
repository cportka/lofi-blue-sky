# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog
(https://keepachangelog.com) and the project uses Semantic Versioning (https://semver.org).
Every change bumps the version and adds an entry below.

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
