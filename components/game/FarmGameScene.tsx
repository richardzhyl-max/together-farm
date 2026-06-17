"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { loveBondFor } from "@/lib/love-bond";
import {
  FARM_VISUAL_ASSETS,
  FARM_VISUAL_CONFIG,
  FARM_VISUAL_LAYOUT,
  PET_ANIMATION_CONFIGS,
  farmPlotRect,
  type CropVisualStage,
  type PetAnimationConfig,
  type VisualAsset,
  visualRectStyle,
} from "@/lib/visual-layout";

export type FarmSceneCrop = {
  key: string;
  name: string;
  rarity: string;
  seedPrice: number;
};

export type FarmScenePlot = {
  id: string;
  index: number;
  state: "empty" | "growing" | "mature" | "withered";
  crop: FarmSceneCrop | null;
  plantedAt: string | null;
  matureAt: string | null;
  growDurationSeconds: number | null;
  waterBoostSeconds: number;
};

export type FarmScenePet = {
  key: string;
  name: string;
};

export type FarmSceneDailyWish = {
  cropKey: string;
  cropName: string;
  required: number;
  readyCount: number;
  coinReward: number;
  loveReward: number;
  completed: boolean;
};

type Props = {
  farm: {
    name: string;
    inviteCode: string;
    coins: number;
    lovePoints: number;
    activePetKey: string | null;
    members: { username: string }[];
    plots: FarmScenePlot[];
    pets: FarmScenePet[];
    dailyWish: FarmSceneDailyWish | null;
  };
  selectedPlotId: string | null;
  notice: string;
  error: string;
  stageForPlot: (plot: FarmScenePlot) => CropVisualStage;
  onSelectPlot: (plot: FarmScenePlot) => void;
  onCopyInvite: () => void;
  onHarvestAll: () => void;
  harvestAllBusy: boolean;
  onCompleteDailyWish: () => void;
  dailyWishBusy: boolean;
  onChoosePet: (key: string) => void;
  petSwitchBusy: boolean;
  onLogout: () => void;
  onDismissMessage: () => void;
  dialog: ReactNode;
};

