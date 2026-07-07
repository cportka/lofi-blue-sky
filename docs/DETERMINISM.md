# Determinism

Determinism is the whole game. *lofi blue sky* is a code-NFT: the artwork is not a file, it is a
program plus a hash. The promise a collector buys is **same hash → same sky, forever, everywhere** —
the identical pixels on their phone today, on an archival render in ten years, on any GPU, in any
browser. If the same `$fx.hash` could produce two different skies, there is no artwork to own.

This is also a hard platform requirement, not an aesthetic preference. fxhash re-runs the token on
its own machines to generate the preview and to verify the piece; a token that renders differently
on two runs is **rejected**. And because Target A is meant to live on-chain via **ONCHFS**, there is
no server to fall back on and nothing external to fetch — the sky must be reconstructed from the
hash alone, byte for byte, every time.

So determinism is enforced at three layers, each covered below and each pinned by a test:

1. the **RNG** — a hash turns into the same stream of numbers on every machine.
2. the **genome** — that stream is consumed in a fixed order to yield identical params.
3. the **render** — those params drive a stateless, periodic shader whose frames are reproducible
   and whose loop closes seamlessly.

See also [README](../README.md) · [ROADMAP](../ROADMAP.md) · [open decisions](./DECISIONS.md).

```
$fx.hash ──► xmur3 ──► [4 × 32-bit seed] ──► sfc32 ──► rand() : ()→[0,1)
  64 hex      string       integer-only        PRNG        the stream
                             math                              │
                                                               ▼
                                            genome(rand)  fixed draw order
                                                               │
                                                               ▼
                                         uniforms ─► sky ─► slitscan ─► post ─► pixels
                                          + loopT∈[0,1)   gradient   bands   dither/grain
```

## the rng — integer-only, byte-identical

On the real platform fxhash injects `$fx.rand()`: a `() => number` in `[0, 1)`. The engine only ever
consumes that *shape* — it never depends on which PRNG produced it. For the browser target and for
tests we supply an identical shape from a hash, using integer-only math so the sequence is
byte-identical across machines, architectures, and JS engines.

Two well-understood, fully-integer primitives do the work (`packages/core/src/rng.ts`):

| step | function | what it does |
|------|----------|--------------|
| hash → seeds | `xmur3(str)` | folds the hash string into a generator of successive 32-bit integers via `Math.imul` + bit rotations, returning each as `h >>> 0` (unsigned 32-bit) |
| seeds → stream | `sfc32(a,b,c,d)` | Small Fast Counter: four 32-bit seeds → a PRNG, all ops masked with `\| 0` / `>>>`, returning `(t >>> 0) / 4294967296` |

`createRng(seed)` wires them together — `xmur3(seed)` is pumped four times to seed `sfc32`:

```ts
const h = xmur3(seed);
return sfc32(h(), h(), h(), h());
```

Why this is safe where naive code is not: there is **no floating-point accumulation** in the state.
Every operation is a 32-bit integer op (`Math.imul`, `^`, `<<`, `>>>`, `| 0`), which the ECMAScript
spec defines exactly — so `x87` vs SSE, ARM vs x86, V8 vs JSC all compute the same bits. The single
division by `2^32` at the very end is an IEEE-754 divide of two exact integers, which is also
identically rounded everywhere. `createRng('…deadbeef')` yields the same doubles on a laptop, a CI
runner, and an fxhash preview box.

`hash.ts` guards the front door. `normalizeHash` passes a valid 64-hex hash straight through and
folds any other string deterministically into 64 hex chars, so the generator can be driven from a
typed seed without ever throwing — same input, same output. `genomeFromHash` is the one-liner most
callers use: `genome(createRng(normalizeHash(hash)))`.

## the genome — a fixed draw order

The **genome** is `hash → params`, the DNA of a token (`packages/core/src/genome.ts`). `genome(rand)`
draws from the stream in a **fixed order** to fill every field. Because it accepts any `fxrand`-shaped
function, the exact same code path runs on fxhash (pass `$fx.rand`) and in the browser/tests (pass
`createRng`).

