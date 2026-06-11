"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "@/components/Nav";

type Item = { key: string; name: string; emoji: string; price: number; description?: string; rarity?: string; seedPrice?: number; sellPrice?: number; unlockLove: number };
type Shop = { coins: number; lovePoints: number; crops: Item[]; pets: Item[]; decorations: Item[]; ownedPets: string[]; ownedDecorations: Record<string, number>; expansion: { to: number; price: number } | null };

export default function ShopClient() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(() => fetch("/api/shop", { cache: "no-store" }).then((r) => r.json()).then(setShop), []);
  useEffect(() => { load(); }, [load]);

  async function buy(type: "pet" | "decoration" | "expand", key?: string) {
    setBusy(`${type}:${key || ""}`); setError("");
    const response = await fetch(`/api/shop/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: type === "expand" ? undefined : JSON.stringify({ key }) });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setMessage("购买成功，已经放进共同农场啦");
    await load();
    setTimeout(() => setMessage(""), 2200);
  }

  if (!shop) return <main className="grid min-h-screen place-items-center font-bold">正在整理货架...</main>;
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-6">
      <header className="card flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-sm text-slate-500">一起把农场变得更好</p><h1 className="text-3xl font-black">阳光小铺 🛒</h1></div><div className="flex gap-2"><span className="badge text-amber-700">🪙 {shop.coins}</span><span className="badge text-rose-700">💛 {shop.lovePoints}</span></div></header>
      {(error || message) && <p className={`mt-4 rounded-2xl p-3 text-center font-bold ${error ? "bg-red-50 text-red-700" : "bg-green-700 text-white"}`}>{error || message}</p>}
      <ShopSection title="🌱 种子图鉴" subtitle="种子在空土地上直接购买并播种">
        {shop.crops.map((item) => <article key={item.key} className="rounded-3xl bg-green-50 p-4"><div className="text-5xl">{item.emoji}</div><h3 className="mt-2 font-black">{item.name}</h3><p className="text-xs text-slate-500">{item.rarity} · 售价 🪙 {item.sellPrice}</p><p className="mt-2 font-bold text-amber-700">种子 🪙 {item.seedPrice}</p></article>)}
      </ShopSection>
      <ShopSection title="🐾 宠物伙伴" subtitle="技能自动生效，每种宠物首版限养一只">
        {shop.pets.map((item) => {
          const owned = shop.ownedPets.includes(item.key); const locked = shop.lovePoints < item.unlockLove;
          return <article key={item.key} className="rounded-3xl bg-amber-50 p-4"><div className="text-5xl">{item.emoji}</div><h3 className="mt-2 font-black">{item.name}</h3><p className="min-h-10 text-xs text-slate-500">{item.description}</p>{item.unlockLove > 0 && <p className="text-xs font-bold text-rose-600">需 💛 {item.unlockLove}</p>}<button onClick={() => buy("pet", item.key)} disabled={owned || locked || Boolean(busy)} className="btn-primary mt-3 w-full">{owned ? "已拥有" : `🪙 ${item.price}`}</button></article>;
        })}
      </ShopSection>
      <ShopSection title="🎀 农场装饰" subtitle="可以重复购买，每次购买情侣值 +1">
        {shop.decorations.map((item) => <article key={item.key} className="rounded-3xl bg-rose-50 p-4"><div className="text-5xl">{item.emoji}</div><h3 className="mt-2 font-black">{item.name}</h3><p className="text-xs text-slate-500">已拥有 {shop.ownedDecorations[item.key] || 0} 个</p>{item.unlockLove > 0 && <p className="text-xs font-bold text-rose-600">需 💛 {item.unlockLove}</p>}<button onClick={() => buy("decoration", item.key)} disabled={shop.lovePoints < item.unlockLove || Boolean(busy)} className="btn-primary mt-3 w-full">🪙 {item.price}</button></article>)}
      </ShopSection>
      <section className="card mt-5 p-5"><h2 className="text-xl font-black">🗺️ 扩建土地</h2>{shop.expansion ? <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-green-50 p-4"><div><p className="font-black">扩建到 {shop.expansion.to} 块土地</p><p className="text-sm text-slate-500">为更多作物腾出位置</p></div><button onClick={() => buy("expand")} disabled={Boolean(busy)} className="btn-primary">🪙 {shop.expansion.price}</button></div> : <p className="mt-3 text-slate-500">当前没有可用的扩建方案。</p>}</section>
      <Nav />
    </main>
  );
}

function ShopSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="card mt-5 p-5"><h2 className="text-xl font-black">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{children}</div></section>;
}