export default function FarmGameScene({
  farm,
  selectedPlotId,
  notice,
  error,
  stageForPlot,
  onSelectPlot,
  onCopyInvite,
  onHarvestAll,
  harvestAllBusy,
  onCompleteDailyWish,
  dailyWishBusy,
  onChoosePet,
  petSwitchBusy,
  onLogout,
  onDismissMessage,
  dialog,
}: Props) {
  const matureCount = farm.plots.filter((plot) => plot.state === "mature").length;
  const loveBond = loveBondFor(farm.lovePoints);
  const [petSwitcherOpen, setPetSwitcherOpen] = useState(false);

  return (
    <main className="farm-visual-page">
      <div className="farm-game-scene">
        <BackgroundLayer />

        <section className="farm-layer farm-land-layer" aria-label="土地与作物层">
          {farm.plots.map((plot, index) => {
            const rect = farmPlotRect(index, farm.plots.length);
            const plotAsset = FARM_VISUAL_ASSETS.plots.empty;
            const isSelected = selectedPlotId === plot.id;
            const cropAsset = plot.crop
              ? FARM_VISUAL_ASSETS.crops[
                  plot.crop.key as keyof typeof FARM_VISUAL_ASSETS.crops
                ]?.[stageForPlot(plot)]
              : null;

            return (
              <button
                key={plot.id}
                className={`farm-visual-plot state-${plot.state} ${isSelected ? "selected" : ""}`}
                style={visualRectStyle(rect)}
                onClick={() => onSelectPlot(plot)}
                aria-label={`${plot.crop?.name || "空地"} ${plot.state}`}
              >
                <SceneAsset asset={plotAsset} label={`${plot.index + 1}号土地`} fill />
                {!FARM_VISUAL_CONFIG.usePlotStateImageOnly && cropAsset && (
                  <span className="farm-crop-visual">
                    <SceneAsset asset={cropAsset} label={`${plot.crop?.name}素材`} fill />
                  </span>
                )}
                {isSelected && (
                  <span className="farm-plot-selected-layer" aria-hidden="true">
                    <SceneAsset
                      asset={FARM_VISUAL_ASSETS.plots.selected}
                      label="土地选中高亮"
                      fill
                    />
                  </span>
                )}
                {plot.state === "mature" && <span className="farm-mature-status">可收获</span>}
              </button>
            );
          })}
        </section>

        <section className="farm-layer farm-pet-layer" aria-label="宠物层">
          {(() => {
            const activePet =
              farm.pets.find((pet) => pet.key === farm.activePetKey) || farm.pets[0];
            if (!activePet) return null;
            const petAsset =
              FARM_VISUAL_ASSETS.pets[
                activePet.key as keyof typeof FARM_VISUAL_ASSETS.pets
              ];
            const animation =
              PET_ANIMATION_CONFIGS[
                activePet.key as keyof typeof PET_ANIMATION_CONFIGS
              ];
            return (
              <div
                className="farm-pet-control"
                style={visualRectStyle(FARM_VISUAL_LAYOUT.petHome)}
              >
                <button
                  className={`farm-visual-pet pet-${activePet.key}`}
                  type="button"
                  onClick={() => setPetSwitcherOpen((open) => !open)}
                  title={`${activePet.name}正在宠物窝门口玩耍，点击切换宠物`}
                  aria-expanded={petSwitcherOpen}
                  aria-label="打开宠物快捷切换"
                >
                  <PetVisual
                    asset={petAsset}
                    animation={animation}
                    label={`${activePet.name}素材`}
                  />
                </button>
                {petSwitcherOpen && (
                  <PetSwitchPopover
                    pets={farm.pets}
                    activePetKey={activePet.key}
                    busy={petSwitchBusy}
                    onChoose={(key) => {
                      onChoosePet(key);
                      setPetSwitcherOpen(false);
                    }}
                  />
                )}
              </div>
            );
          })()}
        </section>

        <section className="farm-layer farm-hud-layer" aria-label="游戏状态栏">
          <HudValue
            asset={FARM_VISUAL_ASSETS.hud.coinBar}
            rect={FARM_VISUAL_LAYOUT.hud.coins}
            label="金币"
            value={farm.coins}
            className="farm-coin-hud"
          />
          <HudValue
            asset={FARM_VISUAL_ASSETS.hud.loveBar}
            rect={FARM_VISUAL_LAYOUT.hud.love}
            label="情侣值"
            value={
              loveBond.next
                ? `${farm.lovePoints} / ${loveBond.next.requiredLovePoints}`
                : `${farm.lovePoints} 满级`
            }
            className="farm-love-hud"
          />
          <LoveBondHud bond={loveBond} />
          {farm.dailyWish && (
            <DailyWishHud
              wish={farm.dailyWish}
              busy={dailyWishBusy}
              onComplete={onCompleteDailyWish}
            />
          )}
          <div
            className="farm-hud-control farm-name-control"
            style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.farmSign)}
          >
            <SceneAsset asset={FARM_VISUAL_ASSETS.hud.farmSign} label="农场名牌素材" fill />
            <span>
              <b>{farm.name}</b>
              <small>{farm.members.map((member) => member.username).join(" & ")}</small>
            </span>
          </div>
          <button
            className="farm-hud-control farm-invite-control"
            style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.invite)}
            onClick={onCopyInvite}
            aria-label="复制邀请码"
          >
            <SceneAsset
              asset={FARM_VISUAL_ASSETS.hud.inviteButton}
              label="邀请码按钮素材"
              fill
            />
          </button>
          {matureCount > 0 && (
            <button
              className="farm-hud-control farm-harvest-all-control"
              style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.harvestAll)}
              onClick={onHarvestAll}
              disabled={harvestAllBusy}
              aria-label={`一键收获，${matureCount} 块成熟土地`}
            >
              <span className="farm-harvest-all-icon">
                <SceneAsset
                  asset={FARM_VISUAL_ASSETS.dialog.harvestButton}
                  label="一键收获按钮素材"
                  fill
                />
              </span>
              <span className="farm-harvest-all-label">
                {harvestAllBusy ? "收获中" : "一键收获"}
              </span>
              <span className="farm-harvest-all-count">{matureCount}</span>
            </button>
          )}
          <Link
            className="farm-hud-control farm-nav-control"
            style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.shop)}
            href="/shop"
          >
            <SceneAsset asset={FARM_VISUAL_ASSETS.hud.shopButton} label="商城按钮素材" fill />
            <span>商城</span>
          </Link>
          <Link
            className="farm-hud-control farm-nav-control"
            style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.messages)}
            href="/messages"
          >
            <SceneAsset
              asset={FARM_VISUAL_ASSETS.hud.messagesButton}
              label="留言按钮素材"
              fill
            />
            <span>留言</span>
          </Link>
          <button
            className="farm-hud-control farm-logout-control"
            style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.logout)}
            onClick={onLogout}
            aria-label="退出登录"
          >
            <SceneAsset asset={FARM_VISUAL_ASSETS.hud.logoutButton} label="退出按钮素材" fill />
            <span>退出</span>
          </button>
        </section>

        <section className="farm-layer farm-modal-layer" aria-label="弹窗层">
          {(notice || error) && (
            <button className={`farm-scene-message ${error ? "error" : ""}`} onClick={onDismissMessage}>
              {error || notice}
            </button>
          )}
          {dialog}
        </section>
      </div>
    </main>
  );
}

