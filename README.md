# Steam Deal Recommender

Discover currently active Steam deals that match your taste and hit a meaningful historical low.

## Product idea

Choose a Steam store region and optionally provide a public Steam profile URL or Steam ID.

- **Region only:** browse active Steam deals at a two-year low.
- **Region + profile:** exclude owned games and receive a personalized Top 10.
- Every recommendation explains both the taste match and deal quality.

## Historical-low definition

- Released at least two years ago: current regional Steam price equals the lowest price in the previous 730 days.
- Released less than two years ago: current price equals the lowest price since release.
- Compare final purchase price, not discount percentage.
- Calculate independently for each store region and currency.
- Within 5% of the reference low may be labeled **Near two-year low**, never **Historical low**.

## MVP

- Browse currently active Steam deals by region
- Optional Steam profile URL / Steam ID
- Retrieve a public Steam library and exclude owned titles
- Generate an explainable Top 10
- Filter by genre, discount, review score, and low-price status
- Show current/original price, discount, expiry, reviews, and recommendation reason
- Cache provider responses and degrade gracefully

See [the PRD](docs/PRD.md) and [architecture proposal](docs/ARCHITECTURE.md).

## Proposed stack

- React + TypeScript
- Spring Boot
- PostgreSQL
- Docker Compose
- GitHub Actions

## Status

Planning and data-feasibility validation. First milestone:

`Steam profile -> owned games -> metadata -> active regional deal -> price history`

## License

A license has not been selected yet.
