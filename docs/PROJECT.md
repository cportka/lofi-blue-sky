# lofi blue sky — an internet art project

> (っ◔◡◔)っ ♥ abstraction ♥
> a beautiful blue sky — i've been filming the sky for over a decade
> it is my meditation — sit with me and watch the sky go by

**lofi blue sky** is a long-running internet art project by **Chris Portka** — slow, meditative,
glitched loops of the sky: slit-scan sunsets, datamoshed blue skies, downsampled mosaics. A decade
of filming the sky, distilled into quiet, corrupted, repeating moments. This repository is the
project's **generative engine**; the wider project is a body of **released animated skies** living
across marketplaces and socials.

## One artist, many frames

| identity | where |
|----------|-------|
| **Chris Portka** | the person |
| **djpants** | fxhash / Tezos handle |
| **djpants.eth** | Ethereum / ENS — the decentralized home for the *breathe* edition |
| **lofi_blue_sky** | the project's social handle |

One unified identity across chains — mint primary where it fits (Tezos-cheap, Ethereum for
fxhash art-coins), present as one artist.

## Presence — follow the sky

| platform | link | what lives there |
|----------|------|------------------|
| **Website** | https://lofibluesky.io/ | the project's home |
| **OpenSea** (Ethereum) | https://opensea.io/collection/lofibluesky | released sky editions on Ethereum |
| **objkt** (Tezos) | https://objkt.com/collections/KT1LYDrLXqJBgrs414HjER6qTqAgre2moq3u | released sky editions on Tezos |
| **Paras** (NEAR) | https://paras.id/lofibluesky.near | released sky editions on NEAR |
| **Instagram** | https://www.instagram.com/lofi_blue_sky/ | the feed — loops as they're made |
| **X** | https://x.com/lofi_blue_sky | _"a nostalgia of beautiful blue sky 🎶🌌"_ — loops + announcements |
| **YouTube** | https://www.youtube.com/@LofiBlueSky | sky-loop shorts over lofi beats |
| **Bandcamp** | https://cportka.bandcamp.com/ | Chris Portka's music — the *lofi* in lofi blue sky |

The released animated skies across these are cataloged in the **[museum](./MUSEUM.md)** — the
library of already-released loops we're building out. Chris is a musician, so **sound** is part of
the project: the loops live with lofi beats on YouTube, and the *breathe* edition plans a seeded
audio bed (see [ROADMAP.md](../ROADMAP.md) Phase 6).

## Two bodies of work

1. **The released animated skies** — curated, processed video loops (datamosh / pixel-sort /
   slit-scan over filmed footage), published as editions on OpenSea / objkt / Paras and shared on
   IG / X. These are the *source* aesthetic — the [museum](./MUSEUM.md).
2. **The generative engine** (this repo) — the look *synthesized procedurally from a hash*, so it's
   deterministic, on-chain-storable, and endless. Two frames:
   - **the fxhash token** — a disciplined, self-contained ~18 KB piece (see [fxhash.md](./fxhash.md));
     an **Open-form** art coin fits it perfectly (collectors reroll + branch — which the engine
     already does via per-attribute reshuffle and `g:` genome tokens).
   - **the breathe edition** — the full browser generator (this site), which grows toward a
     decentralized deploy behind `djpants.eth`.

The token is a *distilled, deterministic descendant* of the filmed loops: the same meditative,
corrupted sky, rebuilt from math instead of footage. See [AESTHETIC.md](./AESTHETIC.md) and
[DETERMINISM.md](./DETERMINISM.md).

## Thesis

> **The masterpiece is in the GLSL — one idea executed completely. The platform is the frame.**

## The engines

The generator ships swappable **engines** (see [ENGINES.md](./ENGINES.md)):

- **Genesis** — the horizontal slit-scan sunset. Frozen and canonical.
- **Billow** — rolling billowing clouds across a blue sky. Young; the experimental Phase-4 mosaic
  mode rides here.

More engines will distill more of the museum's looks (datamosh, pixel-sort) over time — each a new
way the filmed sky becomes math.

## See also

- [README](../README.md) · [ROADMAP](../ROADMAP.md) · [ENGINES](./ENGINES.md) ·
  [MUSEUM](./MUSEUM.md) · [DESIGN-LOG](./DESIGN-LOG.md)
- [fxhash release guide](./fxhash.md) · [CANON](./CANON.md) · [DECISIONS](./DECISIONS.md)
