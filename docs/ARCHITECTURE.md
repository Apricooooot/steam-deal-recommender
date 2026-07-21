# Architecture Proposal

This document is a starting point, not a locked implementation decision. Phase 0 should validate data availability before the full application is scaffolded.

## System overview

```text
React web app
    |
Spring Boot REST API
    |-- Recommendation domain service
    |-- Steam provider adapter
    |-- Price-history provider adapter
    |-- Metadata/review provider adapter
    |
PostgreSQL
    |
Scheduled synchronization jobs
```

## Design principles

- Keep provider-specific payloads outside the domain model.
- Treat region and currency as part of every price identity.
- Never infer a historical low from incomplete observations.
- Make scoring deterministic, versioned, and testable.
- Return freshness and confidence with deal data.
- Degrade from personalization to regional recommendations when Steam profile data is unavailable.
- Optimize external API usage through incremental sync and caching.

## Suggested repository layout

```text
/
├── frontend/                  React + TypeScript
├── backend/                   Spring Boot
│   └── src/main/java/.../
│       ├── api/
│       ├── application/
│       ├── domain/
│       └── infrastructure/
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── decisions/
├── docker-compose.yml
└── .github/workflows/
```

## Core domain concepts

### Game

Steam App ID, title, release date, content type, franchise, developers, genres, tags, and store availability.

### RegionalPrice

App ID, country code, currency, current amount, original amount, discount percentage, observed time, deal start, deal expiry, and data source.

All monetary values should use integer minor units plus ISO currency code.

### PriceObservation

Immutable App ID + region + currency + observed timestamp + final price record used to calculate the rolling reference low.

### ActiveDeal

A current price observation that is discounted, purchasable, fresh enough, and inside its known validity interval.

### SteamLibrary

Steam ID, retrieval status, owned App IDs, playtime, retrieval time, and cache expiry.

### TasteProfile

Weighted tag, genre, developer, and franchise preferences derived from meaningful playtime.

### Recommendation

Candidate App ID, score, scoring-version identifier, component scores, confidence, and human-readable reasons.

## Provider boundaries

Define interfaces such as:

```java
interface SteamLibraryProvider {
    LibraryResult fetchLibrary(SteamId steamId);
}

interface StoreCatalogProvider {
    List<GameMetadata> fetchChangedGames(SyncCursor cursor);
}

interface RegionalDealProvider {
    List<RegionalDeal> fetchActiveDeals(StoreRegion region);
}

interface PriceHistoryProvider {
    PriceHistory fetchHistory(AppId appId, StoreRegion region);
}
```

Adapters translate external responses into domain values. API DTOs must not leak into scoring or low-price rules.

## Data model sketch

- `games`
- `game_tags`
- `store_regions`
- `regional_prices`
- `price_observations`
- `active_deals`
- `steam_library_cache`
- `steam_library_items`
- `recommendation_runs`
- `recommendation_items`
- `sync_runs`
- `provider_failures`

Important indexes:

- `price_observations(app_id, region_code, observed_at)`
- `active_deals(region_code, expires_at)`
- `steam_library_items(steam_id, app_id)`
- `game_tags(app_id, tag_id)`

## Historical-low calculation

Inputs:

- App ID
- release date
- store region and currency
- current verified price
- eligible price observations

The comparison start is `max(releaseDate, now - 730 days)`. Free weekends and unsupported package types are excluded. Currency changes or missing intervals produce an incomplete-history state rather than a low label.

Recommended result type:

```text
status: TWO_YEAR_LOW | RELEASE_LOW | NEAR_LOW | NOT_LOW | INCOMPLETE
referencePrice
currentPrice
differencePercent
windowStart
windowEnd
observationCoverage
```

## Recommendation request flow

1. Validate region and optional Steam profile input.
2. Resolve the profile to a Steam ID.
3. Read the library cache; refresh when expired.
4. Query fresh active deals for the region.
5. Apply eligibility and owned-game exclusions.
6. Calculate taste, deal-quality, game-quality, and confidence components.
7. Apply diversity constraints.
8. Save the scoring version and component scores.
9. Return the Top 10 with explanations and freshness metadata.

## Sync strategy

- Incrementally synchronize the app catalog.
- Poll regional deal data within provider limits.
- Append price observations rather than overwriting history.
- Recalculate active deal status after each successful price sync.
- Track last attempted and last successful synchronization separately.
- Use idempotent job keys to prevent duplicated work.
- Preserve the last known good data when a provider fails, but mark it stale.

## API sketch

```text
GET  /api/v1/regions
GET  /api/v1/deals?region=US&genre=...
POST /api/v1/recommendations
GET  /api/v1/games/{appId}
GET  /api/v1/system/data-freshness
```

Example recommendation request:

```json
{
  "region": "US",
  "steamProfile": "https://steamcommunity.com/id/example",
  "filters": {
    "minimumReviewScore": 80,
    "lowStatus": ["TWO_YEAR_LOW", "RELEASE_LOW", "NEAR_LOW"]
  }
}
```

## Caching

- Catalog metadata: long TTL plus incremental refresh.
- Active deals: short regional TTL.
- Public library: short-lived encrypted or minimized cache.
- Recommendation results: keyed by Steam ID hash, region, filter set, data version, and scoring version.
- Never expose cache keys containing API credentials.

## Failure behavior

- Private library: return regional deals plus a structured personalization warning.
- Steam timeout: use a valid cached library or regional fallback.
- Price provider failure: retain last good data with stale status; do not make fresh-low claims.
- Partial metadata: lower confidence and omit unsupported explanations.
- Unknown expiry: keep the deal only when current price freshness is inside policy, and display expiry as unknown.

## Testing priorities

1. Historical-low boundary and currency tests.
2. Owned-game exclusion.
3. Scoring determinism and diversity.
4. Provider contract fixtures.
5. Stale-data and fallback behavior.
6. End-to-end regional and personalized API flows.

## Phase 0 exit criteria

Before generating the full production skeleton, demonstrate with real data that the system can:

- resolve a Steam profile;
- retrieve a public owned-game library;
- map owned and candidate games by App ID;
- retrieve active regional Steam prices;
- obtain or build adequate price history;
- determine expiry or represent it as unknown;
- calculate the low status for a small verified sample.
