"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SceneAsset } from "@/components/game/FarmGameScene";
import { FARM_VISUAL_ASSETS } from "@/lib/visual-layout";

type Order = {
  key: string;
  period: "daily" | "weekly";
  title: string;
  description: string;
  cropKey: string | null;
  cropName: string | null;
  target: number;
  progress: number;
  coinReward: number;
  loveReward: number;
  completed: boolean;
  claimed: boolean;
};

type OrdersState = {
  farm: {
    coins: number;
    lovePoints: number;
  };
  orders: Order[];
};

export default function OrdersClient() {
  const [data, setData] = useState<OrdersState | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/orders", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setData(result);
    else setError(result.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function claim(orderKey: string) {
    setBusy(orderKey);
    setError("");
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderKey }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setMessage(`领取成功：+${result.coinReward} 金币 · +${result.loveReward} 情侣值`);
    await load();
    setTimeout(() => setMessage(""), 2600);
  }

  if (!data) {
    return (
      <main className="orders-visual-page">
        <div className="orders-loading">正在整理订单板...</div>
      </main>
    );
  }

  const sortedOrders = [...data.orders].sort((left, right) => orderStatusRank(left) - orderStatusRank(right));

  return (
    <main className="orders-visual-page">
      <div className="orders-game-scene">
        <Image
          className="orders-scene-background"
          src={FARM_VISUAL_ASSETS.background.src}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 860px"
        />
        <div className="orders-scene-wash" />

        <header className="orders-hud">
          <HudBadge text={`金币 ${data.farm.coins}`} asset={FARM_VISUAL_ASSETS.hud.coinBar} />
          <HudBadge text={`情侣值 ${data.farm.lovePoints}`} asset={FARM_VISUAL_ASSETS.hud.loveBar} />
          <div className="orders-title-sign">
            <SceneAsset asset={FARM_VISUAL_ASSETS.hud.farmSign} label="订单招牌" fill />
            <span>
              <b>订单板</b>
              <small>每日和每周采收任务</small>
            </span>
          </div>
        </header>

        <section className="orders-board" aria-label="订单列表">
          <div className="orders-list">
            {sortedOrders.map((order) => (
              <OrderCard key={order.key} order={order} busy={busy === order.key} onClaim={claim} />
            ))}
          </div>
        </section>

        {(error || message) && (
          <button
            className={`orders-toast ${error ? "error" : ""}`}
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            {error || message}
          </button>
        )}

        <nav className="orders-visual-nav" aria-label="游戏导航">
          <NavLink href="/farm" label="农场" asset={FARM_VISUAL_ASSETS.plots.empty} farm />
          <NavLink href="/shop" label="商店" asset={FARM_VISUAL_ASSETS.hud.shopButton} />
          <NavLink href="/orders" label="订单" asset={FARM_VISUAL_ASSETS.dialog.harvestButton} active />
          <NavLink href="/messages" label="留言" asset={FARM_VISUAL_ASSETS.hud.messagesButton} />
        </nav>
      </div>
    </main>
  );
}

function orderStatusRank(order: Order) {
  if (order.claimed) return 2;
  if (order.completed) return 0;
  return 1;
}

function HudBadge({ text, asset }: { text: string; asset: typeof FARM_VISUAL_ASSETS.hud.coinBar }) {
  return (
    <div className="orders-hud-badge">
      <SceneAsset asset={asset} label={text} fill />
      <span>{text}</span>
    </div>
  );
}

function OrderCard({
  order,
  busy,
  onClaim,
}: {
  order: Order;
  busy: boolean;
  onClaim: (orderKey: string) => void;
}) {
  const percent = Math.min(100, Math.round((order.progress / order.target) * 100));
  const cropAsset = order.cropKey
    ? FARM_VISUAL_ASSETS.crops[order.cropKey as keyof typeof FARM_VISUAL_ASSETS.crops]?.mature
    : FARM_VISUAL_ASSETS.dialog.harvestButton;

  return (
    <article className={`orders-card ${order.claimed ? "claimed" : ""}`}>
      <span className="orders-card-art">
        <SceneAsset asset={cropAsset} label={order.cropName || "订单作物"} fill />
      </span>
      <div className="orders-card-main">
        <span className={`orders-period-badge ${order.period}`}>
          {order.period === "daily" ? "每日" : "每周"}
        </span>
        <div className="orders-card-title">
          <b>{order.title}</b>
          <span>{order.progress} / {order.target}</span>
        </div>
        <p>{order.description}</p>
        <div className="orders-progress" aria-label={`进度 ${percent}%`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <small>奖励 +{order.coinReward} 金币 · +{order.loveReward} 情侣值</small>
      </div>
      <button
        type="button"
        disabled={busy || order.claimed || !order.completed}
        onClick={() => onClaim(order.key)}
      >
        {order.claimed ? "已领取" : busy ? "领取中" : order.completed ? "领取" : "进行中"}
      </button>
    </article>
  );
}

function NavLink({
  href,
  label,
  asset,
  active = false,
  farm = false,
}: {
  href: string;
  label: string;
  asset: typeof FARM_VISUAL_ASSETS.plots.empty;
  active?: boolean;
  farm?: boolean;
}) {
  return (
    <Link href={href} className={active ? "active" : ""}>
      <span className={`orders-nav-art ${farm ? "farm-art" : ""}`}>
        <SceneAsset asset={asset} label={label} fill />
      </span>
      <b>{label}</b>
    </Link>
  );
}
