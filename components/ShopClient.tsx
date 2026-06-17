"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FARM_VISUAL_ASSETS,
  type VisualAsset,
} from "@/lib/visual-layout";
import { SceneAsset } from "@/components/game/FarmGameScene";

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
  ownedPets: string[];
  activePetKey: string | null;
  expansion: { to: number; price: number } | null;
};

type Category = "seed" | "pet" | "expand";

export default function ShopClient() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [category, setCategory] = useState<Category>("seed");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    fetch("/api/shop", { cache: "no-store" })
      .then((response) => response.json())
      .then(setShop);
  }, []);

  useEffect(() => load(), [load]);

  async function buy(type: "pet" | "expand", key?: string) {
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
    setMessage("老板已经把东西送到农场啦");
    await load();
    setTimeout(() => setMessage(""), 2200);
  }

  async function choosePet(key: string) {
    setBusy(`active-pet:${key}`);
    setError("");
    const response = await fetch("/api/farm/pet/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setMessage("这只宠物已经到宠物窝门口啦");
    await load();
    setTimeout(() => setMessage(""), 2200);
  }

  if (!shop) {
    return (
      <main className="shop-visual-page">
        <div className="shop-visual-loading">正在准备村口小卖部...</div>
      </main>
    );
  }

  return (
    <main className="shop-visual-page">
      <div className="shop-game-scene">
        <Image
          className="shop-scene-background"
          src={FARM_VISUAL_ASSETS.background.src}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 860px"
        />
        <div className="shop-scene-wash" />

        <header className="shop-visual-hud">
          <ShopHud asset={FARM_VISUAL_ASSETS.hud.coinBar} text={`金币 ${shop.coins}`} />
          <ShopHud asset={FARM_VISUAL_ASSETS.hud.loveBar} text={`情侣值 ${shop.lovePoints}`} />
          <div className="shop-title-sign">
            <SceneAsset asset={FARM_VISUAL_ASSETS.hud.farmSign} label="商店招牌" fill />
            <span>
              <b>村口小卖部</b>
              <small>农场好物补给站</small>
            </span>
          </div>
        </header>

        <section className="shopkeeper-note">
          <b>欢迎光临！</b>
          <span>购买后会直接送到共同农场。</span>
        </section>

        <div className="shop-category-tabs" role="tablist" aria-label="商品分类">
          {(
            [
              ["seed", "种子"],
              ["pet", "宠物"],
              ["expand", "扩建"],
            ] as [Category, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={category === key ? "active" : ""}
              onClick={() => setCategory(key)}
              role="tab"
              aria-selected={category === key}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="shop-product-shelf">
          {category === "seed" &&
            shop.crops.map((item) => (
              <article key={item.key} className="shop-product-card shop-seed-card">
                <CardBackground />
                <div className="shop-product-pair">
                  <ShopAsset asset={seedAsset(item.key)} label={`${item.name}种子袋`} />
                  <ShopAsset asset={cropAsset(item.key)} label={`${item.name}成熟作物`} />
                </div>
                <b className="shop-product-name">{item.name}</b>
                <small>
                  {item.rarity} · 收获 {item.sellPrice}
                </small>
                <em>需在农场空地购买</em>
                <PriceTag price={item.seedPrice || 0} />
              </article>
            ))}

          {category === "pet" &&
            shop.pets.map((item) => {
              const owned = shop.ownedPets.includes(item.key);
              const active = shop.activePetKey === item.key;
              const locked = shop.lovePoints < item.unlockLove;
              return (
                <article key={item.key} className="shop-product-card">
                  <CardBackground />
                  <div className="shop-product-main-art">
                    <ShopAsset asset={petAsset(item.key)} label={`${item.name}素材`} />
                  </div>
                  <b className="shop-product-name">{item.name}</b>
                  <small>{item.description}</small>
                  <button
                    className={`shop-buy-button ${active ? "active-pet" : ""}`}
                    disabled={active || locked || Boolean(busy)}
                    onClick={() =>
                      owned ? choosePet(item.key) : buy("pet", item.key)
                    }
                  >
                    {active
                      ? "出场中"
                      : owned
                        ? "设为出场"
                        : locked
                        ? `需要 ${item.unlockLove} 爱心`
                        : <PriceTag price={item.price} compact />}
                  </button>
                </article>
              );
            })}

          {category === "expand" && (
            <div className="shop-expand-panel">
              <CardBackground />
              <div className="shop-expand-plots">
                {[0, 1, 2, 3].map((index) => (
                  <span key={index}>
                    <SceneAsset asset={FARM_VISUAL_ASSETS.plots.empty} label="土地" fill />
                  </span>
                ))}
              </div>
              {shop.expansion ? (
                <>
                  <h2>扩建到 {shop.expansion.to} 块土地</h2>
                  <p>村长会为你整理一块新的农田。</p>
                  <button
                    className="shop-buy-button"
                    disabled={Boolean(busy)}
                    onClick={() => buy("expand")}
                  >
                    <PriceTag price={shop.expansion.price} compact /> · 开始扩建
                  </button>
                </>
              ) : (
                <h2>暂时没有新的扩建方案</h2>
              )}
            </div>
          )}
        </section>

        {(error || message) && (
          <button
            className={`shop-visual-toast ${error ? "error" : ""}`}
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            {error || message}
          </button>
        )}

        <nav className="shop-visual-nav" aria-label="游戏导航">
          <Link href="/farm">
            <span className="shop-nav-art farm-art">
              <SceneAsset asset={FARM_VISUAL_ASSETS.plots.empty} label="农场" fill />
            </span>
            <b>农场</b>
          </Link>
          <Link href="/shop" className="active">
            <span className="shop-nav-art">
              <SceneAsset asset={FARM_VISUAL_ASSETS.hud.shopButton} label="商店" fill />
            </span>
            <b>商店</b>
          </Link>
          <Link href="/messages">
            <span className="shop-nav-art">
              <SceneAsset asset={FARM_VISUAL_ASSETS.hud.messagesButton} label="留言" fill />
            </span>
            <b>留言</b>
          </Link>
        </nav>
      </div>
    </main>
  );
}

function ShopHud({ asset, text }: { asset: VisualAsset; text: string }) {
  return (
    <div className="shop-hud-value">
      <SceneAsset asset={asset} label={text} fill />
      <span>{text}</span>
    </div>
  );
}

function CardBackground() {
  return (
    <span className="shop-card-background" aria-hidden="true">
      <SceneAsset asset={FARM_VISUAL_ASSETS.dialog.seedCard} label="商品卡片" fill />
    </span>
  );
}

function ShopAsset({ asset, label }: { asset: VisualAsset | undefined; label: string }) {
  return (
    <span className="shop-asset">
      <SceneAsset asset={asset} label={label} fill />
    </span>
  );
}

function PriceTag({ price, compact = false }: { price: number; compact?: boolean }) {
  return <span className={`shop-price-tag ${compact ? "compact" : ""}`}>金币 {price}</span>;
}

function seedAsset(key: string) {
  return FARM_VISUAL_ASSETS.seedBags[key as keyof typeof FARM_VISUAL_ASSETS.seedBags];
}

function cropAsset(key: string) {
  return FARM_VISUAL_ASSETS.crops[key as keyof typeof FARM_VISUAL_ASSETS.crops]?.mature;
}

function petAsset(key: string) {
  return FARM_VISUAL_ASSETS.pets[key as keyof typeof FARM_VISUAL_ASSETS.pets];
}
