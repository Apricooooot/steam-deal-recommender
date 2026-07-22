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
  TWO_YEAR_LOW: "两年史低",
  RELEASE_LOW: "发售以来史低",
  NEAR_LOW: "接近史低",
};

const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function remaining(expiry: string | null) {
  if (!expiry) return "截止时间未知";
  const hours = Math.ceil((new Date(expiry).getTime() - Date.now()) / 3_600_000);
  if (hours <= 0) return "已结束";
  if (hours < 24) return `还剩 ${hours} 小时`;
  return `还剩 ${Math.ceil(hours / 24)} 天`;
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
        <a className="brand" href="#top" aria-label="Steam 史低首页">
          <span className="brand-mark">S</span>
          <span>Steam 史低</span>
        </a>
        <div className="region-pill"><span /> 中国区 · CNY</div>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow">本周仍然有效的好价格</div>
        <h1>少翻促销列表，<br /><em>只看真正的史低。</em></h1>
        <p>筛出中国区 Steam 当前有效的基础游戏折扣，并按发售时间核对最近两年或发售以来的最低价格。</p>
        <div className="proof-row">
          <div><strong>{payload?.deals.length ?? "—"}</strong><span>个合格 Deal</span></div>
          <div><strong>¥</strong><span>中国区实付价</span></div>
          <div><strong>两年内</strong><span>最低价格</span></div>
        </div>
      </section>

      <section className="content" aria-busy={!payload && !error}>
        <div className="section-heading">
          <div>
            <span className="live-dot" />
            <p>当前有效</p>
            <h2>值得现在买的游戏</h2>
          </div>
          <p className="freshness">
            {payload ? `更新于 ${new Date(payload.checkedAt).toLocaleString("zh-CN")}` : "正在核对价格…"}
            {payload?.source === "demo" && <b>演示数据</b>}
          </p>
        </div>

        <div className="toolbar">
          <div className="filters" aria-label="史低状态筛选">
            {(["ALL", "TWO_YEAR_LOW", "RELEASE_LOW", "NEAR_LOW"] as const).map((value) => (
              <button className={status === value ? "active" : ""} key={value} onClick={() => setStatus(value)}>
                {value === "ALL" ? "全部" : statusText[value]}
              </button>
            ))}
          </div>
          <label>排序
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="deal">最接近史低</option>
              <option value="discount">折扣最高</option>
              <option value="price">价格最低</option>
              <option value="reviews">好评率最高</option>
            </select>
          </label>
        </div>

        {error && <div className="notice">暂时无法读取 Deal，请稍后刷新页面。</div>}
        {!payload && !error && <div className="loading-grid">{[1,2,3,4,5,6].map((item) => <div key={item} />)}</div>}
        {payload && deals.length === 0 && <div className="notice">当前筛选下没有符合条件的 Deal。</div>}

        <div className="deal-grid">
          {deals.map((deal) => (
            <article className="deal-card" key={deal.appId}>
              <div className="cover-wrap">
                {/* Steam's public CDN image is keyed by the canonical App ID. */}
                <img src={deal.image} alt={`${deal.title} 封面`} loading="lazy" />
                <span className={`low-badge ${deal.lowStatus === "NEAR_LOW" ? "near" : ""}`}>{statusText[deal.lowStatus]}</span>
                <span className="discount">-{deal.discount}%</span>
              </div>
              <div className="card-body">
                <div className="genres">{deal.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}</div>
                <h3>{deal.title}</h3>
                <div className="rating">
                  <span>{deal.reviewPercent ? `${deal.reviewPercent}% 好评` : "暂无评价"}</span>
                  {deal.reviewCount ? <small>{deal.reviewCount.toLocaleString("zh-CN")} 篇</small> : null}
                </div>
                <div className="price-row">
                  <div><strong>{money.format(deal.currentPrice)}</strong><del>{money.format(deal.regularPrice)}</del></div>
                  <span>{remaining(deal.expiry)}</span>
                </div>
                <div className="low-proof">
                  <span>参考低价 {money.format(deal.referenceLow)}</span>
                  <span>{deal.observations} 条价格记录</span>
                </div>
                <a
                  className="steam-button"
                  href={`https://store.steampowered.com/app/${deal.appId}/?cc=cn`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`前往 Steam 商店查看 ${deal.title}`}
                >
                  前往 Steam 商店 <span>↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>价格不是承诺。购买前请在 Steam 确认最终价格与截止时间。</p>
        <span>数据来源：Steam · IsThereAnyDeal</span>
      </footer>
    </main>
  );
}
