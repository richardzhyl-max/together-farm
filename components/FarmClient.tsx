"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import FarmGameScene, {
  type FarmScenePlot,
} from "@/components/game/FarmGameScene";
import FarmPlotDialog from "@/components/game/FarmPlotDialog";
import type { CropVariantType } from "@/lib/crop-variants";
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

type HarvestCelebration = {
  token: number;
  variantType: Exclude<CropVariantType, "normal">;
  cropKey?: string;
  earned: number;
  firstDiscovery: boolean;
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
  const [plantDragRequest, setPlantDragRequest] = useState<{ crop: Crop; plotId: string; token: number } | null>(null);
  const [waterDragRequest, setWaterDragRequest] = useState<{ plotId: string; token: number } | null>(null);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(Date.now());
  const [harvestCelebration, setHarvestCelebration] = useState<HarvestCelebration | null>(null);

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
    if (path.includes("harvest") && (result.variantType === "golden" || result.variantType === "rainbow")) {
      setHarvestCelebration({
        token: Date.now(),
        variantType: result.variantType,
        earned: result.earned,
        firstDiscovery: Boolean(result.firstVariantDiscovery),
      });
    }
    setNotice(path.includes("harvest") ? `${success}，获得 ${result.earned} 金币` : success);
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2400);
  }

  async function plantMany(crop: Crop, plotIds: string[]) {
    const uniquePlotIds = [...new Set(plotIds)];
    if (!uniquePlotIds.length || busy) return false;
    const path = "/api/farm/plant-many";
    setBusy(`${path}:${crop.key}`);
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plotIds: uniquePlotIds, cropKey: crop.key }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(result.error);
      return false;
    }
    setNotice(
      result.planted > 0
        ? `种下 ${result.planted} 颗${crop.name}，花费 ${result.spent} 金币`
        : "这些土地暂时不能种植",
    );
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2400);
    return result.planted > 0;
  }

  async function waterMany(plotIds: string[]) {
    const uniquePlotIds = [...new Set(plotIds)];
    if (!uniquePlotIds.length || busy) return;
    const path = "/api/farm/water-many";
    setBusy(path);
    setError("");
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plotIds: uniquePlotIds }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    const bestVariant = [...(result.variants || [])]
      .filter((variant) => variant.variantType === "golden" || variant.variantType === "rainbow")
      .sort((left, right) => (right.variantType === "rainbow" ? 2 : 1) - (left.variantType === "rainbow" ? 2 : 1))[0];
    if (bestVariant) {
      setHarvestCelebration({
        token: Date.now(),
        variantType: bestVariant.variantType,
        cropKey: bestVariant.cropKey,
        earned: bestVariant.earned,
        firstDiscovery: Boolean(bestVariant.firstVariantDiscovery || result.firstVariantDiscoveries),
      });
    }
    setNotice(
      result.watered > 0
        ? `浇水 ${result.watered} 块土地，情侣值 +${result.watered}`
        : "这些作物暂时不能浇水",
    );
    setSelected(null);
    await load();
    setTimeout(() => setNotice(""), 2400);
  }

  function startPlantDrag(crop: Crop, plotId: string) {
    flushSync(() => {
      setSelected(null);
    });
    setPlantDragRequest({ crop, plotId, token: Date.now() });
  }

  function startWaterDrag(plotId: string) {
    setSelected(null);
    setWaterDragRequest({ plotId, token: Date.now() });
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

  async function clearWithered() {
    const path = "/api/farm/clear-withered";
    setBusy(path);
    setError("");
    const response = await fetch(path, { method: "POST" });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setError(result.error);
    setNotice(
      result.cleared > 0
        ? `一键清理 ${result.cleared} 块枯萎土地，获得 ${result.earned} 金币`
        : "暂时没有枯萎植物",
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
      plantDragRequest={plantDragRequest}
      plantingBusy={busy.startsWith("/api/farm/plant-many")}
      onPlantPlots={(crop, plotIds) => plantMany(crop as Crop, plotIds)}
      waterDragRequest={waterDragRequest}
      wateringBusy={busy === "/api/farm/water-many"}
      onWaterPlots={waterMany}
      onCopyInvite={() =>
        navigator.clipboard.writeText(farm.inviteCode).then(() => setNotice("邀请码已复制"))
      }
      onHarvestAll={harvestAll}
      harvestAllBusy={busy === "/api/farm/harvest-all"}
      onClearWithered={clearWithered}
      clearWitheredBusy={busy === "/api/farm/clear-withered"}
      onChoosePet={choosePet}
      petSwitchBusy={busy.startsWith("/api/farm/pet/active")}
      onLogout={logout}
      onDismissMessage={() => {
        setError("");
        setNotice("");
      }}
      harvestCelebration={harvestCelebration}
      dialog={
        selected ? (
          <FarmPlotDialog
            plot={selected}
            stage={stageFor(selected, now)}
            remaining={formatRemaining(selected.matureAt, now)}
            busy={busy}
            action={action}
            onStartPlantDrag={startPlantDrag}
            onStartWaterDrag={startWaterDrag}
            onClose={() => setSelected(null)}
          />
        ) : null
      }
    />
  );
}
