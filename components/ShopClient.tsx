"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";

type Item = {
  key: string;
  name: string;
  emoji: string;
  price: number;
  description?: string;
  rarity?: string;
  seedPrice?: number;
  sellPrice?: number;
  unlockLove: number;
};

type Shop = {
  coins: number;
  lovePoints: number;
  crops: Item[];
  pets: Item[];
  decorations: Item[];
  ownedPets: string[];
  ownedDecorations: Record<string, number>;
  expansion: { to: number; price: number } | null;
};

export default function ShopClient() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    fetch("/api/shop", { cache: "no-store" })
      .then((response) => response.json())
      .then(setShop);
  }, []);

  useEffect(() => load(), [load]);

  async function buy(type: "pet" | "decoration" | "expand", key?: string) {
    setBusy(`${type}:${key || ""}`);
    setError("");
    const response = await fetch(`/api/shop/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: type === "expand" ? undefined : JSON.stringify({ key }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setMessage("购买成功，已经放进共同农场啦");
    await load();
    setTimeout(() => setMessage(""), 2200);
  }

  if (!shop) {
    return (
      <main className="farm-world grid min-h-screen place-items-center">
        <div className="game-panel px-10 py-8 text-center">
          <div className="crop-bob text-6xl">🛒</div>
          <p className="mt-3 font-black">正在整理货架...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="farm-world min-h-screen pb-28 pt-4">
      <div className="mx-auto max-w-5xl px-3 sm:px-6">
        <header className="hud rounded-[28px] p-4 text-white sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-green-100">✨ 一起把农场变得更好</p>
              <h1 className="text-2xl font-black drop-shadow sm:text-3xl">阳光小铺 🛒</h1>
            </div>
            <div className="flex gap-2">
              <span className="hud-pill">🪙 {shop.coins}</span>
              <span className="hud-pill text-rose-700">💛 {shop.lovePoints}</span>
            </div>
          </div>
        </header>

        {(error || message) && (
          <button
            onClick={() => {
              setError("");
              setMessage("");
            }}
            className={`mt-4 w-full rounded-2xl p-3 text-center font-black text-white shadow ${
              error ? "bg-red-600" : "bg-green-700"
            }`}
          >
            {error || message}
          </button>
        )}

        <ShopSection
          title="🌱 种子图鉴"
          subtitle="在空土地上选择种子即可购买并播种"
          tone="green"
        >
          {shop.crops.map((item) => (
            <article
              key={item.key}
              className="shop-card rounded-[24px] bg-gradient-to-b from-green-50 to-lime-100 p-4"
            >
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/35" />
              <div className="relative text-5xl drop-shadow">{item.emoji}</div>
              <h3 className="relative mt-2 font-black">{item.name}</h3>
              <span className="relative mt-1 inline-block rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold text-green-800">
                {item.rarity}
              </span>
              <p className="relative mt-2 text-xs font-bold text-green-900/60">
                收获售价 🪙 {item.sellPrice}
              </p>
              <p className="relative mt-1 text-sm font-black text-amber-700">
                种子 🪙 {item.seedPrice}
              </p>
            </article>
          ))}
        </ShopSection>

        <ShopSection
          title="🐾 宠物伙伴"
          subtitle="技能自动生效，每种宠物限养一只"
          tone="amber"
        >
          {shop.pets.map((item) => {
            const owned = shop.ownedPets.includes(item.key);
            const locked = shop.lovePoints < item.unlockLove;
            return (
              <article
                key={item.key}
                className="shop-card rounded-[24px] bg-gradient-to-b from-amber-50 to-orange-100 p-4 text-center"
              >
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-amber-200/60 text-5xl shadow-inner">
                  <span className="crop-bob">{item.emoji}</span>
                </div>
                <h3 className="mt-2 font-black text-amber-950">{item.name}</h3>
                <p className="min-h-10 text-xs text-amber-900/65">{item.description}</p>
                {item.unlockLove > 0 && (
                  <p className="text-xs font-black text-rose-600">需 💛 {item.unlockLove}</p>
                )}
                <button
                  onClick={() => buy("pet", item.key)}
                  disabled={owned || locked || Boolean(busy)}
                  className="btn-primary mt-3 w-full"
                >
                  {owned ? "已入住" : locked ? "尚未解锁" : `🪙 ${item.price}`}
                </button>
              </article>
            );
          })}
        </ShopSection>

        <ShopSection
          title="🎀 农场装饰"
          subtitle="装点共同天地，每次购买情侣值 +1"
          tone="rose"
        >
          {shop.decorations.map((item) => (
            <article
              key={item.key}
              className="shop-card rounded-[24px] bg-gradient-to-b from-rose-50 to-pink-100 p-4"
            >
              <div className="text-5xl drop-shadow">{item.emoji}</div>
              <h3 className="mt-2 font-black">{item.name}</h3>
              <p className="text-xs text-rose-900/60">
                已拥有 {shop.ownedDecorations[item.key] || 0} 个
              </p>
              {item.unlockLove > 0 && (
                <p className="mt-1 text-xs font-black text-rose-600">需 💛 {item.unlockLove}</p>
              )}
              <button
                onClick={() => buy("decoration", item.key)}
                disabled={shop.lovePoints < item.unlockLove || Boolean(busy)}
                className="btn-primary mt-3 w-full"
              >
                🪙 {item.price}
              </button>
            </article>
          ))}
        </ShopSection>

        <section className="game-panel mt-6 overflow-hidden p-5">
          <div className="wood-sign inline-block -rotate-1 rounded-2xl px-4 py-2">
            <h2 className="text-xl font-black">🗺️ 扩建土地</h2>
          </div>
          {shop.expansion ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border-[3px] border-white bg-gradient-to-r from-green-100 to-yellow-50 p-4 shadow-inner">
              <div>
                <p className="font-black">扩建到 {shop.expansion.to} 块土地</p>
                <p className="text-sm text-green-900/60">给更多作物准备一片新泥土</p>
              </div>
              <button
                onClick={() => buy("expand")}
                disabled={Boolean(busy)}
                className="btn-primary"
              >
                🪙 {shop.expansion.price}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-slate-500">当前没有可用的扩建方案。</p>
          )}
        </section>
      </div>
      <Nav />
    </main>
  );
}

function ShopSection({
  title,
  subtitle,
  tone,
  children,
}: {
  title: string;
  subtitle: string;
  tone: "green" | "amber" | "rose";
  children: React.ReactNode;
}) {
  const backgrounds = {
    green: "from-green-100/90 to-lime-50/90",
    amber: "from-amber-100/90 to-yellow-50/90",
    rose: "from-rose-100/90 to-pink-50/90",
  };
  return (
    <section
      className={`mt-6 rounded-[30px] border-4 border-white/80 bg-gradient-to-b ${backgrounds[tone]} p-4 shadow-soft sm:p-5`}
    >
      <h2 className="text-xl font-black">{title}</h2>
      <p className="text-sm text-green-900/55">{subtitle}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {children}
      </div>
    </section>
  );
}
