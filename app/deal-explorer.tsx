"use client";

import { useEffect, useMemo, useState } from "react";

type RegionCode = "CN" | "US";
type LocaleCode = "zh_CN" | "en_US";
type CurrencyCode = "CNY" | "USD";
type LowStatus = "TWO_YEAR_LOW" | "RELEASE_LOW" | "NEAR_LOW";

type Deal = {
  appId: number;
  title: string;
  image: string;
  currentPrice: number;
  regularPrice: number;
  referenceLow: number;
  currency: CurrencyCode;
  discount: number;
  lowStatus: LowStatus;
  expiry: string | null;
  reviewPercent: number | null;
  reviewCount: number | null;
  genres: string[];
  observations: number;
  referenceLowAt: string;
  historyWindowStart: string;
  historyWindow: "TWO_YEARS" | "SINCE_RELEASE";
};

type DealResponse = {
  deals: Deal[];
  source: "live" | "demo";
  checkedAt: string;
  region: RegionCode;
  locale: LocaleCode;
  currency: CurrencyCode;
  diagnostics?: { candidates: number; excluded: number };
};

const REGION_LABEL: Record<RegionCode, string> = {
  CN: "China · CNY",
  US: "United States · USD",
};

const REGION_CURRENCY: Record<RegionCode, CurrencyCode> = {
  CN: "CNY",
  US: "USD",
};

const copy = {
  zh_CN: {
    brand: "Steam 史低",
    brandAria: "Steam 史低首页",
    region: "地区",
    language: "语言",
    eyebrow: "多地区历史低价追踪",
    headlineA: "少翻促销列表，",
    headlineB: "只看真正的史低。",
    intro: "按 Steam 商店地区核对当前有效折扣，并用发售时间决定比较最近两年还是发售以来最低价。",
    qualifiedDeals: "个合格 Deal",
    regionalPrice: "地区实付价",
    lowWindow: "两年/发售以来",
    active: "当前有效",
    sectionTitle: "值得现在买的游戏",
    loading: "正在核对价格...",
    updated: "更新于",
    demo: "演示数据",
    filterAria: "史低状态筛选",
    all: "全部",
    sort: "排序",
    sortDeal: "最接近史低",
    sortDiscount: "折扣最高",
    sortPrice: "价格最低",
    sortReviews: "好评率最高",
    error: "暂时无法读取 Deal，请稍后刷新页面。",
    empty: "当前筛选下没有符合条件的 Deal。",
    cover: "封面",
    positive: "好评",
    noReviews: "暂无评价",
    reviews: "篇",
    referenceLow: "参考低价",
    lastSeen: "最近记录于",
    evidence: "查看价格依据",
    window: "比较区间",
    windowStart: "区间开始",
    observations: "变价记录",
    observationsUnit: "条",
    twoYears: "近两年",
    sinceRelease: "发售以来",
    evidenceNote: "日期表示数据源最近一次记录到该低价的时间；价格历史是变动日志，并非每日快照。",
    steam: "前往 Steam 商店",
    steamAria: "前往 Steam 商店查看",
    footer: "价格不是承诺。购买前请在 Steam 确认最终价格与截止时间。",
    source: "数据来源：Steam · IsThereAnyDeal",
    noExpiry: "截止时间未知",
    ended: "已结束",
    hoursLeft: (hours: number) => `还剩 ${hours} 小时`,
    daysLeft: (days: number) => `还剩 ${days} 天`,
    statusText: {
      TWO_YEAR_LOW: "两年史低",
      RELEASE_LOW: "发售以来史低",
      NEAR_LOW: "接近史低",
    } satisfies Record<LowStatus, string>,
  },
  en_US: {
    brand: "Steam Deal Recommender",
    brandAria: "Steam Deal Recommender home",
    region: "Region",
    language: "Language",
    eyebrow: "Multi-region historical-low tracking",
    headlineA: "Skip the sale noise.",
    headlineB: "Buy only real lows.",
    intro: "Compare active Steam discounts by store region, using release-aware history windows for two-year lows or lows since launch.",
    qualifiedDeals: "qualified deals",
    regionalPrice: "regional checkout price",
    lowWindow: "two-year / since launch",
    active: "Active now",
    sectionTitle: "Games worth buying now",
    loading: "Checking prices...",
    updated: "Updated",
    demo: "Demo data",
    filterAria: "Historical-low status filter",
    all: "All",
    sort: "Sort",
    sortDeal: "Closest to low",
    sortDiscount: "Highest discount",
    sortPrice: "Lowest price",
    sortReviews: "Best reviews",
    error: "Deal data is temporarily unavailable. Please refresh later.",
    empty: "No deals match the current filters.",
    cover: "cover image",
    positive: "positive",
    noReviews: "No reviews yet",
    reviews: "reviews",
    referenceLow: "Reference low",
    lastSeen: "Last seen",
    evidence: "View price evidence",
    window: "Window",
    windowStart: "Window start",
    observations: "Price observations",
    observationsUnit: "records",
    twoYears: "Previous two years",
    sinceRelease: "Since release",
    evidenceNote: "Dates show the latest provider observation for the reference low. Price history is a change log, not a daily snapshot.",
    steam: "Open on Steam",
    steamAria: "Open on Steam:",
    footer: "Prices are not promises. Confirm the final price and expiry on Steam before buying.",
    source: "Sources: Steam · IsThereAnyDeal",
    noExpiry: "Expiry unknown",
    ended: "Ended",
    hoursLeft: (hours: number) => `${hours}h left`,
    daysLeft: (days: number) => `${days}d left`,
    statusText: {
      TWO_YEAR_LOW: "Two-year low",
      RELEASE_LOW: "Lowest since launch",
      NEAR_LOW: "Near historical low",
    } satisfies Record<LowStatus, string>,
  },
} satisfies Record<LocaleCode, Record<string, unknown>>;

