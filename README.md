# Steam Deal Recommender

Discover currently active Steam deals that match a meaningful regional historical low, then explain why each deal is worth checking before the sale ends.

## Current status

Phase 2 is in progress. The app now supports multiple store regions and UI languages:

- `CN` store region with `CNY`
- `US` store region with `USD`
- `zh_CN` and `en_US` interface copy
- Region-aware Steam links, Steam metadata, ITAD deal queries, price-history checks, and server-side cache keys
- Demo fallback data for both regions when no ITAD API key is configured

## Product idea

Choose a Steam store region and optionally provide a public Steam profile URL or Steam ID.

- **Region only:** browse active Steam deals at a two-year low or a release-aware historical low.
- **Region + profile:** exclude owned games and receive a personalized Top 10.
- Every recommendation should explain both taste match and deal quality.

## Historical-low definition

- Released at least two years ago: current regional Steam price equals the lowest price in the previous 730 days.
- Released less than two years ago: current price equals the lowest price since release.
- Compare final purchase price, not discount percentage.
- Calculate independently for each store region and currency.
- Within 5% of the reference low may be labeled **Near historical low**, never **Historical low**.

## Features

- Browse currently active Steam deals by region
- Switch between Chinese and English UI copy
- Filter by historical-low status
- Sort by deal quality, discount, price, or review score
- Show current/original price, discount, expiry, reviews, and price-history evidence
- Use live IsThereAnyDeal data when `ITAD_API_KEY` is present
- Fall back to clearly marked demo data when running without secrets
- Keep provider calls on the server route so API keys are never sent to the browser

## Run locally

Requirements: Node.js 22.13 or newer.

```powershell
npm install
Copy-Item .env.example .env.local
# Add ITAD_API_KEY to .env.local for live provider data.
npm run dev
```

Open the local URL printed by the dev server. Without `ITAD_API_KEY`, the app still runs with demo data for both CN and US regions.

## API examples

```text
GET /api/deals?region=CN&locale=zh_CN
GET /api/deals?region=US&locale=en_US
```

The older Phase 1 alias still works:

```text
GET /api/deals?country=CN&locale=zh_CN
```

## Data rules

1. Fetch active Steam deals for the selected ITAD country.
2. Map ITAD games to Steam `app` or safely resolvable single-app `sub` products.
3. Confirm Steam metadata has `type = game`.
4. Use localized Steam metadata with `schinese` for `zh_CN` and `english` for `en_US`.
5. Set the comparison window to `max(release date, now - 730 days)`.
6. Require regional currency consistency between current deal price and price history.
7. Exclude expired deals, ambiguous package mappings, missing history coverage, and currency mismatches.
8. Label prices within 5% of the reference low as **Near historical low** only.

## Tests

```powershell
npm test
```

The test suite builds the app, verifies the rendered product shell, and checks demo API payloads for both US/en_US and the CN compatibility alias.

## Roadmap

- Add more Steam regions beyond CN and US.
- Persist user preferences for default region and language.
- Add optional Steam profile import to exclude owned games.
- Generate personalized Top 10 explanations from owned-game taste signals.
- Add provider response persistence and scheduled refresh jobs.

See [the PRD](docs/PRD.md), [architecture proposal](docs/ARCHITECTURE.md), and [Phase 0 feasibility report](docs/PHASE_0_FEASIBILITY.md).

## License

A license has not been selected yet.
