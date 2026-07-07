# aesthetic direction

The look is not invented from scratch — it is reverse-engineered from a handful of sky loops Chris
has been filming and glitching for over a decade. This doc names the reference loops, extracts their
shared DNA, and explains how the engine reproduces that DNA procedurally: no footage, no assets, just
a [genome](../packages/core/src/genome.ts) and three shader passes. For the *why-it's-identical-
everywhere* half of the story, see [DETERMINISM.md](./DETERMINISM.md). For the platform framing
(Target A / Target B), see the [README](../README.md).

## the reference loops

Four references define the target. Three are Chris's own glitch-sky loops; the fourth is an outside
inspiration gif. Each seeded one of [the four palette families](../assets/palettes/palettes.svg) and
one glitch mode.

| ref | scene | motion / glitch | ~len | seeds |
|-----|-------|-----------------|------|-------|
| **32__OG** | horizontal slit-scan sunset, 400×400 | quantized bands drift in a venetian-blind reveal + per-row smear | ~34s | **Sodium** family · `bands` mode |
| **35** | powder-blue sky | datamosh with a salmon / pixel-sort column | ~27s | **Powder** family · `sort`/`mosh` (Target B) |
| **31** | olive / mauve / periwinkle field | downsample mosaic — the sky posterized into fat tiles | ~19s | **Olive** family · `mosaic` mode |
| _gif_ | dusty pixelated sky — cream + muted olive/grey up top | a large field of dusty periwinkle / mauve / olive pixels below | — | **Periwinkle** family · quantization + grain feel |

**32__OG is the one that ships.** It is the [Target A](../README.md) look — the disciplined,
trivially-loopable, ONCHFS-friendly single idea. `31` (mosaic) and `35` (sort/mosh) are the harder,
feedback-driven modes reserved for later phases and Target B; see the
[roadmap](../ROADMAP.md) and the mode/storage calls in [DECISIONS.md](./DECISIONS.md).

## the shared DNA

Strip the four references down and the same five traits remain. This is the spec every mode must hit:

- **slow + meditative.** 20–34s seamless loops. Nothing snaps; the sky *breathes*. The engine hands
  shaders a normalised `loopT ∈ [0,1)`, never wall-clock time, so the last frame kisses the first.
- **square format.** Internal render is fixed at 400px longest side (matching the references), so a
  token looks identical at any display size.
- **heavy colour quantization.** Posterization to a handful of levels (`quantLevels` 5–16), ordered
  dither underneath to break the banding — the palette reads as a small set of dusty flats.
- **dusty, muted palettes.** No pure primaries, no clean gradients — cream horizons falling to
  bruised, desaturated zeniths. Curated, never random (below).
- **digital-corruption over a natural scene.** A believable sky *first*, then chromatic bleed, grain,
  and slit-scan smear layered on top. The glitch is the texture, not the subject.

## curate, then perturb

The single hardest rule, stated in [palettes.ts](../packages/core/src/palettes.ts):

> **never let the RNG pick raw RGB.** That is how you get mud.

Random channels average to grey-brown sludge and throw away everything that makes the references feel
like a specific time of day. So colour is a two-step move:

1. **curate.** 12 hand-tuned ramps, three per family, pulled straight from the reference loops. Each
   ramp is an ordered gradient sampled by vertical position — `t = 0` is the bottom of the frame
   (horizon glow), `t = 1` is the top (zenith), up to `MAX_STOPS = 6` stops.
2. **perturb.** The [genome](../packages/core/src/genome.ts) picks one ramp with `pick(rand, …)`,
   then nudges each stop by a small `stopJitter` in `[-0.06, +0.06]`. Enough variation that no two
   tokens are twins; never enough to leave the curated mood.

The four palette families, each mirroring the loop that seeded it:

