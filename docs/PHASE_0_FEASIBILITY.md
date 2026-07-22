# Phase 0 Data Feasibility Report

Status: core chain validated with live data on 2026-07-21.
Test region: China (CN), currency CNY.

## Result

The following chain is technically feasible:

    Steam profile -> SteamID64 -> public library -> active regional deals
    -> ITAD game ID -> Steam product -> App ID -> base-game check
    -> owned-game exclusion -> release-aware price history -> low status -> expiry

The live sample resolved BULLACATOR -pusher tank battle- through a Steam package to App ID 4833680. Steam identified it as a base game released on 2026-07-08. ITAD returned a Steam/CNY observation of CNY 23.40 at 10% off on 2026-07-09.

## Validated endpoints

Steam Web API:

- ISteamUser/ResolveVanityURL/v1: vanity name to SteamID64.
- IPlayerService/GetOwnedGames/v1: public owned games, App IDs, and playtime.

The test profile returned 363 games.

IsThereAnyDeal:

- GET /service/shops/v1: Steam shop ID 61.
- GET /deals/v2: current CN deals in CNY.
- POST /lookup/shop/{shopId}/id/v1: ITAD ID to Steam products.
- GET /games/history/v2: regional price-change history.

Use the ITAD-API-Key header. For the history since parameter, use seconds-only UTC such as 2026-07-08T07:00:00Z. PowerShell round-trip format produces seven fractional-second digits and caused a 400 response in this test.

Steam Store:

- /api/packagedetails: resolve sub/{id} to embedded apps.
- /api/appdetails: validate type, name, and release date.

These Store endpoints are undocumented. Put them behind replaceable adapters, cache responses, and handle failures.

## Mapping rules

- app/{id}: use directly, then require Steam metadata type game.
- sub/{id}: inspect package apps; accept only one validated base game.
- bundle/{id}: exclude from MVP.
- DLC, soundtrack, demo, software, and package-only results: exclude.
- Zero or multiple base games: UNSUPPORTED_MAPPING; never guess.

ITAD type alone is not enough. A game may map only to a Steam package.

## Historical-low rule

    windowStart = max(releaseDate, now - 730 days)

    incomplete coverage                         -> INCOMPLETE
    current <= minimum and age < 730 days       -> RELEASE_LOW
    current <= minimum and age >= 730 days      -> TWO_YEAR_LOW
    current <= ceil(minimum * 1.05)              -> NEAR_LOW
    otherwise                                   -> NOT_LOW

Compare integer minor units only when shop, region, and currency match.

Observation count and coverage are different. A new game with one observation close to release may cover its whole lifetime; one recent observation cannot prove a two-year low for an old game. Store window bounds, earliest/latest observation, count, provider sync time, currency, shop, and a coverage reason.

## Expiry and ownership

- Future expiry: ACTIVE.
- Past expiry: EXPIRED.
- Null expiry: UNKNOWN and subject to a strict freshness policy.
- Recheck expiry when serving cached results.
- Exclude ownership only after resolving a canonical Steam App ID.
- A private library falls back to regional results with a warning.

## Security

- Keep Steam and ITAD keys server-side.
- Never commit, echo, log, screenshot, or put keys in URLs.
- Prompt securely for local validation.
- Use environment variables or a managed secret store in production.
- Revoke any exposed key.

## Known limitations

1. ITAD history is a change log, not continuous coverage proof by itself.
2. The history endpoint defaults to three months; established games need an explicit 730-day since value.
3. Steam release-date strings may be localized, absent, or non-date text.
4. Deal expiry can be unknown.
5. Steam Store metadata/package endpoints are undocumented.
6. Provider calls require caching, rate limiting, retry/backoff, and last-known-good behavior.
7. Launch with a small region allowlist until coverage is measured.

## Exit decision

Phase 0 passes and implementation can proceed to the regional MVP. This does not mean every deal has adequate mapping or history. Preserve UNSUPPORTED_MAPPING, INCOMPLETE_HISTORY, and UNKNOWN_EXPIRY explicitly.

See scripts/validate-data-chain.ps1 for a safe reproduction script. It prompts for keys and does not persist them.
