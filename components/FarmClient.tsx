"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import Nav from "@/components/Nav";

type Crop = { key: string; name: string; emoji: string; rarity: string; seedPrice: number };
type Plot = { id: string; index: number; state: "empty" | "growing" | "mature" | "withered"; crop: Crop | null; matureAt: string | null; witherAt: string | null; waterBoostSeconds: number };
type Farm = {
  id: string; name: string; inviteCode: string; coins: number; lovePoints: number; plotCount: number;
  members: { id: string; username: string }[]; plots: Plot[]; pets: { key: string; name: string; emoji: string; description: string }[];
  decorations: { key: string; name: string; emoji: string; quantity: number }[];
  bonuses: { sell: number; grow: number; cooldown: number }; expansion: { to: number; price: number } | null;
};

function formatRemaining(target: string | null, now: number) {
  if (!target) return "";
  const seconds = Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000));
  if (seconds <= 0) return "状态更新中";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours ? `${hours}时` : ""}${minutes}分${secs}秒`;
}

export default function FarmClient() {
  const [farm, setFarm] = useState<Farm | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Plot | null>(null);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const response = await fetch("/api/farm", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setFarm(data);
    else setError(data.error);
  }, []);

  useEffect(() => { load(); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [load]);
  useEffect(() => {
    if (!farm?.id) return;
    const socket = io({ path: "/socket.io" });
    socket.emit("farm:join", farm.id);
    socket.on("farm:update", load);
    return () => { socket.disconnect(); };
  }, [farm?.id, load]);
  useEffect(() => {
    if (!farm) return;
    const stale = farm.plots.some((p) => p.state === "growing" && p.matureAt && new Date(p.matureAt).getTime() <= now);
    if (stale) load();
  }, [now, farm, load]);

  const crops = useMemo(() => {
    const map = new Map<string, Crop>();
    farm?.plots.forEach((plot) => { if (plot.crop) map.set(plot.crop.key, plot.crop); });
    return [...map.values()];
  }, [farm]);

  async function action(path: string, body: object, success: string) {
    setBusy(path);
    setError("");
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setNotice(path.includes("harvest") ? `${success}，获得 ${result.earned} 金币` : success);
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2500);
  }

  if (!farm) return <main className="grid min-h-screen place-items-center text-center"><div><div className="text-6xl crop-bob">🌱</div><p className="mt-4 font-bold">{error || "正在走进农场..."}</p></div></main>;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5 sm:px-6">
      <header className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-green-700 to-green-500 p-5 text-white">
          <div><p className="text-sm text-green-100">两个人的共同天地</p><h1 className="text-2xl font-black">{farm.name}</h1></div>
          <div className="flex flex-wrap gap-2"><span className="badge text-amber-700">🪙 {farm.coins}</span><span className="badge text-rose-700">💛 {farm.lovePoints}</span><button onClick={() => navigator.clipboard.writeText(farm.inviteCode).then(() => setNotice("邀请码已复制"))} className="badge text-leaf">邀请码 {farm.inviteCode}</button></div>
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm"><span className="font-bold">农场伙伴：</span>{farm.members.map((m) => <span key={m.id}>👩‍🌾 {m.username}</span>)}{farm.members.length < 2 && <span className="text-slate-400">等待另一半加入...</span>}</div>
      </header>

      {(error || notice) && <div className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 font-bold text-white shadow-soft ${error ? "bg-red-600" : "bg-leaf"}`} onClick={() => { setError(""); setNotice(""); }}>{error || notice}</div>}

      <section className="relative mt-5 overflow-hidden rounded-[32px] border-4 border-white/50 bg-gradient-to-b from-[#92d67d] to-[#5fa95e] p-4 shadow-soft sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative mb-4 flex items-end justify-between"><div><h2 className="text-xl font-black text-green-950">今日田地</h2><p className="text-sm text-green-900/70">点击地块进行操作，成长以服务器时间为准</p></div><span className="badge">{farm.plotCount} 块</span></div>
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {farm.plots.map((plot) => (
            <button key={plot.id} onClick={() => setSelected(plot)} className="plot relative aspect-[1.18] overflow-hidden rounded-3xl p-2 text-white transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-yellow-200">
              <span className="absolute left-2 top-2 text-xs font-black text-white/70">#{plot.index + 1}</span>
              <div className="grid h-full place-items-center">
                {plot.state === "empty" ? <div><div className="text-3xl">➕</div><div className="mt-1 text-xs font-bold">播种</div></div> :
                  <div><div className={`text-5xl ${plot.state === "growing" ? "crop-bob" : ""}`}>{plot.state === "withered" ? "🥀" : plot.crop?.emoji}</div><div className="mt-1 text-sm font-black">{plot.crop?.name}</div><div className="mt-1 rounded-full bg-black/25 px-2 py-1 text-[11px] font-bold">{plot.state === "growing" ? formatRemaining(plot.matureAt, now) : plot.state === "mature" ? "可以收获啦" : "已枯萎 · 半价"}</div></div>}
              </div>
              {plot.waterBoostSeconds > 0 && <span className="absolute right-2 top-2 text-xs">💧</span>}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card p-5"><h2 className="text-lg font-black">🐾 农场伙伴</h2><div className="mt-3 flex min-h-20 flex-wrap gap-3">{farm.pets.length ? farm.pets.map((pet) => <div key={pet.key} className="rounded-2xl bg-amber-50 p-3 text-center"><div className="text-4xl">{pet.emoji}</div><p className="text-xs font-bold">{pet.name}</p></div>) : <p className="text-sm text-slate-400">去商城领一只小伙伴回家吧。</p>}</div></section>
        <section className="card p-5"><h2 className="text-lg font-black">🎀 农场装饰</h2><div className="mt-3 flex min-h-20 flex-wrap gap-3">{farm.decorations.length ? farm.decorations.map((item) => <div key={item.key} className="rounded-2xl bg-rose-50 p-3 text-center"><div className="text-3xl">{item.emoji}</div><p className="text-xs font-bold">{item.name} ×{item.quantity}</p></div>) : <p className="text-sm text-slate-400">这里还空着，添一点属于你们的风景。</p>}</div></section>
      </div>

      {selected && <div className="fixed inset-0 z-40 grid place-items-end bg-black/30 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => setSelected(null)}>
        <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between"><h3 className="text-xl font-black">第 {selected.index + 1} 块土地</h3><button className="text-2xl text-slate-400" onClick={() => setSelected(null)}>×</button></div>
          {selected.state === "empty" ? <div className="mt-4"><p className="mb-3 text-sm text-slate-500">选择要种下的作物，种子费用会从共同钱包扣除。</p><CropChoices plotId={selected.id} action={action} busy={busy} fallback={crops} /></div> :
            <div className="mt-5 text-center"><div className="text-7xl">{selected.state === "withered" ? "🥀" : selected.crop?.emoji}</div><h4 className="mt-2 text-xl font-black">{selected.crop?.name}</h4><p className="mt-1 text-sm text-slate-500">{selected.state === "growing" ? `距离成熟 ${formatRemaining(selected.matureAt, now)}` : selected.state === "mature" ? "成熟啦，快把丰收装进口袋" : "虽然错过了最佳时间，仍可半价卖出"}</p>
              {selected.state === "growing" && <button className="btn-primary mt-5 w-full" disabled={Boolean(busy)} onClick={() => action("/api/farm/water", { plotId: selected.id }, "浇水成功，情侣值 +1")}>💧 浇水加速 5%</button>}
              {(selected.state === "mature" || selected.state === "withered") && <button className="btn-primary mt-5 w-full" disabled={Boolean(busy)} onClick={() => action("/api/farm/harvest", { plotId: selected.id }, "收获成功")}>🧺 收获并自动售卖</button>}
            </div>}
        </div>
      </div>}
      <Nav />
    </main>
  );
}

function CropChoices({ plotId, action, busy, fallback }: { plotId: string; action: (path: string, body: object, success: string) => void; busy: string; fallback: Crop[] }) {
  const [crops, setCrops] = useState<Crop[]>(fallback);
  useEffect(() => { fetch("/api/shop").then((r) => r.json()).then((d) => d.crops && setCrops(d.crops)); }, []);
  return <div className="grid grid-cols-2 gap-3">{crops.map((crop) => <button key={crop.key} disabled={Boolean(busy)} onClick={() => action("/api/farm/plant", { plotId, cropKey: crop.key }, `种下了${crop.name}`)} className="rounded-2xl border border-green-100 bg-green-50 p-3 text-left transition hover:border-leaf"><span className="text-3xl">{crop.emoji}</span><span className="ml-2 font-black">{crop.name}</span><p className="mt-1 text-xs text-slate-500">{crop.rarity} · 🪙 {crop.seedPrice}</p></button>)}</div>;
}
