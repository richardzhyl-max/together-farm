"use client";

import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  BasketIcon,
  CoinIcon,
  CropArt,
  DecorationArt,
  EnvelopeIcon,
  FarmHouse,
  FenceArt,
  HeartIcon,
  PetArt,
  SeedBagArt,
  TreeArt,
  WateringCan,
} from "@/components/GameAssets";
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

function stageFor(plot: Plot, now: number): "young" | "mid" | "mature" | "withered" {
  if (plot.state === "withered") return "withered";
  if (plot.state === "mature") return "mature";
  if (!plot.plantedAt || !plot.growDurationSeconds) return "young";
  const progress =
    Math.max(0, now - new Date(plot.plantedAt).getTime()) /
    (plot.growDurationSeconds * 1000);
  return progress < 0.36 ? "young" : progress < 0.76 ? "mid" : "mature";
}

function fieldColumns(count: number) {
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  if (count <= 16) return 4;
  return 5;
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

  if (!farm) {
    return (
      <main className="pixel-game-page">
        <div className="pixel-loading">LOADING FARM...</div>
      </main>
    );
  }

  const columns = fieldColumns(farm.plotCount);

  return (
    <main className="pixel-game-page">
      <div className="pixel-game-canvas farm-scene">
        <div className="pixel-hud">
          <div className="pixel-meter">
            <CoinIcon />
            <b>{farm.coins}</b>
          </div>
          <div className="pixel-meter">
            <HeartIcon />
            <b>{farm.lovePoints}</b>
          </div>
          <button
            className="pixel-invite"
            onClick={() =>
              navigator.clipboard.writeText(farm.inviteCode).then(() => setNotice("邀请码已复制"))
            }
            aria-label={`复制邀请码 ${farm.inviteCode}`}
          >
            <EnvelopeIcon />
            <span>{farm.inviteCode}</span>
          </button>
        </div>

        <div className="pixel-farm-sign">
          <strong>{farm.name}</strong>
          <small>{farm.members.map((member) => member.username).join(" + ")}</small>
        </div>

        <div className="pixel-map">
          <div className="pixel-path main-path" />
          <div className="pixel-pond" />
          <FarmHouse className="pixel-map-house" />
          <TreeArt className="pixel-map-tree tree-a" />
          <TreeArt className="pixel-map-tree tree-b" />
          <TreeArt className="pixel-map-tree tree-c" />
          <FenceArt className="pixel-map-fence fence-a" />
          <FenceArt className="pixel-map-fence fence-b" />

          <div
            className={`pixel-fields cols-${columns}`}
            style={{ "--field-cols": columns } as React.CSSProperties}
          >
            {farm.plots.map((plot) => (
              <button
                key={plot.id}
                className={`pixel-plot ${plot.state}`}
                onClick={() => setSelected(plot)}
                aria-label={`${plot.crop?.name || "空地"} ${plot.state}`}
              >
                <span className="pixel-soil-lines" />
                {plot.crop && (
                  <CropArt
                    cropKey={plot.crop.key}
                    stage={stageFor(plot, now)}
                    className="pixel-map-crop"
                  />
                )}
                {plot.state === "mature" && (
                  <span className="pixel-ready-marker">!</span>
                )}
                {plot.waterBoostSeconds > 0 && (
                  <span className="pixel-water-particles">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pixel-pet-zone">
            {farm.pets.map((pet, index) => (
              <div key={pet.key} className={`pixel-map-pet pet-${index % 4}`} title={pet.name}>
                <PetArt petKey={pet.key} />
                <span>{pet.name}</span>
              </div>
            ))}
          </div>

          <div className="pixel-decoration-zone">
            {farm.decorations.flatMap((decoration) =>
              Array.from({ length: Math.min(decoration.quantity, 3) }, (_, index) => (
                <DecorationArt
                  key={`${decoration.key}-${index}`}
                  decorationKey={decoration.key}
                  className={`pixel-map-decoration decor-${(decoration.key.length + index) % 6}`}
                />
              )),
            )}
          </div>
        </div>

        {(error || notice) && (
          <button
            className={`pixel-toast ${error ? "error" : ""}`}
            onClick={() => {
              setError("");
              setNotice("");
            }}
          >
            {error || notice}
          </button>
        )}

        {selected && (
          <div className="pixel-dialog-layer" onClick={() => setSelected(null)}>
            <div className="pixel-dialog" onClick={(event) => event.stopPropagation()}>
              <button className="pixel-dialog-close" onClick={() => setSelected(null)}>
                X
              </button>
              <h2>{selected.state === "empty" ? "SELECT SEEDS" : selected.crop?.name}</h2>
              {selected.state === "empty" ? (
                <SeedBags plotId={selected.id} busy={busy} action={action} />
              ) : (
                <div className="pixel-plot-actions">
                  <CropArt
                    cropKey={selected.crop?.key}
                    stage={stageFor(selected, now)}
                    className="pixel-dialog-crop"
                  />
                  {selected.state === "growing" && (
                    <>
                      <p>距离成熟 {formatRemaining(selected.matureAt, now)}</p>
                      <button
                        disabled={Boolean(busy)}
                        onClick={() =>
                          action("/api/farm/water", { plotId: selected.id }, "浇水成功，情侣值 +1")
                        }
                      >
                        <WateringCan />
                        浇水加速
                      </button>
                    </>
                  )}
                  {selected.state === "mature" && (
                    <button
                      className="harvest"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        action("/api/farm/harvest", { plotId: selected.id }, "收获成功")
                      }
                    >
                      <BasketIcon />
                      收获作物
                    </button>
                  )}
                  {selected.state === "withered" && (
                    <>
                      <p>作物已经枯萎，只能半价卖出</p>
                      <button
                        disabled={Boolean(busy)}
                        onClick={() =>
                          action("/api/farm/harvest", { plotId: selected.id }, "清理成功")
                        }
                      >
                        <BasketIcon />
                        清理土地
                      </button>
                    </>
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

function SeedBags({
  plotId,
  busy,
  action,
}: {
  plotId: string;
  busy: string;
  action: (path: string, body: object, success: string) => void;
}) {
  const [crops, setCrops] = useState<Crop[]>([]);

  useEffect(() => {
    fetch("/api/shop")
      .then((response) => response.json())
      .then((data) => data.crops && setCrops(data.crops));
  }, []);

  return (
    <div className="pixel-seed-grid">
      {crops.map((crop) => (
        <button
          key={crop.key}
          className="pixel-seed-item"
          disabled={Boolean(busy)}
          onClick={() =>
            action("/api/farm/plant", { plotId, cropKey: crop.key }, `种下了${crop.name}`)
          }
        >
          <SeedBagArt cropKey={crop.key} />
          <b>{crop.name}</b>
          <span>
            <CoinIcon /> {crop.seedPrice}
          </span>
        </button>
      ))}
    </div>
  );
}
