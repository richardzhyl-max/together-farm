"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CoinIcon,
  CropArt,
  DecorationArt,
  FarmHouse,
  HeartIcon,
  PetArt,
  SeedBagArt,
  TreeArt,
} from "@/components/GameAssets";
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

type Category = "seed" | "pet" | "decoration" | "expand";

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
    setMessage("老板已经把东西送到农场啦");
    await load();
    setTimeout(() => setMessage(""), 2200);
  }

  if (!shop) {
    return (
      <main className="pixel-game-page">
        <div className="pixel-loading">LOADING SHOP...</div>
      </main>
    );
  }

  return (
    <main className="pixel-game-page">
      <div className="pixel-game-canvas shop-scene">
        <div className="shop-map">
          <TreeArt className="shop-pixel-tree left" />
          <TreeArt className="shop-pixel-tree right" />
          <FarmHouse className="shop-pixel-building" />
          <div className="pixel-shop-sign">SEED &amp; PET SHOP</div>
        </div>

        <div className="shop-pixel-wallet">
          <span>
            <CoinIcon /> <b>{shop.coins}</b>
          </span>
          <span>
            <HeartIcon /> <b>{shop.lovePoints}</b>
          </span>
        </div>

        <div className="pixel-shop-window">
          <div className="pixel-shopkeeper" aria-hidden="true" />
          <p>欢迎光临！选好商品后会直接送到共同农场。</p>
        </div>

        <div className="pixel-shop-tabs">
          {(
            [
              ["seed", "种子"],
              ["pet", "宠物"],
              ["decoration", "装饰"],
              ["expand", "扩建"],
            ] as [Category, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={category === key ? "active" : ""}
              onClick={() => setCategory(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pixel-shop-shelf">
          {category === "seed" &&
            shop.crops.map((item) => (
              <article key={item.key} className="pixel-product-card">
                <SeedBagArt cropKey={item.key} className="pixel-product-art" />
                <CropArt cropKey={item.key} stage="mature" className="pixel-product-crop" />
                <b>{item.name}</b>
                <small>
                  {item.rarity} · 收获 {item.sellPrice}
                </small>
                <span>
                  <CoinIcon /> {item.seedPrice}
                </span>
                <em>在农场空地购买</em>
              </article>
            ))}

          {category === "pet" &&
            shop.pets.map((item) => {
              const owned = shop.ownedPets.includes(item.key);
              const locked = shop.lovePoints < item.unlockLove;
              return (
                <article key={item.key} className="pixel-product-card">
                  <PetArt petKey={item.key} className="pixel-product-pet" />
                  <b>{item.name}</b>
                  <small>{item.description}</small>
                  <button
                    disabled={owned || locked || Boolean(busy)}
                    onClick={() => buy("pet", item.key)}
                  >
                    {owned
                      ? "已拥有"
                      : locked
                        ? `需要 ${item.unlockLove} 爱心`
                        : <><CoinIcon /> {item.price}</>}
                  </button>
                </article>
              );
            })}

          {category === "decoration" &&
            shop.decorations.map((item) => (
              <article key={item.key} className="pixel-product-card">
                <DecorationArt decorationKey={item.key} className="pixel-product-decoration" />
                <b>{item.name}</b>
                <small>农场已有 {shop.ownedDecorations[item.key] || 0} 个</small>
                <button
                  disabled={shop.lovePoints < item.unlockLove || Boolean(busy)}
                  onClick={() => buy("decoration", item.key)}
                >
                  <CoinIcon /> {item.price}
                </button>
              </article>
            ))}

          {category === "expand" && (
            <div className="pixel-expand-panel">
              <div className="pixel-expand-plots">
                <i />
                <i />
                <i />
                <i />
              </div>
              {shop.expansion ? (
                <>
                  <h2>扩建到 {shop.expansion.to} 块土地</h2>
                  <p>村长会为你整理一块新的农田。</p>
                  <button disabled={Boolean(busy)} onClick={() => buy("expand")}>
                    <CoinIcon /> {shop.expansion.price} · 开始扩建
                  </button>
                </>
              ) : (
                <h2>暂时没有新的扩建方案</h2>
              )}
            </div>
          )}
        </div>

        {(error || message) && (
          <button
            className={`pixel-toast ${error ? "error" : ""}`}
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            {error || message}
          </button>
        )}
      </div>
      <Nav />
    </main>
  );
}