The order of `rand()` calls **is the determinism contract**. Draws happen in this sequence:

1. **palette** — pick one of the curated ramps across the four palette families (Sodium, Powder,
   Olive, Periwinkle)
2. **stopJitter** — `MAX_STOPS` (6) per-stop perturbations ("curate, then perturb")
3. **sky** — `horizon`, `sunElevation`, `sunStrength`
4. **slit-scan** — a `fine`/coarse coin-flip, then `bands`, `bandPhase`, `bandDrift`, `rowDisplace`,
   `driftCycles`
5. **forward-compat modes** — `tile` (mosaic), then `sortThreshold`, `sortAxis`, `moshDecay`
   (sort/mosh) are drawn now even though v1 only ships `bands`
6. **colour + post** — `quantLevels`, `grain`, `dither`, `chroma`, `vignette`
7. **loop** — `loopSeconds` (20–34s)

Two subtleties that keep it robust:

- **The draw count is fixed at 27; no branch changes it.** `bands` picks between a fine (24–48) and a
  coarse (8–22) range, but *both arms draw exactly one integer*, so the stream position is stable.
  `chroma` rolls its on/off `chance` **and** its magnitude `range` *unconditionally*, then gates the
  value (`chromaOn ? chromaMag : 0`) — so both numbers are always spent and nothing downstream shifts.
  Determinism only requires the draw *sequence* to be a pure function of the seed; keeping the *count*
  fixed too is the belt-and-braces version, and it is what the genome does.
- **Forward-compat fields are drawn on purpose.** `mode` is locked to `bands` in v1, but `tile`,
  `sortThreshold`, `sortAxis`, and `moshDecay` are still consumed so a token minted today keeps a
  **stable genome** when later modes come online in Target B. Removing those draws would shift every
  field after them — a genome-breaking change.

### the golden snapshot locks it

`packages/core/test/genome.test.mjs` freezes the whole contract. For a fixed hash
(`…deadbeef`) it asserts the genome is **deep-equal to a hand-checked `GOLDEN` object** — every
float, down to `horizon: 0.4920364335924387` and `loopSeconds: 20.59140261122957`.