function remaining(expiry: string | null, locale: LocaleCode) {
  const text = copy[locale];
  if (!expiry) return text.noExpiry;
  const hours = Math.ceil((new Date(expiry).getTime() - Date.now()) / 3_600_000);
  if (hours <= 0) return text.ended;
  if (hours < 24) return text.hoursLeft(hours);
  return text.daysLeft(Math.ceil(hours / 24));
}

function intlLocale(locale: LocaleCode) {
  return locale === "zh_CN" ? "zh-CN" : "en-US";
}

export function DealExplorer() {
  const [region, setRegion] = useState<RegionCode>("CN");
  const [locale, setLocale] = useState<LocaleCode>("zh_CN");
  const [payload, setPayload] = useState<DealResponse | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<"ALL" | LowStatus>("ALL");
  const [sort, setSort] = useState("deal");
  const text = copy[locale];

  useEffect(() => {
    setPayload(null);
    setError(false);
    fetch(`/api/deals?region=${region}&locale=${locale}`)
      .then((response) => {
        if (!response.ok) throw new Error("deal request failed");
        return response.json();
      })
      .then(setPayload)
      .catch(() => setError(true));
  }, [locale, region]);

  const money = useMemo(() => new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: payload?.currency ?? REGION_CURRENCY[region],
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }), [locale, payload?.currency, region]);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(intlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }), [locale]);

  const deals = useMemo(() => {
    const filtered = [...(payload?.deals ?? [])].filter(
      (deal) => status === "ALL" || deal.lowStatus === status,
    );
    return filtered.sort((a, b) => {
      if (sort === "price") return a.currentPrice - b.currentPrice;
      if (sort === "discount") return b.discount - a.discount;
      if (sort === "reviews") return (b.reviewPercent ?? 0) - (a.reviewPercent ?? 0);
      return a.currentPrice / a.referenceLow - b.currentPrice / b.referenceLow;
    });
  }, [payload, sort, status]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label={text.brandAria}>
          <span className="brand-mark">S</span>
          <span>{text.brand}</span>
        </a>
        <div className="selectors" aria-label="Region and language controls">
          <label>{text.region}
            <select value={region} onChange={(event) => setRegion(event.target.value as RegionCode)}>
              <option value="CN">{REGION_LABEL.CN}</option>
              <option value="US">{REGION_LABEL.US}</option>
            </select>
          </label>
          <label>{text.language}
            <select value={locale} onChange={(event) => setLocale(event.target.value as LocaleCode)}>
              <option value="zh_CN">中文</option>
              <option value="en_US">English</option>
            </select>
          </label>
          <div className="region-pill"><span /> {REGION_LABEL[payload?.region ?? region]}</div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">{text.eyebrow}</div>
        <h1>{text.headlineA}<br /><em>{text.headlineB}</em></h1>
        <p>{text.intro}</p>
        <div className="proof-row">
          <div><strong>{payload?.deals.length ?? "-"}</strong><span>{text.qualifiedDeals}</span></div>
          <div><strong>{payload?.currency ?? REGION_CURRENCY[region]}</strong><span>{text.regionalPrice}</span></div>
          <div><strong>{payload?.region ?? region}</strong><span>{text.lowWindow}</span></div>
        </div>
      </section>

      <section className="content" aria-busy={!payload && !error}>
        <div className="section-heading">
          <div>
            <span className="live-dot" />
            <p>{text.active}</p>
            <h2>{text.sectionTitle}</h2>
          </div>
          <p className="freshness">
            {payload ? `${text.updated} ${new Date(payload.checkedAt).toLocaleString(intlLocale(locale))}` : text.loading}
            {payload?.source === "demo" && <b>{text.demo}</b>}
          </p>
        </div>

        <div className="toolbar">
          <div className="filters" aria-label={text.filterAria}>
            {(["ALL", "TWO_YEAR_LOW", "RELEASE_LOW", "NEAR_LOW"] as const).map((value) => (
              <button className={status === value ? "active" : ""} key={value} onClick={() => setStatus(value)}>
                {value === "ALL" ? text.all : text.statusText[value]}
              </button>
            ))}
          </div>
          <label>{text.sort}
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="deal">{text.sortDeal}</option>
              <option value="discount">{text.sortDiscount}</option>
              <option value="price">{text.sortPrice}</option>
              <option value="reviews">{text.sortReviews}</option>
            </select>
          </label>
        </div>

        {error && <div className="notice">{text.error}</div>}
        {!payload && !error && <div className="loading-grid">{[1,2,3,4,5,6].map((item) => <div key={item} />)}</div>}
        {payload && deals.length === 0 && <div className="notice">{text.empty}</div>}

        <div className="deal-grid">
          {deals.map((deal) => (
            <article className="deal-card" key={deal.appId}>
              <div className="cover-wrap">
                <img src={deal.image} alt={`${deal.title} ${text.cover}`} loading="lazy" />
                <span className={`low-badge ${deal.lowStatus === "NEAR_LOW" ? "near" : ""}`}>{text.statusText[deal.lowStatus]}</span>
                <span className="discount">-{deal.discount}%</span>
              </div>
              <div className="card-body">
                <div className="genres">{deal.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}</div>
                <h3>{deal.title}</h3>
                <div className="rating">
                  <span>{deal.reviewPercent ? `${deal.reviewPercent}% ${text.positive}` : text.noReviews}</span>
                  {deal.reviewCount ? <small>{deal.reviewCount.toLocaleString(intlLocale(locale))} {text.reviews}</small> : null}
                </div>
                <div className="price-row">
                  <div><strong>{money.format(deal.currentPrice)}</strong><del>{money.format(deal.regularPrice)}</del></div>
                  <span>{remaining(deal.expiry, locale)}</span>
                </div>
                <div className="low-proof">
                  <span>{text.referenceLow} {money.format(deal.referenceLow)}</span>
                  <span>{text.lastSeen} {dateFormatter.format(new Date(deal.referenceLowAt))}</span>
                </div>
                <details className="price-evidence">
                  <summary>{text.evidence} <span>+</span></summary>
                  <dl>
                    <div><dt>{text.window}</dt><dd>{deal.historyWindow === "TWO_YEARS" ? text.twoYears : text.sinceRelease}</dd></div>
                    <div><dt>{text.windowStart}</dt><dd>{dateFormatter.format(new Date(deal.historyWindowStart))}</dd></div>
                    <div><dt>{text.observations}</dt><dd>{deal.observations} {text.observationsUnit}</dd></div>
                  </dl>
                  <p>{text.evidenceNote}</p>
                </details>
                <a
                  className="steam-button"
                  href={`https://store.steampowered.com/app/${deal.appId}/?cc=${(payload?.region ?? region).toLowerCase()}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${text.steamAria} ${deal.title}`}
                >
                  {text.steam} <span>↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>{text.footer}</p>
        <span>{text.source}</span>
      </footer>
    </main>
  );
}