function DailyWishHud({
  wish,
  busy,
  onComplete,
}: {
  wish: FarmSceneDailyWish;
  busy: boolean;
  onComplete: () => void;
}) {
  const ready = wish.readyCount >= wish.required;
  const cropAsset =
    FARM_VISUAL_ASSETS.crops[
      wish.cropKey as keyof typeof FARM_VISUAL_ASSETS.crops
    ]?.mature;

  return (
    <div
      className={`farm-daily-wish ${wish.completed ? "completed" : ""}`}
      style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.dailyWish)}
      aria-label={`今日心愿：${wish.cropName} ${Math.min(wish.readyCount, wish.required)} / ${wish.required}`}
    >
      <div className="farm-daily-wish-crop">
        <SceneAsset asset={cropAsset} label={`${wish.cropName}成熟作物`} fill />
      </div>
      <div className="farm-daily-wish-copy">
        <b>今日心愿</b>
        <span>{wish.cropName} {Math.min(wish.readyCount, wish.required)} / {wish.required}</span>
        <small>+{wish.coinReward} 金币 · +{wish.loveReward} 情侣值</small>
      </div>
      <button
        type="button"
        disabled={busy || wish.completed || !ready}
        onClick={onComplete}
      >
        {wish.completed ? "已完成" : ready ? "提交" : "准备中"}
      </button>
    </div>
  );
}

function PetSwitchPopover({
  pets,
  activePetKey,
  busy,
  onChoose,
}: {
  pets: FarmScenePet[];
  activePetKey: string;
  busy: boolean;
  onChoose: (key: string) => void;
}) {
  return (
    <div className="farm-pet-switch-popover" aria-label="快捷切换宠物">
      <div className="farm-pet-switch-scroll">
        {pets.map((pet) => {
          const asset =
            FARM_VISUAL_ASSETS.pets[
              pet.key as keyof typeof FARM_VISUAL_ASSETS.pets
            ];
          const active = pet.key === activePetKey;
          return (
            <button
              key={pet.key}
              className={`farm-pet-switch-item ${active ? "active" : ""}`}
              type="button"
              disabled={busy || active}
              onClick={() => onChoose(pet.key)}
              aria-label={`${active ? "当前出场：" : "切换到"}${pet.name}`}
              title={pet.name}
            >
              <span>
                <SceneAsset asset={asset} label={pet.name} fill />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PetVisual({
  asset,
  animation,
  label,
}: {
  asset: VisualAsset | undefined;
  animation?: PetAnimationConfig;
  label: string;
}) {
  const [spriteStatus, setSpriteStatus] = useState<
    "loading" | "ready" | "failed"
  >(animation ? "loading" : "failed");
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animation) {
      setSpriteStatus("failed");
      return;
    }

    let active = true;
    const sprite = new window.Image();
    sprite.onload = () => {
      if (active) setSpriteStatus("ready");
    };
    sprite.onerror = () => {
      if (active) setSpriteStatus("failed");
    };
    sprite.src = animation.spriteSheet;

    return () => {
      active = false;
    };
  }, [animation]);

  useEffect(() => {
    if (!animation || spriteStatus !== "ready") return;
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % animation.frameCount);
    }, animation.frameDuration);
    return () => window.clearInterval(timer);
  }, [animation, spriteStatus]);

  if (!animation || spriteStatus !== "ready") {
    return (
      <span className="farm-pet-breath">
        <SceneAsset asset={asset} label={label} fill />
      </span>
    );
  }

  const column = frame % animation.cols;
  const row = Math.floor(frame / animation.cols) % animation.rows;
  const x = animation.cols > 1 ? (column / (animation.cols - 1)) * 100 : 0;
  const y = animation.rows > 1 ? (row / (animation.rows - 1)) * 100 : 0;
  const style = {
    "--pet-sprite-image": `url("${animation.spriteSheet}")`,
    "--pet-sprite-cols": animation.cols,
    "--pet-sprite-rows": animation.rows,
    "--pet-sprite-x": `${x}%`,
    "--pet-sprite-y": `${y}%`,
  } as CSSProperties;

  return (
    <span className="farm-pet-breath has-sprite">
      <span className="farm-pet-sprite" style={style} aria-hidden="true" />
    </span>
  );
}

