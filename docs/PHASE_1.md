# Phase 1 — CN Regional Deal Page

Status: implementation started on 2026-07-21.

## User-visible scope

- One responsive CN/CNY deal page.
- Current Steam base-game deals only.
- Two-year low, lowest since release, and within-5% near-low labels.
- Filters for low status and sorting by deal quality, discount, price, or reviews.
- Current price, regular price, discount, review summary, expiry, history observation count, freshness, and Steam link.
- Clearly labeled demo mode when the server has no ITAD key.

## Live pipeline

1. Read current CN deals from ITAD shop 61.
2. Keep ITAD candidates classified as games.
3. Batch-map ITAD game IDs to Steam products.
4. Resolve direct app products or unambiguous single-app packages.
5. Require Steam metadata type game and a parseable release date.
6. Load Steam review summary.
7. Load Steam/CNY history from max(release date, now minus 730 days).
8. Reject incomplete coverage, currency mismatch, unsupported mapping, or expired deals.
9. Return only low, release-low, or near-low cards.

The browser never receives the ITAD key. Provider failures are logged without request URLs or secrets.

## Run

    npm install
    Copy-Item .env.example .env.local
    # Set ITAD_API_KEY in .env.local
    npm run dev

Without the key the same page renders with an obvious Demo Data badge.

## Acceptance checklist

- [x] CN is the only accepted Phase 1 region.
- [x] API credentials stay in the server route.
- [x] Unsupported product mappings are excluded.
- [x] Non-game Steam products are excluded.
- [x] Region and currency match before price comparison.
- [x] The comparison window respects release date and 730 days.
- [x] Near-low never appears as historical low.
- [x] Expired deals are excluded and null expiry remains visible as unknown.
- [x] Loading, empty, error, demo, desktop, and mobile states exist.
- [ ] Install dependencies and complete a production build in a network-enabled environment.
- [ ] Configure the hosted ITAD secret.
- [ ] Deploy the first preview and smoke-test live provider data.
- [ ] Measure mapping and history coverage across at least 100 CN candidates.

## Deliberate limits

Phase 1 has no profile input, accounts, notifications, ownership filtering, or multi-region selection. These remain later phases.
