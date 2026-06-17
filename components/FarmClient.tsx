"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import FarmGameScene, {
  type FarmScenePlot,
} from "@/components/game/FarmGameScene";
import FarmPlotDialog from "@/components/game/FarmPlotDialog";
import type { CropVisualStage } from "@/lib/visual-layout";

type Crop = {
  key: string;
  name: string;
  rarity: string;
  seedPrice: number;
};

type Plot = FarmScenePlot & {
  crop: Crop | null;
  witherAt: string | null;
};

type Farm = {
  id: string;
  name: string;
  inviteCode: string;
  coins: number;
  lovePoints: number;
  plotCount: number;
  activePetKey: string | null;
  members: { id: string; username: string }[];
  plots: Plot[];
  pets: { key: string; name: string; description: string }[];
  dailyWish: {
    dateKey: string;
    cropKey: string;
    cropName: string;
    required: number;
    readyCount: number;
    coinReward: number;
    loveReward: number;
    completed: boolean;
  } | null;
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

function stageFor(plot: FarmScenePlot, now: number): CropVisualStage {
  if (plot.state === "withered") return "withered";
  if (plot.state === "mature") return "mature";
  if (!plot.plantedAt || !plot.growDurationSeconds) return "young";
  const progress =
    Math.max(0, now - new Date(plot.plantedAt).getTime()) /
    (plot.growDurationSeconds * 1000);
  return progress < 0.36 ? "young" : progress < 0.76 ? "mid" : "mature";
}

export default function FarmClient() {
  const router = useRouter();
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
    setTimeout(() => setNotice(""), 2400);
  }

  async function harvestAll() {
    const path = "/api/farm/harvest-all";
    setBusy(path);
    setError("");
    const response = await fetch(path, { method: "POST" });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setNotice(
      result.harvested > 0
        ? `一键收获 ${result.harvested} 块土地，获得 ${result.earned} 金币`
        : "暂时没有成熟作物",
    );
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2400);
  }

  async function choosePet(key: string) {
    if (key === farm?.activePetKey) return;
    const path = "/api/farm/pet/active";
    setBusy(`${path}:${key}`);
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setNotice("这只宠物已经到宠物窝门口啦");
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2200);
  }

  async function completeDailyWish() {
    const path = "/api/farm/daily-wish";
    setBusy(path);
    setError("");
    const response = await fetch(path, { method: "POST" });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setNotice(`完成今日心愿，获得 ${result.coinReward} 金币和 ${result.loveReward} 情侣值`);
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2800);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!farm) {
    return (
      <main className="farm-visual-page">
        <div className="farm-loading">正在读取共同农场...</div>
      </main>
    );
  }

  return (
    <FarmGameScene
      farm={farm}
      selectedPlotId={selected?.id || null}
      notice={notice}
      error={error}
      stageForPlot={(plot) => stageFor(plot, now)}
      onSelectPlot={(plot) => setSelected(plot as Plot)}
      onCopyInvite={() =>
        navigator.clipboard.writeText(farm.inviteCode).then(() => setNotice("邀请码已复制"))
      }
      onHarvestAll={harvestAll}
      harvestAllBusy={busy === "/api/farm/harvest-all"}
      onCompleteDailyWish={completeDailyWish}
      dailyWishBusy={busy === "/api/farm/daily-wish"}
      onChoosePet={choosePet}
      petSwitchBusy={busy.startsWith("/api/farm/pet/active")}
      onLogout={logout}
      onDismissMessage={() => {
        setError("");
        setNotice("");
      }}
      dialog={
        selected ? (
          <FarmPlotDialog
            plot={selected}
            stage={stageFor(selected, now)}
            remaining={formatRemaining(selected.matureAt, now)}
            busy={busy}
            action={action}
            onClose={() => setSelected(null)}
          />
        ) : null
      }
    />
  );
}
