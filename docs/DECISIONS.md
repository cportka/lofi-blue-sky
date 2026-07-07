# Open decisions

The build brief flagged several ⚠ calls that shape Target A. v0.1.0 proceeds on the brief's own
recommended defaults so the scaffold is coherent and mintable — but each is reversible and worth a
conscious sign-off before publishing. Chris: this is the list to confirm.

| # | Decision | v0.1.0 default (what the code does) | Still to confirm |
|---|----------|-------------------------------------|------------------|
| 1 | **Target-A idea** — which single look ships as the token? | **Slit-scan sunset** (`32__OG`). `genome.mode` is locked to `bands`. Cleanest single idea, trivially loopable, ONCHFS-friendly. | Keep slit-scan, or ship mosaic instead? |
| 2 | **Storage** — ONCHFS vs IPFS. | Built lean (**~16 KB**, gzip ~6.5 KB) so **ONCHFS is on the table**; the build prints the size + a hint. | ONCHFS (permanent, pay-per-byte) or IPFS (cheaper, needs pinning)? |
| 3 | **Loop vs feedback** — stateless-only on fxhash, or solve feedback closure? | **Stateless only** on Target A (slit-scan/mosaic) → the loop is trivially perfect. Feedback modes (sort/mosh) are reserved for Target B. | Confirm feedback stays out of the token. |
| 4 | **fx(params) exposure** — how much mint-time control? | **Fully hash-locked** in v0.1.0 (no params exposed yet). Brief's plan: expose palette + band density, lock the rest. | Which params (if any) do collectors get to tune? |
| 5 | **Edition size + pricing** (fixed / Dutch / open). | Not encoded — a publish-time platform setting, not code. | Needs a call before the drop. |
| 6 | **Wallet / positioning** — tz address, objkt profile. | Not in the repo (secrets don't belong here). Payout/royalties are set at publish. | Provide tz1/tz2 + objkt URL to inform pricing. |

## Deliberate implementation choices (not from the brief)

- **Shaders authored as `.ts` string modules**, not standalone `.frag` files. fxhash forbids
  runtime fetches, so shader source must be inlined as strings anyway; keeping them as typed
  template-literal exports makes them importable, typecheck-clean, and trivially bundled. The
  brief's `passes/*.frag` names map 1:1 to `gl/passes/*.ts`.
- **esbuild is a dev dependency**, not a runtime one. The "no external resources" rule governs the
  *shipped artifact* (a single self-contained HTML), which esbuild produces — it never ships.
- **A local `$fx` shim** stands in when the platform `$fx` is absent, so one `index.html` runs in
  dev, in the sandbox, and on the token unchanged. The real snippet is injected at publish.
- **Internal render resolution is fixed at 400px longest side** (matching the references) so a token
  looks identical at any display size. A per-token pixelation trait is a candidate for a later minor.
