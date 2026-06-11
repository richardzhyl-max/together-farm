"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import Nav from "@/components/Nav";

type Crop = {
  key: string;
  name: string;
  emoji: string;
  rarity: string;
  seedPrice: number;
};

type Plot = {
  id: string;
  index: number;
  state: "empty" | "growing" | "mature" | "withered";
  crop: Crop | null;
  plantedAt: string | null;
  matureAt: string | null;
  witherAt: string | null;
  growDurationSeconds: number | null;
  waterBoostSeconds: number;
};

type Farm = {
  id: string;
  name: string;
  inviteCode: string;
  coins: number;
  lovePoints: number;
  plotCount: number;
  members: { id: string; username: string }[];
  plots: Plot[];
  pets: { key: string; name: string; emoji: string; description: string }[];
  decorations: { key: string; name: string; emoji: string; quantity: number }[];
  bonuses: { sell: number; grow: number; cooldown: number };
  expansion: { to: number; price: number } | null;
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

function cropStage(plot: Plot, now: number) {
  if (plot.state === "mature") return "crop-stage-ready";
  if (plot.state !== "growing" || !plot.plantedAt || !plot.growDurationSeconds) return "";
  const elapsed = Math.max(0, now - new Date(plot.plantedAt).getTime());
  const progress = elapsed / (plot.growDurationSeconds * 1000);
  return progress < 0.34 ? "crop-stage-young" : progress < 0.72 ? "crop-stage-mid" : "";
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

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!farm?.id) return;
    const socket = io({ path: "/socket.io" });
    socket.emit("farm:join", farm.id);
    socket.on("farm:update", load);
    socket.on("farm:error", ({ message }) => setError(message));
    return () => {
      socket.disconnect();
    };
  }, [farm?.id, load]);

  useEffect(() => {
    if (!farm) return;
    const stale = farm.plots.some(
      (plot) =>
        plot.state === "growing" &&
        plot.matureAt &&
        new Date(plot.matureAt).getTime() <= now,
    );
    if (stale) load();
  }, [now, farm, load]);

  const crops = useMemo(() => {
    const map = new Map<string, Crop>();
    farm?.plots.forEach((plot) => {
      if (plot.crop) map.set(plot.crop.key, plot.crop);
    });
    return [...map.values()];
  }, [farm]);

  async function action(path: string, body: object, success: string) {
    setBusy(path);
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setNotice(path.includes("harvest") ? `${success}，获得 ${result.earned} 金币` : success);
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2500);
  }

  if (!farm) {
    return (
      <main className="farm-world grid min-h-screen place-items-center text-center">
        <div className="game-panel px-10 py-8">
          <div className="crop-bob text-6xl">🌱</div>
          <p className="mt-4 font-black">{error || "正在走进农场..."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="farm-world min-h-screen pb-28 pt-3">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <header className="hud sticky top-2 z-20 rounded-[26px] p-3 text-white sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-100">🌿 两个人的共同天地</p>
              <h1 className="truncate text-xl font-black drop-shadow sm:text-2xl">{farm.name}</h1>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="hud-pill">🪙 {farm.coins}</span>
              <span className="hud-pill text-rose-700">💛 {farm.lovePoints}</span>
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(farm.inviteCode)
                    .then(() => setNotice("邀请码已复制"))
                }
                className="hud-pill"
              >
                💌 {farm.inviteCode}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-black/10 px-3 py-2 text-xs font-bold text-green-50">
            <span>👩‍🌾 农场伙伴</span>
            {farm.members.map((member) => (
              <span key={member.id} className="rounded-full bg-white/15 px-2 py-1">
                {member.username}
              </span>
            ))}
            {farm.members.length < 2 && (
              <span className="text-yellow-100">等待另一半加入...</span>
            )}
          </div>
        </header>

        {(error || notice) && (
          <button
            className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 font-black text-white shadow-soft ${
              error ? "bg-red-600" : "bg-green-700"
            }`}
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            {error || notice}
          </button>
        )}

        <section className="field-board relative mt-5 overflow-hidden rounded-[34px] p-4 sm:p-7">
          <div className="relative mb-5 flex items-center justify-between gap-3">
            <div className="wood-sign -rotate-1 rounded-2xl px-4 py-2">
              <h2 className="text-lg font-black sm:text-xl">🌱 今日田地</h2>
              <p className="text-[11px] text-amber-50 sm:text-xs">
                点击泥土地进行播种、浇水与收获
              </p>
            </div>
            <span className="hud-pill shrink-0">🧺 {farm.plotCount} 块</span>
          </div>

          <div className="relative grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
            {farm.plots.map((plot) => (
              <button
                key={plot.id}
                onClick={() => setSelected(plot)}
                className="plot aspect-[1.2] p-2 text-white transition focus:outline-none focus:ring-4 focus:ring-yellow-200"
              >
                <span className="absolute left-2 top-2 z-10 rounded-full bg-[#5d301c]/65 px-2 py-0.5 text-[10px] font-black text-amber-100">
                  #{plot.index + 1}
                </span>
                <div className="grid h-full place-items-center">
                  {plot.state === "empty" ? (
                    <div className="relative z-10">
                      <div className="text-3xl drop-shadow">🌰</div>
                      <div className="mt-1 rounded-full bg-[#5d301c]/45 px-3 py-1 text-xs font-black">
                        播种
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10">
                      <div
                        className={`text-5xl drop-shadow-lg sm:text-6xl ${
                          plot.state === "growing" ? "crop-bob" : ""
                        } ${cropStage(plot, now)}`}
                      >
                        {plot.state === "withered" ? "🥀" : plot.crop?.emoji}
                      </div>
                      <div className="mt-1 text-sm font-black drop-shadow">{plot.crop?.name}</div>
                      <div
                        className={`mt-1 rounded-full px-2 py-1 text-[10px] font-black ${
                          plot.state === "mature"
                            ? "bg-yellow-300 text-amber-900"
                            : plot.state === "withered"
                              ? "bg-stone-700/70"
                              : "bg-black/30"
                        }`}
                      >
                        {plot.state === "growing"
                          ? formatRemaining(plot.matureAt, now)
                          : plot.state === "mature"
                            ? "✨ 可以收获啦"
                            : "已枯萎 · 半价"}
                      </div>
                    </div>
                  )}
                </div>
                {plot.waterBoostSeconds > 0 && (
                  <span className="absolute right-2 top-2 z-10 rounded-full bg-sky-100 px-1.5 py-1 text-xs shadow">
                    💧
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <section className="pet-shelf rounded-[30px] p-5">
            <h2 className="text-lg font-black text-amber-950">🐾 宠物小屋</h2>
            <p className="text-xs text-amber-900/70">小伙伴们会悄悄帮忙照顾农场</p>
            <div className="mt-4 flex min-h-28 flex-wrap items-end gap-3">
              {farm.pets.length ? (
                farm.pets.map((pet) => (
                  <div key={pet.key} className="pet-home min-w-24 rounded-[24px] p-3 text-center">
                    <div className="crop-bob text-5xl">{pet.emoji}</div>
                    <p className="mt-1 text-xs font-black text-amber-950">{pet.name}</p>
                    <p className="mt-1 text-[9px] text-amber-900/65">{pet.description}</p>
                  </div>
                ))
              ) : (
                <div className="flex w-full flex-col items-center py-4 text-amber-900/55">
                  <span className="text-5xl">🏠</span>
                  <p className="mt-2 text-sm font-bold">去商城接一只小伙伴回家吧</p>
                </div>
              )}
            </div>
          </section>

          <section className="game-panel p-5">
            <h2 className="text-lg font-black">🎀 农场风景</h2>
            <p className="text-xs text-green-900/60">每一件装饰都记录着共同经营的时光</p>
            <div className="mt-4 flex min-h-28 flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-b from-sky-100 to-green-100 p-4">
              {farm.decorations.length ? (
                farm.decorations.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-2xl border-2 border-white bg-white/70 p-3 text-center shadow-sm"
                  >
                    <div className="text-4xl drop-shadow">{item.emoji}</div>
                    <p className="text-xs font-black">
                      {item.name} ×{item.quantity}
                    </p>
                  </div>
                ))
              ) : (
                <div className="w-full text-center text-green-900/45">
                  <div className="text-5xl">🌳</div>
                  <p className="mt-2 text-sm font-bold">添一点属于你们的风景</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {selected && (
          <div
            className="fixed inset-0 z-40 grid place-items-end bg-black/30 p-3 backdrop-blur-sm sm:place-items-center"
            onClick={() => setSelected(null)}
          >
            <div className="game-panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">第 {selected.index + 1} 块土地</h3>
                <button className="text-2xl text-slate-400" onClick={() => setSelected(null)}>
                  ×
                </button>
              </div>
              {selected.state === "empty" ? (
                <div className="mt-4">
                  <p className="mb-3 text-sm text-slate-500">
                    选择要种下的作物，种子费用会从共同钱包扣除。
                  </p>
                  <CropChoices plotId={selected.id} action={action} busy={busy} fallback={crops} />
                </div>
              ) : (
                <div className="mt-5 text-center">
                  <div className="text-7xl">
                    {selected.state === "withered" ? "🥀" : selected.crop?.emoji}
                  </div>
                  <h4 className="mt-2 text-xl font-black">{selected.crop?.name}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {selected.state === "growing"
                      ? `距离成熟 ${formatRemaining(selected.matureAt, now)}`
                      : selected.state === "mature"
                        ? "成熟啦，快把丰收装进口袋"
                        : "虽然错过了最佳时间，仍可半价卖出"}
                  </p>
                  {selected.state === "growing" && (
                    <button
                      className="btn-primary mt-5 w-full"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        action(
                          "/api/farm/water",
                          { plotId: selected.id },
                          "浇水成功，情侣值 +1",
                        )
                      }
                    >
                      💧 浇水加速 5%
                    </button>
                  )}
                  {(selected.state === "mature" || selected.state === "withered") && (
                    <button
                      className="btn-primary mt-5 w-full"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        action("/api/farm/harvest", { plotId: selected.id }, "收获成功")
                      }
                    >
                      🧺 收获并自动售卖
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Nav />
    </main>
  );
}

function CropChoices({
  plotId,
  action,
  busy,
  fallback,
}: {
  plotId: string;
  action: (path: string, body: object, success: string) => void;
  busy: string;
  fallback: Crop[];
}) {
  const [crops, setCrops] = useState<Crop[]>(fallback);

  useEffect(() => {
    fetch("/api/shop")
      .then((response) => response.json())
      .then((data) => data.crops && setCrops(data.crops));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3">
      {crops.map((crop) => (
        <button
          key={crop.key}
          disabled={Boolean(busy)}
          onClick={() =>
            action(
              "/api/farm/plant",
              { plotId, cropKey: crop.key },
              `种下了${crop.name}`,
            )
          }
          className="shop-card rounded-2xl bg-gradient-to-b from-green-50 to-lime-100 p-3 text-left"
        >
          <span className="text-4xl drop-shadow">{crop.emoji}</span>
          <span className="ml-2 font-black">{crop.name}</span>
          <p className="mt-1 text-xs text-green-900/60">
            {crop.rarity} · 🪙 {crop.seedPrice}
          </p>
        </button>
      ))}
    </div>
  );
}