If anyone reorders the draws, shifts a range, or adds/removes a field, this test fails **on purpose**.
That failure is the signal: a token minted under the old genome must keep rendering identically, so a
genome change is a **breaking change** and needs a major version bump (per the repo's SemVer rule) and
an entry in [open decisions](./DECISIONS.md) — never a silent edit. The same file also checks that
the same hash yields an identical genome across independent RNG instances, that different hashes
diverge, that 400 generated genomes stay in-range and well-formed, and that a plain seed string folds
deterministically without throwing.

## reality check — synthesize, don't sample

The reference loops that seeded this project *look like* processed **footage** — a real sunset run
through a slit-scan, a real sky datamoshed. The instinct is to bundle that video and post-process it.
The token cannot do that, for two independent reasons:

- **size** — Target A is a single self-contained ~16 KB HTML small enough for ONCHFS. A video is
  orders of magnitude too large and would defeat on-chain storage.
- **determinism** — decoding bundled video introduces exactly the non-determinism we forbid: codecs,
  color conversion, and frame timing differ across browsers. There would be no "byte-identical
  pixels" guarantee left.

So the token **synthesizes** the glitch procedurally, in-shader, from the hash. There is no footage
anywhere in the pipeline: `sky` draws the sunset gradient from the palette, `slitscan` quantizes it
into drifting bands, and `post` lays dither/posterize/chroma/grain on top. The **slit-scan** and
mosaic looks are perfect for this because they reproduce the *feel* of processed footage from pure
math, cheaply — a few `texture()` reads per pixel, no history, no assets. The masterpiece is in the
GLSL; the video was only ever a mood board.

## seamless loop — periodic in loopT, static grain

A meditative sky has to loop with no visible seam. The engine never hands wall-clock time to the
shaders — it hands a **normalized loop phase** `loopT ∈ [0, 1)`. `packages/core/src/loop.ts`
computes it: `loopPhase(t, loopSeconds) = (t mod loopSeconds) / loopSeconds`, wrapped positive.

The invariant is simple and mechanical:

> every time-varying term is a periodic function of `loopT`, and everything else is static.

Concretely, in the shaders:

- **slit-scan drift** — `slitscan.ts`:
  `drift = uBandDrift * sin(TAU * (uDriftCycles * uLoopT + seed) + uBandPhase * TAU)`.
  `uDriftCycles` is an **integer** (1–3), so the term completes a whole number of cycles over the
  loop. At `loopT = 0` and `loopT → 1` the argument differs by exactly `TAU * uDriftCycles` — an
  integer number of turns — so the sine is identical.
- **per-row displacement** — `slitscan.ts`: `xdisp = uRowDisplace * rowN * sin(TAU * (uLoopT + seed))`.
  Frequency 1, same closure argument.
- **grain & dither** — `post.ts`: `hash21(ip)` / `ditherBayer(ip)`, where `ip = floor(vUv *
  uInternalRes)` is the **internal-resolution** pixel grid, not `gl_FragCoord`. Two consequences: they
  have **no `loopT` term at all** (static → never break the loop), and they key off the seed-stable
  internal grid rather than the display framebuffer, so the noise/dither scale with the lofi blocks
  and a token looks identical at any display size. Chroma, posterize, and vignette are likewise
  time-invariant.

```
loopT:  0 ──────────────────────────► 1
        │  sin(TAU·k·loopT)  k∈ℤ       │
frame:  ●══════════════════════════════●
        └── identical (whole # of turns)┘   ⇒  no seam
```

Because the drift and displacement close on a whole number of turns and everything else is static,
the frame approaching `loopT → 1` equals the frame at `loopT = 0`. This works **only because the
slit-scan mode is stateless** — each frame is a pure function of `(genome, loopT)`, with no history.
That is exactly why **Target A is stateless**. The feedback modes (`sort`/`mosh`, the datamosh look)
carry a ping-pong history buffer that **drifts** and does not trivially close a loop; solving that
closure is deferred to **Target B** — see the [roadmap](../ROADMAP.md) and
[open decisions](./DECISIONS.md).

## how it is verified

Two layers of tests, one on the CPU and one on a real GPU.

| layer | file | what it proves |
|-------|------|----------------|
| genome | `packages/core/test/genome.test.mjs` | `hash → params` is byte-identical to the golden snapshot; in-range; stable across RNG instances. Runs in CI on every push/PR. |
| render | `scripts/render.mjs` | `params → pixels` is byte-identical, and the loop closes — in real headless Chromium (WebGL2). A local dev tool, not CI. |

`render.mjs` drives the compiled engine through Playwright + Chromium and runs two checks per hash:

- **pixel determinism** — set up a hash, `renderAt(3.0)`, read pixels; do it again from scratch;
  assert `meanAbsDiff === 0`. Same hash → the exact same bytes out of the GPU.
- **seamless loop** — read pixels at `loopT = 0` and at one frame before the loop closes
  (`renderAt(L * (1 - 1/840))`); assert the RGB `meanAbsDiff` is `< 8` (a few % of a 0–255 channel —
  the tiny residual is sub-frame phase, not a seam). It *also* samples several mid-loop offsets and
  asserts real **motion** (`> 0.3`), so a mistakenly static frame can't pass the closure check.
- **pixel golden** — `render.mjs golden` compares a downsampled average-colour signature for a few
  fixed hashes against `scripts/render-goldens.json` with a small tolerance, catching accidental
  shader edits. Because GPU floats vary slightly across drivers, this is a same-driver regression
  guard, not a cross-machine proof — that guarantee lives in the param-level golden above. It also
  captures a small gallery of stills for the eye.

Together: the golden test proves the hash always yields the same **params**; the browser checks prove
those params always yield the same **pixels** and a **seamless loop**. That closes the loop from
`$fx.hash` to the sky — the same sky, on every machine, forever.
