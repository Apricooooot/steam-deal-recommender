export type RegionCode = "CN" | "US";
export type LocaleCode = "zh_CN" | "en_US";
type CurrencyCode = "CNY" | "USD";

type ItadDeal = {
  id: string;
  title: string;
  type?: string;
  deal: {
    price: { amount: number; amountInt: number; currency: string };
    regular: { amount: number; amountInt: number; currency: string };
    cut: number;
    expiry: string | null;
  };
};

export type PublicDeal = {
  appId: number;
  title: string;
  image: string;
  currentPrice: number;
  regularPrice: number;
  referenceLow: number;
  currency: CurrencyCode;
  discount: number;
  lowStatus: "TWO_YEAR_LOW" | "RELEASE_LOW" | "NEAR_LOW";
  expiry: string | null;
  reviewPercent: number | null;
  reviewCount: number | null;
  genres: string[];
  observations: number;
  referenceLowAt: string;
  historyWindowStart: string;
  historyWindow: "TWO_YEARS" | "SINCE_RELEASE";
};

type RegionSettings = {
  country: RegionCode;
  steamCc: string;
  currency: CurrencyCode;
  defaultLocale: LocaleCode;
};

export type DealPayload = {
  deals: PublicDeal[];
  source: "live" | "demo";
  checkedAt: string;
  region: RegionCode;
  locale: LocaleCode;
  currency: CurrencyCode;
  diagnostics: { candidates: number; excluded: number };
};

const ITAD = "https://api.isthereanydeal.com";
const STEAM = "https://store.steampowered.com/api";
const STEAM_SHOP_ID = 61;
const CACHE_MS = 15 * 60 * 1000;

export const REGIONS: Record<RegionCode, RegionSettings> = {
  CN: { country: "CN", steamCc: "cn", currency: "CNY", defaultLocale: "zh_CN" },
  US: { country: "US", steamCc: "us", currency: "USD", defaultLocale: "en_US" },
};

const STEAM_LANGUAGES: Record<LocaleCode, string> = {
  zh_CN: "schinese",
  en_US: "english",
};

let memoryCache: Record<string, { expiresAt: number; value: DealPayload }> = {};