| family | mood | from |
|--------|------|------|
| **Sodium** | cream → sodium-orange → rust → indigo dusk | `32__OG` sunset |
| **Powder** | pale blue-greys, soft salmon lift | `35` blue sky |
| **Olive** | dusty khaki, rose-grey mids | `31` mosaic |
| **Periwinkle** | mauve → periwinkle → slate dusk | the inspiration gif |

The full swatch sheet is [palettes.svg](../assets/palettes/palettes.svg); the exported data is
[palettes.json](../assets/palettes/palettes.json). A CPU `sampleRamp` mirrors the GLSL sampler
exactly so tests and tooling reason about colour without a GPU.

## reproducing 32__OG in-shader

The references are *video*. The token is *math*. There is no footage in the bundle — the slit-scan
sunset is rebuilt every frame by three stateless passes ping-ponging through two framebuffers:

```
$fx.hash ─► genome ─► sky ─────► slitscan ────► post ──────► screen
           (params)   FBO_A       FBO_B          (to screen)
                      gradient    drifting       dither ·
                      + sun glow  bands + smear   grain · chroma
```

**sky** ([sky.ts](../packages/core/src/gl/passes/sky.ts)) — the natural scene, before any glitch. A
vertical gradient sampled from the curated ramp, with the y-coordinate warped so the horizon glow
concentrates around `uHorizon`, plus a soft sun band (Gaussian falloff at `uSunElev`) tinted with the
warm low end of the ramp. A low sun through haze, not a headlight.

**slitscan** ([slitscan.ts](../packages/core/src/gl/passes/slitscan.ts)) — the signature `32__OG`
move, and the reason the shipped look is a *slit-scan*, not a photo:

- Quantize the frame into `uBands` horizontal bands (fine 24–48, or coarse 8–22).
- Each band samples the sky at its own **drifting vertical offset** — the venetian-blind reveal:
  `drift = bandDrift · sin(TAU·(driftCycles·loopT + seed) + bandPhase·TAU)`.
- A little of the real in-band gradient is bled back in (mix factor `0.35`) so bands aren't hard
  posterization, and a faint shadow seam at each band edge sells the quantization.
- A per-row **horizontal displacement** — the smear — `xdisp = rowDisplace · rowN · sin(TAU·(loopT +
  seed))`, with edge reflection so displaced samples never read the clamp streak.

Because `driftCycles` is an **integer** and every time term is a periodic function of `loopT`, the
band drift and the row smear both return exactly to their start — the [seamless loop](./DETERMINISM.md)
falls out for free, no crossfade needed.

**post** ([post.ts](../packages/core/src/gl/passes/post.ts)) — the digital-corruption texture:
radial chromatic bleed, 4×4 Bayer ordered dither *before* posterization (so the quantization doesn't
band), `quantLevels` posterize, film grain, and a vignette. The grain is a static function of pixel
position — `hash21(gl_FragCoord)`, **no loop time** — so it adds texture without ever breaking the
seam.

```
band 0 ▓▓▓▓▓▓▓▓▓  ← each band shows a flat slice of the gradient…
band 1 ░░░░░░░░░
band 2 ▓▓▓▓▓▓▓▓▓  …at a vertical offset that drifts over the loop,
band 3 ▒▒▒▒▒▒▒▒▒     + a per-row sideways smear on top.
band 4 ░░░░░░░░░
       └── one seamless loop: driftCycles whole cycles, back to start ──┘
```

## the boundary

The aesthetic is a contract with the engine, not a coat of paint:

- **believable sky first, glitch second.** Every mode renders a real scene before corrupting it.
- **muted over vivid, dusty over clean.** If a token looks saturated or crisp, the palette or the
  quant levels are wrong.
- **the loop is sacred.** Any new time-varying term must be periodic in `loopT` with integer cycles,
  or it does not ship on Target A.

New modes (`mosaic`, `sort`, `mosh`) inherit all three. See the [roadmap](../ROADMAP.md) for what's
built and what's next, and [DECISIONS.md](./DECISIONS.md) for the open calls that shape the token.
