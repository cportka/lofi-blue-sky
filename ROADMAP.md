# Roadmap

Two products, one shared GLSL core. Ship the frame (Target A) to a mintable state, **then** let it
breathe (Target B). Phases 0–3 are a complete fxhash piece; everything after is the generator.

Legend: ✅ done · 🟡 in progress · ⬜ planned

## Phase 0 — Core scaffold ✅ (v0.1.0)
- npm project, TypeScript project-references, zero runtime dependencies.
- `rng.ts` — `fxrand`-compatible deterministic PRNG (xmur3 → sfc32, integer-only).
- `hash.ts` — hash validate / normalize / random.
- `genome.ts` — `hash → params`, fixed draw order.
- WebGL2 quad + FBO/ping-pong helpers (`gl/context.ts`).
- Determinism unit test + a golden genome snapshot.

## Phase 1 — Sky + slit-scan ✅ (v0.1.0)
- `sky.frag` — sunset gradient + hazy sun glow.
- `slitscan.frag` — the `32__OG` look: quantized drifting bands + per-row displacement.
- Palettes v1 — 12 curated ramps across 4 families (Sodium / Powder / Olive / Periwinkle).

## Phase 2 — Post + loop 🟡 (v0.1.0 core landed)
- `post.frag` — ordered dither, posterize, chromatic bleed, grain, vignette. ✅
- Seamless-loop manager — periodic-in-`loopT`, integer drift cycles. ✅ (verified in-browser)
- ⬜ Crossfade helper for the eventual feedback modes (only needed once sort/mosh land).

## Phase 3 — fxhash target 🟡 (ship-ready groundwork in v0.1.0)
- `$fx` wiring via a compatible shim (hash · rand · features · preview). ✅
- Self-contained single-file bundle + `upload.zip` (index.html at root). ✅ (~16 KB)
- Rarity features registered. ✅
- ⬜ Swap the shim for the real `@fxhash/project-sdk` snippet at publish; validate on
  fxhash.xyz/sandbox on two machines. → **mintable here.** See [docs/fxhash.md](./docs/fxhash.md).
- ⬜ fx(params): expose palette + band density at mint (lock the rest). See
  [docs/DECISIONS.md](./docs/DECISIONS.md).

## Phase 4 — Other modes ⬜
- `mosaic.frag` — downsample + tile quantize (the `31` look). Stateless, easy.
- `sort.frag` / `datamosh.frag` — the hard, feedback-buffer modes (the `35` look). Requires the
  ping-pong history buffer and a loop-closure strategy (§ seamless-loop in DETERMINISM.md).

## Phase 5 — Breathe target 🟡 (started in v0.2.0)
- Interactive generator: seed box, click-the-sky HUD toggle, click-an-attribute reshuffle with
  ◀ ▶ undo/redo, `g:…` genome tokens for edited skies, copy/share. ✅
- WebM one-loop recording + PNG frame save. ✅ (MediaRecorder; MP4 + supersampled ≥3000px still to come)
- ⬜ All modes switchable, larger internal resolution, high-res PNG (≥3000px) — the pre-rendered
  editions for other chains + social assets.

_v0.1.0 is canonized and frozen — see [docs/CANON.md](./docs/CANON.md). Later phases sit above the
seed→pixels contract and never change what a hash renders (a new genome would be a MAJOR bump)._

## Phase 6 — Audio + decentralized deploy ⬜
- Seeded ambient/lofi bed (muted by default), synced to the visual loop.
- Arweave/IPFS build behind `djpants.eth`; resolve the `lofibluesky.io` question.

---

**Definition of done — Target A:** slit-scan sunset synthesized entirely in-shader from `$fx.hash`;
same hash → identical output on two machines; seamless loop; clean `$fx.preview()` thumbnail; passes
the fxhash sandbox; bundle small enough for ONCHFS; features + fx(params) wired; LICENSE included.