const demoSeed = [
  { appId: 367520, title: "Hollow Knight", image: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg", cny: [29, 58, 29], usd: [7.49, 14.99, 7.49], discount: 50, lowStatus: "TWO_YEAR_LOW" as const, expiry: "2026-07-25T17:00:00Z", reviewPercent: 97, reviewCount: 382451, genresZh: ["类银河恶魔城", "动作"], genresEn: ["Metroidvania", "Action"], observations: 18, referenceLowAt: "2026-06-26T17:00:00Z", historyWindowStart: "2024-07-21T00:00:00Z", historyWindow: "TWO_YEARS" as const },
  { appId: 413150, title: "Stardew Valley", image: "https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg", cny: [28.8, 48, 24], usd: [8.99, 14.99, 7.49], discount: 40, lowStatus: "NEAR_LOW" as const, expiry: "2026-07-26T17:00:00Z", reviewPercent: 98, reviewCount: 904217, genresZh: ["农场模拟", "休闲"], genresEn: ["Farming Sim", "Casual"], observations: 22, referenceLowAt: "2025-12-19T17:00:00Z", historyWindowStart: "2024-07-21T00:00:00Z", historyWindow: "TWO_YEARS" as const },
  { appId: 1145360, title: "Hades", image: "https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg", cny: [36, 92, 36], usd: [9.99, 24.99, 9.99], discount: 60, lowStatus: "TWO_YEAR_LOW" as const, expiry: "2026-07-24T17:00:00Z", reviewPercent: 98, reviewCount: 276824, genresZh: ["动作 Rogue", "剧情"], genresEn: ["Action Roguelike", "Story Rich"], observations: 15, referenceLowAt: "2026-06-26T17:00:00Z", historyWindowStart: "2024-07-21T00:00:00Z", historyWindow: "TWO_YEARS" as const },
  { appId: 1623730, title: "Palworld", image: "https://cdn.akamai.steamstatic.com/steam/apps/1623730/header.jpg", cny: [81, 108, 81], usd: [22.49, 29.99, 22.49], discount: 25, lowStatus: "RELEASE_LOW" as const, expiry: "2026-07-28T17:00:00Z", reviewPercent: 93, reviewCount: 311260, genresZh: ["开放世界", "生存"], genresEn: ["Open World", "Survival"], observations: 9, referenceLowAt: "2026-07-10T17:00:00Z", historyWindowStart: "2024-01-19T00:00:00Z", historyWindow: "SINCE_RELEASE" as const },
  { appId: 646570, title: "Slay the Spire", image: "https://cdn.akamai.steamstatic.com/steam/apps/646570/header.jpg", cny: [21.6, 72, 21.6], usd: [7.49, 24.99, 7.49], discount: 70, lowStatus: "TWO_YEAR_LOW" as const, expiry: null, reviewPercent: 97, reviewCount: 153804, genresZh: ["牌组构建", "Roguelike"], genresEn: ["Deckbuilding", "Roguelike"], observations: 20, referenceLowAt: "2026-06-26T17:00:00Z", historyWindowStart: "2024-07-21T00:00:00Z", historyWindow: "TWO_YEARS" as const },
  { appId: 892970, title: "Valheim", image: "https://cdn.akamai.steamstatic.com/steam/apps/892970/header.jpg", cny: [35, 70, 35], usd: [9.99, 19.99, 9.99], discount: 50, lowStatus: "TWO_YEAR_LOW" as const, expiry: "2026-07-27T17:00:00Z", reviewPercent: 94, reviewCount: 432118, genresZh: ["生存", "多人合作"], genresEn: ["Survival", "Co-op"], observations: 17, referenceLowAt: "2026-06-26T17:00:00Z", historyWindowStart: "2024-07-21T00:00:00Z", historyWindow: "TWO_YEARS" as const },
];

export function normalizeRegion(value: string | null | undefined): RegionCode {
  const upper = value?.trim().toUpperCase();
  return upper === "US" ? "US" : "CN";
}

export function normalizeLocale(value: string | null | undefined, region: RegionCode): LocaleCode {
  const normalized = value?.trim().replace("-", "_");
  if (normalized === "en_US") return "en_US";
  if (normalized === "zh_CN") return "zh_CN";
  return REGIONS[region].defaultLocale;
}

function demoDeals(region: RegionCode, locale: LocaleCode): PublicDeal[] {
  const settings = REGIONS[region];
  return demoSeed.map((deal) => {
    const [currentPrice, regularPrice, referenceLow] = region === "US" ? deal.usd : deal.cny;
    return {
      appId: deal.appId,
      title: deal.title,
      image: deal.image,
      currentPrice,
      regularPrice,
      referenceLow,
      currency: settings.currency,
      discount: deal.discount,
      lowStatus: deal.lowStatus,
      expiry: deal.expiry,
      reviewPercent: deal.reviewPercent,
      reviewCount: deal.reviewCount,
      genres: locale === "zh_CN" ? deal.genresZh : deal.genresEn,
      observations: deal.observations,
      referenceLowAt: deal.referenceLowAt,
      historyWindowStart: deal.historyWindowStart,
      historyWindow: deal.historyWindow,
    };
  });
}

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`provider_${response.status}`);
  return response.json() as Promise<T>;
}

function property<T>(object: Record<string, T>, key: string) {
  return object[key];
}

async function resolveAppId(products: string[], region: RegionSettings) {
  const direct = products.find((item) => /^app\/\d+$/.test(item));
  if (direct) return Number(direct.slice(4));

  const sub = products.find((item) => /^sub\/\d+$/.test(item));
  if (!sub) return null;
  const packageId = Number(sub.slice(4));
  const response = await json<Record<string, { success: boolean; data?: { apps?: { id: number }[] } }>>(
    `${STEAM}/packagedetails?packageids=${packageId}&cc=${region.steamCc}&l=english`,
  );
  const apps = property(response, String(packageId))?.data?.apps ?? [];
  return apps.length === 1 ? apps[0].id : null;
}

