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

type PublicDeal = {
  appId: number;
  title: string;
  image: string;
  currentPrice: number;
  regularPrice: number;
  referenceLow: number;
  currency: "CNY";
  discount: number;
  lowStatus: "TWO_YEAR_LOW" | "RELEASE_LOW" | "NEAR_LOW";
  expiry: string | null;
  reviewPercent: number | null;
  reviewCount: number | null;
  genres: string[];
  observations: number;
};

const ITAD = "https://api.isthereanydeal.com";
const STEAM = "https://store.steampowered.com/api";
const STEAM_SHOP_ID = 61;
const CACHE_MS = 15 * 60 * 1000;

let memoryCache: { expiresAt: number; value: DealPayload } | null = null;

type DealPayload = {
  deals: PublicDeal[];
  source: "live" | "demo";
  checkedAt: string;
  region: "CN";
  diagnostics: { candidates: number; excluded: number };
};

const demoDeals: PublicDeal[] = [
  { appId: 367520, title: "Hollow Knight", image: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg", currentPrice: 29, regularPrice: 58, referenceLow: 29, currency: "CNY", discount: 50, lowStatus: "TWO_YEAR_LOW", expiry: "2026-07-25T17:00:00Z", reviewPercent: 97, reviewCount: 382451, genres: ["ç±»é“¶æ²³æˆ˜å£«æ¶é­”åŸŽ", "åŠ¨ä½œ"], observations: 18 },
  { appId: 413150, title: "Stardew Valley", image: "https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg", currentPrice: 28.8, regularPrice: 48, referenceLow: 24, currency: "CNY", discount: 40, lowStatus: "NEAR_LOW", expiry: "2026-07-26T17:00:00Z", reviewPercent: 98, reviewCount: 904217, genres: ["å†œåœºæ¨¡æ‹Ÿ", "ä¼‘é—²"], observations: 22 },
  { appId: 1145360, title: "Hades", image: "https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg", currentPrice: 36, regularPrice: 92, referenceLow: 36, currency: "CNY", discount: 61, lowStatus: "TWO_YEAR_LOW", expiry: "2026-07-24T17:00:00Z", reviewPercent: 98, reviewCount: 276824, genres: ["åŠ¨ä½œç±» Rogue", "å‰§æƒ…"], observations: 15 },
  { appId: 1623730, title: "Palworld", image: "https://cdn.akamai.steamstatic.com/steam/apps/1623730/header.jpg", currentPrice: 81, regularPrice: 108, referenceLow: 81, currency: "CNY", discount: 25, lowStatus: "RELEASE_LOW", expiry: "2026-07-28T17:00:00Z", reviewPercent: 93, reviewCount: 311260, genres: ["å¼€æ”¾ä¸–ç•Œ", "ç”Ÿå­˜"], observations: 9 },
  { appId: 646570, title: "Slay the Spire", image: "https://cdn.akamai.steamstatic.com/steam/apps/646570/header.jpg", currentPrice: 21.6, regularPrice: 72, referenceLow: 21.6, currency: "CNY", discount: 70, lowStatus: "TWO_YEAR_LOW", expiry: null, reviewPercent: 97, reviewCount: 153804, genres: ["ç‰Œç»„æž„å»º", "Roguelike"], observations: 20 },
  { appId: 892970, title: "Valheim", image: "https://cdn.akamai.steamstatic.com/steam/apps/892970/header.jpg", currentPrice: 35, regularPrice: 70, referenceLow: 35, currency: "CNY", discount: 50, lowStatus: "TWO_YEAR_LOW", expiry: "2026-07-27T17:00:00Z", reviewPercent: 94, reviewCount: 432118, genres: ["ç”Ÿå­˜", "å¤šäººåˆä½œ"], observations: 17 },
];

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`provider_${response.status}`);
  return response.json() as Promise<T>;
}

function property<T>(object: Record<string, T>, key: string) {
  return object[key];
}

async function resolveAppId(products: string[]) {
  const direct = products.find((item) => /^app\/\d+$/.test(item));
  if (direct) return Number(direct.slice(4));

  const sub = products.find((item) => /^sub\/\d+$/.test(item));
  if (!sub) return null;
  const packageId = Number(sub.slice(4));
  const response = await json<Record<string, { success: boolean; data?: { apps?: { id: number }[] } }>>(
    `${STEAM}/packagedetails?packageids=${packageId}&cc=cn&l=english`,
  );
  const apps = property(response, String(packageId))?.data?.apps ?? [];
  return apps.length === 1 ? apps[0].id : null;
}