function LoveBondHud({
  bond,
}: {
  bond: ReturnType<typeof loveBondFor>;
}) {
  const nextLabel = bond.next
    ? `距 Lv${bond.next.level} ${bond.next.name} 还差 ${bond.pointsToNextLevel}`
    : "最高羁绊 · 永远相伴";

  return (
    <div
      className="farm-love-bond"
      style={visualRectStyle(FARM_VISUAL_LAYOUT.hud.loveBond)}
      aria-label={`情侣羁绊 Lv${bond.level} ${bond.name}，${nextLabel}`}
      title={nextLabel}
    >
      <SceneAsset
        asset={FARM_VISUAL_ASSETS.hud.loveBondSign}
        label="情侣羁绊等级牌素材"
        fill
      />
      <strong>Lv{bond.level} {bond.name}</strong>
    </div>
  );
}

function BackgroundLayer() {
  const background = FARM_VISUAL_ASSETS.background;
  return (
    <section className="farm-layer farm-background-layer" aria-label="背景层">
      {background.available ? (
        <Image
          src={background.src}
          alt="情侣共同农场"
          fill
          priority
          sizes="(max-width: 640px) 100vw, 860px"
        />
      ) : (
        <div className="farm-background-required">
          <b>等待正式农场背景</b>
          <code>{background.src}</code>
          <p>{background.description}</p>
          <small>TODO: 放入合格素材后，将 lib/visual-layout.ts 中 available 改为 true。</small>
        </div>
      )}
      {background.available && (
        <div className="farm-scene-motion" aria-hidden="true">
          <span className="farm-tree-canopy" />
          <span className="farm-flora farm-flora-house" />
          <span className="farm-flora farm-flora-wheel" />
          <span className="farm-flora farm-flora-bottom-left" />
          <span className="farm-flora farm-flora-bottom-right" />
          <span className="farm-waterwheel-flow" />
          <span className="farm-pond-ripple farm-pond-ripple-bridge" />
          <span className="farm-pond-ripple farm-pond-ripple-duck" />
          <span className="farm-chimney-smoke farm-chimney-smoke-one" />
          <span className="farm-chimney-smoke farm-chimney-smoke-two" />
          <span className="farm-chimney-smoke farm-chimney-smoke-three" />
        </div>
      )}
    </section>
  );
}

function HudValue({
  asset,
  rect,
  label,
  value,
  className,
}: {
  asset: VisualAsset;
  rect: Parameters<typeof visualRectStyle>[0];
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`farm-hud-control ${className || ""}`} style={visualRectStyle(rect)}>
      <SceneAsset asset={asset} label={`${label}素材`} fill />
      <span>
        {label} {value}
      </span>
    </div>
  );
}

export function SceneAsset({
  asset,
  label,
  fill = false,
}: {
  asset: VisualAsset | undefined;
  label: string;
  fill?: boolean;
}) {
  if (!asset) {
    return <span className="farm-asset-missing">TODO: 未配置 {label}</span>;
  }
  if (!asset.available) {
    return (
      <span className="farm-asset-missing" title={asset.description}>
        TODO
        <code>{asset.src.split("/").at(-1)}</code>
      </span>
    );
  }
  return fill ? (
    <Image src={asset.src} alt="" fill sizes="220px" />
  ) : (
    <Image src={asset.src} alt="" width={180} height={180} />
  );
}