async function enrich(
  deal: ItadDeal,
  products: string[],
  key: string,
  region: RegionSettings,
  locale: LocaleCode,
): Promise<PublicDeal | null> {
  if (deal.deal.expiry && Date.parse(deal.deal.expiry) <= Date.now()) return null;
  if (deal.deal.price.currency !== region.currency) return null;
  const appId = await resolveAppId(products, region);
  if (!appId) return null;

  const steamLanguage = STEAM_LANGUAGES[locale];
  const appResponse = await json<Record<string, { success: boolean; data?: Record<string, any> }>>(
    `${STEAM}/appdetails?appids=${appId}&cc=${region.steamCc}&l=${steamLanguage}`,
  );
  const app = property(appResponse, String(appId));
  if (!app?.success || app.data?.type !== "game") return null;

  const release = Date.parse(app.data.release_date?.date ?? "");
  if (!Number.isFinite(release)) return null;
  const twoYearsAgo = Date.now() - 730 * 86_400_000;
  const windowStart = Math.max(release, twoYearsAgo);
  const since = new Date(windowStart).toISOString().replace(/\.\d{3}Z$/, "Z");
  const [history, reviewResponse] = await Promise.all([
    json<Array<{ timestamp: string; shop: { id: number }; deal: { price: { amount: number; amountInt: number; currency: string } } }>>(
      `${ITAD}/games/history/v2?id=${encodeURIComponent(deal.id)}&country=${region.country}&shops=${STEAM_SHOP_ID}&since=${encodeURIComponent(since)}`,
      { headers: { "ITAD-API-Key": key } },
    ),
    json<{ query_summary?: { total_positive: number; total_reviews: number } }>(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
    ).catch(() => ({ query_summary: undefined })),
  ]);
  const valid = history.filter((item) => item.shop.id === STEAM_SHOP_ID && item.deal.price.currency === region.currency);
  if (!valid.length) return null;
  const earliest = Math.min(...valid.map((item) => Date.parse(item.timestamp)));
  if (earliest > windowStart + 7 * 86_400_000) return null;
  const minimumMinor = Math.min(...valid.map((item) => item.deal.price.amountInt));
  const referenceLowAt = valid
    .filter((item) => item.deal.price.amountInt === minimumMinor)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0].timestamp;
  const currentMinor = deal.deal.price.amountInt;
  if (currentMinor > Math.ceil(minimumMinor * 1.05)) return null;

  const lowStatus = currentMinor <= minimumMinor
    ? release > twoYearsAgo ? "RELEASE_LOW" : "TWO_YEAR_LOW"
    : "NEAR_LOW";
  const reviewCount = reviewResponse.query_summary?.total_reviews ?? app.data.recommendations?.total ?? null;
  const reviewPercent = reviewResponse.query_summary?.total_reviews
    ? Math.round(reviewResponse.query_summary.total_positive * 100 / reviewResponse.query_summary.total_reviews)
    : null;

  return {
    appId,
    title: app.data.name ?? deal.title,
    image: app.data.header_image ?? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    currentPrice: deal.deal.price.amount,
    regularPrice: deal.deal.regular.amount,
    referenceLow: minimumMinor / 100,
    currency: region.currency,
    discount: deal.deal.cut,
    lowStatus,
    expiry: deal.deal.expiry,
    reviewPercent,
    reviewCount,
    genres: (app.data.genres ?? []).map((genre: { description: string }) => genre.description),
    observations: valid.length,
    referenceLowAt,
    historyWindowStart: new Date(windowStart).toISOString(),
    historyWindow: release > twoYearsAgo ? "SINCE_RELEASE" : "TWO_YEARS",
  };
}

export async function loadDeals(options: { region?: string | null; locale?: string | null } = {}): Promise<DealPayload> {
  const regionCode = normalizeRegion(options.region);
  const locale = normalizeLocale(options.locale, regionCode);
  const region = REGIONS[regionCode];
  const cacheKey = `${regionCode}:${locale}`;
  const cached = memoryCache[cacheKey];
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const key = process.env.ITAD_API_KEY;
  if (!key) {
    const deals = demoDeals(regionCode, locale);
    return { deals, source: "demo", checkedAt: new Date().toISOString(), region: regionCode, locale, currency: region.currency, diagnostics: { candidates: deals.length, excluded: 0 } };
  }

  const response = await json<{ list?: ItadDeal[]; deals?: ItadDeal[] }>(
    `${ITAD}/deals/v2?country=${region.country}&shops=${STEAM_SHOP_ID}&limit=40`,
    { headers: { "ITAD-API-Key": key } },
  );
  const candidates = (response.list ?? response.deals ?? []).filter((candidate) => candidate.type === "game").slice(0, 12);
  const mapping = await json<Record<string, string[]>>(`${ITAD}/lookup/shop/${STEAM_SHOP_ID}/id/v1`, {
    method: "POST",
    headers: { "ITAD-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(candidates.map((candidate) => candidate.id)),
  });

  const settled = [] as Array<PublicDeal | null>;
  for (const candidate of candidates) {
    try { settled.push(await enrich(candidate, mapping[candidate.id] ?? [], key, region, locale)); }
    catch { settled.push(null); }
  }
  const deals = settled.filter((deal): deal is PublicDeal => deal !== null);
  const value: DealPayload = {
    deals,
    source: "live",
    checkedAt: new Date().toISOString(),
    region: regionCode,
    locale,
    currency: region.currency,
    diagnostics: { candidates: candidates.length, excluded: candidates.length - deals.length },
  };
  memoryCache[cacheKey] = { expiresAt: Date.now() + CACHE_MS, value };
  return value;
}
