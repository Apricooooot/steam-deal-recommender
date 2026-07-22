"use client";

import { useEffect, useMemo, useState } from "react";

type LowStatus = "TWO_YEAR_LOW" | "RELEASE_LOW" | "NEAR_LOW";

type Deal = {
  appId: number;
  title: string;
  image: string;
  currentPrice: number;
  regularPrice: number;
  referenceLow: number;
  currency: "CNY";
  discount: number;
  lowStatus: LowStatus;
  expiry: string | null;
  reviewPercent: number | null;
  reviewCount: number | null;
  genres: string[];
  observations: number;
};

type DealResponse = {
  deals: Deal[];
  source: "live" | "demo";
  checkedAt: string;
  region: "CN";
  diagnostics?: { candidates: number; excluded: number };
};

const statusText: Record<LowStatus, string> = {
  TWO_YEAR_LOW: "ä¸¤å¹´å²ä½Ž",
  RELEASE_LOW: "å‘å”®ä»¥æ¥å²ä½Ž",
  NEAR_LOW: "æŽ¥è¿‘å²ä½Ž",
};

const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function remaining(expiry: string | null) {
  if (!expiry) return "æˆªæ­¢æ—¶é—´æœªçŸ¥";
  const hours = Math.ceil((new Date(expiry).getTime() - Date.now()) / 3_600_000);
  if (hours <= 0) return "å·²ç»“æŸ";
  if (hours < 24) return `è¿˜å‰© ${hours} å°æ—¶`;
  return `è¿˜å‰© ${Math.ceil(hours / 24)} å¤©`;
}

export function DealExplorer() {
  const [payload, setPayload] = useState<DealResponse | null>(null);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<"ALL" | LowStatus>("ALL");
  const [sort, setSort] = useState("deal");

  useEffect(() => {
    fetch("/api/deals?country=CN")
      .then((response) => {
        if (!response.ok) throw new Error("deal request failed");
        return response.json();
      })
      .then(setPayload)
      .catch(() => setError(true));
  }, []);

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
        <a className="brand" href="#top" aria-label="Steam å²ä½Žé¦–é¡µ">
          <span className="brand-mark">S</span>
          <span>Steam å²ä½Ž</span>
        </a>
        <div className="region-pill"><span /> ä¸­å›½åŒº Â· CNY</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">æœ¬å‘¨ä»ç„¶æœ‰æ•ˆçš„å¥½ä»·æ ¼</div>
        <h1>å°‘ç¿»ä¿ƒé”€åˆ—è¡¨ï¼Œ<br /><em>åªçœ‹çœŸæ­£çš„å²ä½Žã€‚</em></h1>
        <p>ç­›å‡ºä¸­å›½åŒº Steam å½“å‰æœ‰æ•ˆçš„åŸºç¡€æ¸¸æˆæŠ˜æ‰£ï¼Œå¹¶æŒ‰å‘å”®æ—¶é—´æ ¸å¯¹æœ€è¿‘ä¸¤å¹´æˆ–å‘å”®ä»¥æ¥çš„æœ€ä½Žä»·æ ¼ã€‚</p>
        <div className="proof-row">
          <div><strong>{payload?.deals.length ?? "â€”"}</strong><span>ä¸ªåˆæ ¼ Deal</span></div>
          <div><strong>Â¥</strong><span>ä¸­å›½åŒºå®žä»˜ä»·</span></div>
          <div><strong>730</strong><span>å¤©ä»·æ ¼çª—å£</span></div>
        </div>
      </section>

      <section className="content" aria-busy={!payload && !error}>
        <div className="section-heading">
          <div>
            <span className="live-dot" />
            <p>å½“å‰æœ‰æ•ˆ</p>
            <h2>å€¼å¾—çŽ°åœ¨ä¹°çš„æ¸¸æˆ</h2>
          </div>
          <p className="freshness">
            {payload ? `æ›´æ–°äºŽ ${new Date(payload.checkedAt).toLocaleString("zh-CN")}` : "æ­£åœ¨æ ¸å¯¹ä»·æ ¼â€¦"}
            {payload?.source === "demo" && <b>æ¼”ç¤ºæ•°æ®</b>}
          </p>
        </div>

        <div className="toolbar">
          <div className="filters" aria-label="å²ä½ŽçŠ¶æ€ç­›é€‰">
            {(["ALL", "TWO_YEAR_LOW", "RELEASE_LOW", "NEAR_LOW"] as const).map((value) => (
              <button className={status === value ? "active" : ""} key={value} onClick={() => setStatus(value)}>
                {value === "ALL" ? "å…¨éƒ¨" : statusText[value]}
              </button>
            ))}
          </div>
          <label>æŽ’åº
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="deal">æœ€æŽ¥è¿‘å²ä½Ž</option>
              <option value="discount">æŠ˜æ‰£æœ€é«˜</option>
              <option value="price">ä»·æ ¼æœ€ä½Ž</option>
              <option value="reviews">å¥½è¯„çŽ‡æœ€é«˜</option>
            </select>
          </label>
        </div>

        {error && <div className="notice">æš‚æ—¶æ— æ³•è¯»å– Dealï¼Œè¯·ç¨åŽåˆ·æ–°é¡µé¢ã€‚</div>}
        {!payload && !error && <div className="loading-grid">{[1,2,3,4,5,6].map((item) => <div key={item} />)}</div>}
        {payload && deals.length === 0 && <div className="notice">å½“å‰ç­›é€‰ä¸‹æ²¡æœ‰ç¬¦åˆæ¡ä»¶çš„ Dealã€‚</div>}

        <div className="deal-grid">
          {deals.map((deal) => (
            <article className="deal-card" key={deal.appId}>
              <div className="cover-wrap">
                {/* Steam's public CDN image is keyed by the canonical App ID. */}
                <img src={deal.image} alt={`${deal.title} å°é¢`} loading="lazy" />
                <span className={`low-badge ${deal.lowStatus === "NEAR_LOW" ? "near" : ""}`}>{statusText[deal.lowStatus]}</span>
                <span className="discount">-{deal.discount}%</span>
              </div>
              <div className="card-body">
                <div className="genres">{deal.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}</div>
                <h3>{deal.title}</h3>
                <div className="rating">
                  <span>{deal.reviewPercent ? `${deal.reviewPercent}% å¥½è¯„` : "æš‚æ— è¯„ä»·"}</span>
                  {deal.reviewCount ? <small>{deal.reviewCount.toLocaleString("zh-CN")} ç¯‡</small> : null}
                </div>
                <div className="price-row">
                  <div><strong>{money.format(deal.currentPrice)}</strong><del>{money.format(deal.regularPrice)}</del></div>
                  <span>{remaining(deal.expiry)}</span>
                </div>
                <div className="low-proof">
                  <span>å‚è€ƒä½Žä»· {money.format(deal.referenceLow)}</span>
                  <span>{deal.observations} æ¡ä»·æ ¼è®°å½•</span>
                </div>
                <a href={`https://store.steampowered.com/app/${deal.appId}/?cc=cn`} target="_blank" rel="noreferrer">
                  å‰å¾€ Steam <span>â†—</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>ä»·æ ¼ä¸æ˜¯æ‰¿è¯ºã€‚è´­ä¹°å‰è¯·åœ¨ Steam ç¡®è®¤æœ€ç»ˆä»·æ ¼ä¸Žæˆªæ­¢æ—¶é—´ã€‚</p>
        <span>æ•°æ®æ¥æºï¼šSteam Â· IsThereAnyDeal</span>
      </footer>
    </main>
  );
}