async function enrich(deal: ItadDeal, products: string[], key: string): Promise<PublicDeal | null> {
  const appId = await resolveAppId(products);
  if (!appId) return null;

  const appResponse = await json<Record<string, { success: boolean; data?: Record<string, any> }>>(
    `${STEAM}/appdetails?appids=${appId}&cc=cn&l=english`,
  );
  const app = property(appResponse, String(appId));
  if (!app?.success || app.data?.type !== "game") return null;

  const release = Date.parse(app.data.release_date?.date ?? "");
  if (!Number.isFinite(release)) return null;
  const twoYearsAgo = Date.now() - 730 * 86_400_000;
  const windowStart = Math.max(release, twoYearsAgo);
  const since = new Date(windowStart).toISOString().replace(/\.\d{3}Z$/, "Z");
  const history = await json<Array<{ timestamp: string; shop: { id: number }; deal: { price: { amount: number; amountInt: number; currency: string } } }>>(
    `${ITAD}/games/history/v2?id=${encodeURIComponent(deal.id)}&country=CN&shops=${STEAM_SHOP_ID}&since=${encodeURIComponent(since)}`,
    { headers: { "ITAD-API-Key": key } },
  );
  const valid = history.filter((item) => item.shop.id === STEAM_SHOP_ID && item.deal.price.currency === "CNY");
  if (!valid.length) return null;
  const earliest = Math.min(...valid.map((item) => Date.parse(item.timestamp)));
  if (earliest > windowStart + 7 * 86_400_000) return null;
  const minimumMinor = Math.min(...valid.map((item) => item.deal.price.amountInt));
  const currentMinor = deal.deal.price.amountInt;
  if (currentMinor > Math.ceil(minimumMinor * 1.05)) return null;

  const lowStatus = currentMinor <= minimumMinor
    ? release > twoYearsAgo ? "RELEASE_LOW" : "TWO_YEAR_LOW"
    : "NEAR_LOW";
  const reviews = app.data.recommendations?.total ?? null;

  return {
    appId,
    title: app.data.name ?? deal.title,
    image: app.data.header_image ?? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
    currentPrice: deal.deal.price.amount,
    regularPrice: deal.deal.regular.amount,
    referenceLow: minimumMinor / 100,
    currency: "CNY",
    discount: deal.deal.cut,
    lowStatus,
    expiry: deal.deal.expiry,
    reviewPercent: null,
    reviewCount: reviews,
    genres: (app.data.genres ?? []).map((genre: { description: string }) => genre.description),
    observations: valid.length,
  };
}

export async function loadDeals(): Promise<DealPayload> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) return memoryCache.value;
  const key = process.env.ITAD_API_KEY;
  if (!key) {
    return { deals: demoDeals, source: "demo", checkedAt: new Date().toISOString(), region: "CN", diagnostics: { candidates: demoDeals.length, excluded: 0 } };
  }

  const response = await json<{ list?: ItadDeal[]; deals?: ItadDeal[] }>(
    `${ITAD}/deals/v2?country=CN&shops=${STEAM_SHOP_ID}&limit=40`,
    { headers: { "ITAD-API-Key": key } },
  );
  const candidates = (response.list ?? response.deals ?? []).filter((deal) => deal.type === "game").slice(0, 12);
  const mapping = await json<Record<string, string[]>>(`${ITAD}/lookup/shop/${STEAM_SHOP_ID}/id/v1`, {
    method: "POST",
    headers: { "ITAD-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(candidates.map((deal) => deal.id)),
  });

  const settled = [] as Array<PublicDeal | null>;
  for (const candidate of candidates) {
    try { settled.push(await enrich(candidate, mapping[candidate.id] ?? [], key)); }
    catch { settled.push(null); }
  }
  const deals = settled.filter((deal): deal is PublicDeal => deal !== null);
  const value: DealPayload = {
    deals,
    source: "live",
    checkedAt: new Date().toISOString(),
    region: "CN",
    diagnostics: { candidates: candidates.length, excluded: candidates.length - deals.length },
  };
  memoryCache = { expiresAt: Date.now() + CACHE_MS, value };
  return value;
}
