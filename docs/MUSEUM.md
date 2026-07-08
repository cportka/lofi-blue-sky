# The museum — a library of released skies

The heart of lofi blue sky is the **released animated skies**: slow, glitched sky loops published as
numbered editions (*lofi blue sky #N*) across chains, and shared on the socials. This is the growing
**library** of that work.

> The live collections are the source of truth — this catalog links out to them and grows as works
> are curated in. (The marketplace pages are JS SPAs behind bot/egress protection, so the media is
> viewed on-platform; see the visual gallery at [`museum.html`](../museum.html) on the site.)

## The collections

| where | chain | link | what lives there |
|-------|-------|------|------------------|
| **OpenSea** | Ethereum | https://opensea.io/collection/lofibluesky | numbered *lofi blue sky #N* editions (e.g. #24, #31) |
| **objkt** | Tezos | https://objkt.com/collections/KT1LYDrLXqJBgrs414HjER6qTqAgre2moq3u | Tezos editions of the loops |
| **Paras** | NEAR | https://paras.id/lofibluesky.near | NEAR editions (`lofibluesky.near`) |
| **Website** | — | https://lofibluesky.io/ | the project's home |
| **Instagram** | — | https://www.instagram.com/lofi_blue_sky/ | the feed — loops as they're made |
| **X** | — | https://x.com/lofi_blue_sky | _"a nostalgia of beautiful blue sky 🎶🌌"_ — loops + announcements (since 2021) |
| **YouTube** | — | https://www.youtube.com/@LofiBlueSky | sky-loop shorts over lofi beats |
| **Bandcamp** | — | https://cportka.bandcamp.com/ | Chris Portka's music — the *lofi* in lofi blue sky |

Artist: **Chris Portka** — **djpants** (Tezos) · `djpants.eth` (Ethereum) · **lofi_blue_sky** (socials).
Hubs: [linktr.ee/cportka](https://linktr.ee/cportka) · [cportka.xyz](https://cportka.xyz).

**The sound.** Chris is a musician (Bandcamp above) — the loops live with lofi beats on YouTube. That
thread is why the *breathe* edition plans a seeded ambient audio bed synced to the visual loop (see
[ROADMAP.md](../ROADMAP.md) Phase 6). The released skies are **multi-chain** — Ethereum (OpenSea),
Tezos (objkt), NEAR (Paras; note NEAR/Paras has largely wound down, so those editions may be archival).

## The work

Each release is a **seamless video loop of the sky**, processed into the project's signature glitch —
datamosh, pixel-sort, slit-scan — over more than a decade of filmed footage. They're published as
numbered editions and are the *source aesthetic* the generative engine distills into math.

> _"i've been filming the sky for over a decade, it is my meditation._
> _sit with me and watch the sky go by, a beautiful blue sky."_

### Cataloged so far

A seed of the library — confirm titles/media on the linked platforms; add rows as works are curated.

| # | title | platform(s) | notes |
|---|-------|-------------|-------|
| 24 | lofi blue sky #24 | [OpenSea](https://opensea.io/collection/lofibluesky) | numbered edition |
| 31 | lofi blue sky #31 | [OpenSea](https://opensea.io/collection/lofibluesky) | numbered edition |

_(Counts, full titles, and media are on the collections — this repo can't mirror them from here.)_

## The source loops → the engines

Three loops the brief calls out (see [AESTHETIC.md](./AESTHETIC.md), [`assets/reference/`](../assets/reference))
are the ancestors of the generative engines:

- **`32__OG`** — horizontal slit-scan sunset → **Genesis**.
- **`35`** — datamosh blue sky + salmon clouds → **Billow** / a future sort mode.
- **`31`** — olive/mauve downsample mosaic → the experimental **mosaic** mode.

So the museum and the generator are two ends of one line: filmed sky → processed loop (here) →
synthesized-from-a-hash (the [engines](./ENGINES.md)).

## Growing the museum

As works are curated in:

1. Add a row to **Cataloged so far** (title, platform link, a note).
2. Where a still is available/allowed, save it to [`assets/museum/`](../assets/museum) and reference
   it in [`museum.html`](../museum.html).
3. Keep the platforms as the canonical source; this is a curated index, not a mirror.

See also: [PROJECT.md](./PROJECT.md) (the project) · [DESIGN-LOG.md](./DESIGN-LOG.md) (the generator's
iterations) · [`museum.html`](../museum.html) (the visual gallery).
