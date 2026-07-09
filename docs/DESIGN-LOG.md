# Design log

The visual + design narrative of the generator, iteration by iteration, with saved stills in
[`assets/renders/`](../assets/renders). For the full technical changelog see
[CHANGELOG.md](../CHANGELOG.md); this is the *look* and the *why*. For the released video-loop
editions that seeded the aesthetic, see the [museum](./MUSEUM.md).

## Source inspiration

The look is reverse-engineered from a handful of the project's own sky loops (see
[AESTHETIC.md](./AESTHETIC.md) and [`assets/skies/`](../assets/skies)):

- **`32__OG`** — horizontal slit-scan sunset → **Genesis**.
- **`35`** — datamosh powder-blue sky + salmon clouds → seeded **Billow** / future sort mode.
- **`31`** — olive/mauve downsample mosaic → the experimental **mosaic** mode.
- the dusty pixelated inspiration gif → the **Periwinkle** palette family.

---

## v0.1.0 — Genesis: the slit-scan sunset

The first light. One idea executed completely: a sunset gradient quantized into drifting horizontal
bands (a venetian-blind slit-scan), over curated dusty palettes (Sodium / Powder / Olive /
Periwinkle), finished with ordered dither, posterize, chromatic bleed, grain, and a vignette.
Deterministic from a hash; seamless 20–34s loop.

| periwinkle dusk | sodium sunset |
|---|---|
| ![](../assets/renders/v0.1-genesis-periwinkle.png) | ![](../assets/renders/v0.1-genesis-sodium.png) |

_The same sky drifting across one loop:_

![filmstrip](../assets/renders/v0.1-genesis-filmstrip.png)

Palette DNA: [`assets/palettes/palettes.svg`](../assets/palettes/palettes.svg).
**Canonized and frozen** — every Genesis seed regenerates byte-identically ([CANON.md](./CANON.md)).

## v0.2.0 — the generator learns to play

No pixel change to Genesis — this was the *instrument*: a full-screen browser generator with a live
seed box, **click-an-attribute to reshuffle** just that trait, ◀ ▶ undo/redo, copy, PNG + **WebM
loop** export, and `g:` genome tokens for hand-tweaked skies. Olive made rarer in exploration (not
in the genome). The two rare feature flags (Perfect Horizon, Full Corruption) widened so they vary.
The reshuffle/branch mechanic here is what makes an fxhash **Open-form** token a natural fit
([fxhash.md](./fxhash.md)).

## v0.3.0 — engines, and a second sky

The generator became **multi-engine** — sky algorithms are swappable, each with its own key. Genesis
migrated in unchanged. And the second engine arrived:

**Billow** — rolling billowing clouds sweeping across a blue sky, procedural periodic FBM with an
integer-wind horizontal drift and a time-circle domain-warp churn (seamless). Plus the experimental
Phase-4 **mosaic** mode (the `31` downsample look).

| Billow — clouds | Billow — mosaic (experimental) |
|---|---|
| ![](../assets/renders/v0.3-billow-clouds.png) | ![](../assets/renders/v0.3-billow-mosaic.png) |

Genesis's key was *opened a little* (4 reserved draws) with **zero pixel change** to any seed.

---

## Adding an entry

When a change alters the look (a new engine, a new mode, a palette pass): render a labeled still
into `assets/renders/` (`node scripts/render.mjs frame <hash>` → copy from `.captures/`), then add
a section here with the image and a sentence on the intent. Keep the stills small and representative.
