# Product Requirements Document

## 1. Product

**Name:** Steam Deal Recommender  
**Tagline:** Find active Steam deals that fit your taste and are genuinely worth buying now.

## 2. Problem

Steam players often discover a good sale after it ends, or spend time browsing hundreds of discounts that do not match their interests. Existing deal lists optimize for discount percentage or popularity; neither necessarily reflects personal taste or a genuinely strong regional price.

The product answers:

> If I only buy a few games right now, which active Steam deals are best for me?

## 3. Product definition

A user selects a Steam store region and may optionally enter a Steam profile URL or Steam ID.

- Without a profile, the site shows the best currently active deals for that region.
- With a readable public profile, it analyzes the user's library, excludes owned games, and returns an explainable personalized Top 10.
- If the library is private or unavailable, the experience falls back to regional deals instead of failing.

"Weekly" describes the expected browsing habit, not a calendar boundary. Eligibility is determined by whether a deal is currently active.

## 4. Target users

### Primary

Steam players who own many games, regularly buy during sales, and want a short personalized shortlist.

### Secondary

Visitors who do not want to share a profile but want high-quality regional deal discovery.

## 5. MVP user journeys

### Regional browsing

1. User opens the site.
2. The site proposes a region; the user confirms or changes it.
3. User sees currently active Steam deals that meet the price-quality rules.
4. User filters and opens a game on Steam.

### Personalized recommendations

1. User enters a Steam profile URL or Steam ID.
2. User selects or confirms a store region.
3. The system resolves the Steam ID and requests the public owned-game library.
4. The system builds a lightweight taste profile using playtime and game tags.
5. It excludes owned games, scores eligible active deals, and displays a Top 10.
6. Each card explains the strongest taste and deal signals.

### Private or unavailable library

The system explains that the library could not be read and shows regional recommendations. It provides instructions for making game details public without blocking browsing.

## 6. Historical-low rules

The comparison is based on final purchase price, not discount percentage.

- If a game was released at least two years ago, the reference window is the previous 730 days.
- If a game was released less than two years ago, the reference window begins on its release date.
- Current price equal to or below the reference minimum is labeled **Two-year low** or **Lowest since release**.
- Current price up to 5% above the reference minimum is labeled **Near two-year low** or **Near release low**.
- Prices are calculated independently by Steam store region and currency.
- MVP considers prices from the Steam store only.
- Bundles, third-party key sellers, coupons, free weekends, DLC, demos, soundtracks, and software are excluded unless explicitly supported later.
- If the price history is incomplete, the product must say so and must not claim a historical low.

## 7. Deal eligibility

A candidate is eligible when:

- it is a purchasable base game on Steam;
- its deal is active at the time of the latest successful sync;
- it is available in the selected region;
- current and original regional prices are known;
- a reliable price-history comparison is available;
- it meets configurable review and review-count thresholds;
- it is not already owned when a readable library is supplied.

The UI shows price freshness and deal expiry when known. Unknown expiry is displayed as unknown, never invented.

## 8. Recommendation model

The MVP is deterministic and explainable; it does not use an LLM.

```text
score =
  0.40 * tasteMatch
+ 0.25 * dealQuality
+ 0.20 * gameQuality
+ 0.15 * confidence
```

- **tasteMatch:** similarity between candidate tags and tags from games with meaningful user playtime.
- **dealQuality:** relationship between current price, reference low, original price, and deal recency.
- **gameQuality:** review score adjusted for review sample size.
- **confidence:** completeness and freshness of metadata, price, and preference evidence.

Rules:

- Games with zero playtime receive reduced or zero positive taste weight.
- The Top 10 contains at most one game from the same franchise and no more than three from one primary genre when sufficient alternatives exist.
- Missing signals reduce confidence rather than silently receiving an average score.
- Regional browsing uses deal quality, game quality, and confidence without tasteMatch.

Example explanation:

> Recommended because you spend significant time in Roguelike and Deckbuilding games. It has 94% positive reviews and is currently at its two-year Steam low.

## 9. Functional requirements

The system shall:

- accept a supported Steam profile URL, vanity URL, or Steam ID;
- accept an explicit Steam store region;
- resolve vanity URLs where supported;
- retrieve publicly visible owned games and playtime;
- retrieve and normalize game metadata, tags, reviews, release date, and regional pricing;
- maintain the historical price observations required for the reference window;
- identify currently active deals;
- exclude owned games;
- produce ranked, explainable recommendations;
- support genre, discount, review score, and low-status filters;
- link to the correct regional Steam store page;
- cache external responses and respect provider limits;
- record data freshness and provider failures;
- degrade to regional browsing when personalization is unavailable.

## 10. Required UI fields

Each recommendation card includes:

- title and cover image;
- current and original regional price;
- currency and store region;
- discount percentage;
- low-price label and reference price;
- Steam review score and review count;
- relevant genres/tags;
- recommendation reason;
- deal expiry or "expiry unknown";
- price last checked time;
- Steam store link.

## 11. Non-functional requirements

- Results should load within five seconds when cached.
- The interface must be responsive and usable on mobile.
- API keys stay server-side.
- External requests use timeouts, retries with backoff, and circuit-breaking or equivalent protection.
- Price data must have an observable last-successful-sync timestamp.
- The application supports Docker-based local development.
- Core scoring and historical-low rules have unit tests.
- Provider adapters and critical API flows have integration tests.
- A new contributor can run the application from the README.

## 12. Privacy

- A Steam ID is used only to retrieve public data.
- The product documents what it stores and for how long.
- MVP should avoid permanently storing a user profile unless caching is necessary.
- Logs must not contain API keys.
- A future persistent profile feature requires deletion controls and a dedicated privacy review.

## 13. Out of scope

- accounts and authentication;
- email or push notifications;
- payments;
- AI-generated explanations;
- wishlist synchronization;
- social and multiplayer features;
- mobile apps;
- third-party key stores;
- cross-platform recommendations.

## 14. Success metrics

### Product

- Steam-store outbound click-through rate;
- share of visitors who request personalized results;
- successful recommendation rate for valid public profiles;
- "interested / not interested" feedback when added;
- recommendation result revisit rate.

### Data quality

- percentage of displayed deals verified during the freshness target;
- stale or incorrect price rate;
- price-history coverage;
- percentage of recommendations with complete explanations.

### Engineering acceptance

- cached recommendation response under five seconds;
- owned games are excluded;
- active-deal data refreshes automatically;
- provider failures degrade gracefully;
- Docker startup and README setup work on a clean machine;
- CI runs tests on each pull request.

## 15. Delivery phases

### Phase 0: data feasibility

Validate the full data chain: profile resolution, public library, App ID mapping, metadata, active regional price, price history, and deal expiry.

### Phase 1: regional MVP

Ship region selection, active deal browsing, low-price labels, filters, freshness indicators, and Steam links.

### Phase 2: personalization

Add Steam profile input, taste modeling, owned-game exclusion, explainable scoring, diversity rules, and Top 10 results.

## 16. Open questions

- Which provider supplies sufficiently reliable regional Steam price history and expiry times?
- Which countries/currencies launch first?
- What minimum review score and review-count thresholds should be used?
- How often can data be refreshed within provider rate limits?
- Should mature content be hidden by default?
- What retention period is appropriate for cached Steam libraries?
