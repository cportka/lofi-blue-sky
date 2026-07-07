# aesthetic reference

The source-of-truth for the look. The **lofi blue sky** aesthetic isn't invented — it's
reverse-engineered from a handful of sky loops Chris has been filming and glitching for over a
decade, plus one outside inspiration gif. Each reference seeded one of **the four palette families**
(Sodium, Powder, Olive, Periwinkle) and one glitch mode.

**The source media itself is not committed** — it is processed footage, and the token ships no
assets anyway (the whole point: the sky is rebuilt in-shader from the **genome**, hash → params).
What survives is the *distillation*: the palettes pulled from these loops live in
[`../palettes/`](../palettes/). The full teardown — shared DNA, how each pass reproduces it, the
**seamless loop** math — is in [`../../docs/AESTHETIC.md`](../../docs/AESTHETIC.md).

## the inspiration gif

The first visual target: a pixelated dusty sky — cream + muted olive/grey blocks along the top over
a large field of dusty periwinkle / mauve / olive / grey pixels, everything crushed by heavy
quantization. It set the tone before any of Chris's own loops were folded in, and it seeded the
**Periwinkle** family.

```
▛▀▛▀▜  cream + olive/grey blocks (top)
░▒░▓░  ── heavy quantization ──
▒▓░▒▓  dusty periwinkle / mauve / olive field (below)
```

## the three named loops

| ref | scene | motion / glitch | size · len | seeds |
|-----|-------|-----------------|-----------|-------|
| **32__OG** | horizontal **slit-scan** sunset: navy → red band → cream horizon → warm sodium → grey striations | quantized bands drift (venetian-blind reveal) + per-row smear | 400×400 · ~34s | **Sodium** · `bands` |
| **35** | datamosh powder-blue sky, salmon clouds | vertical pixel-sort column, feedback mosh | 200×200 · ~27s | **Powder** · `sort`/`mosh` |
| **31** | olive / mauve / periwinkle landscape | crushed to a blocky quantized grid (downsample mosaic) | 400×400 · ~19s | **Olive** · `mosaic` |

**32__OG is the one that ships** — the disciplined, trivially-loopable, **ONCHFS**-friendly single
idea that is the **Target A** (fxhash token) look. `31` (mosaic) and `35` (sort/mosh) are the harder,
feedback-driven modes reserved for **Target B** (breathe / GitHub Pages) and later phases; see
[`../../ROADMAP.md`](../../ROADMAP.md) and the mode/storage calls in
[`../../docs/DECISIONS.md`](../../docs/DECISIONS.md). Project overview: [`../../README.md`](../../README.md).
