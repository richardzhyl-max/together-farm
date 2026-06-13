"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  FARM_VISUAL_ASSETS,
  FARM_VISUAL_LAYOUT,
  farmPlotRect,
  type CropVisualStage,
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
  };
  selectedPlotId: string | null;
  notice: string;
  error: string;
  stageForPlot: (plot: FarmScenePlot) => CropVisualStage;
  onSelectPlot: (plot: FarmScenePlot) => void;
  onCopyInvite: () => void;
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
  onLogout,
  onDismissMessage,
  dialog,
}: Props) {
  return (
    <main className="farm-visual-page">
      <div className="farm-game-scene">
        <BackgroundLayer />

        <section className="farm-layer farm-land-layer" aria-label="土地与作物层">
          {farm.plots.map((plot, index) => {
            const rect = farmPlotRect(index, farm.plots.length);
            // Keep every plot on the exact same base silhouette. State
            // differences are visual overlays so the perspective never jumps.
            const plotAsset = FARM_VISUAL_ASSETS.plots.empty;
            const cropAsset = plot.crop
              ? FARM_VISUAL_ASSETS.crops[
                  plot.crop.key as keyof typeof FARM_VISUAL_ASSETS.crops
                ]?.[stageForPlot(plot)]
              : null;

            return (
              <button
                key={plot.id}
                className={`farm-visual-plot state-${plot.state} ${
                  selectedPlotId === plot.id ? "selected" : ""
                }`}
                style={visualRectStyle(rect)}
                onClick={() => onSelectPlot(plot)}
                aria-label={`${plot.crop?.name || "空地"} ${plot.state}`}
              >
                <SceneAsset asset={plotAsset} label={`${plot.index + 1}号土地`} fill />
                {cropAsset && (
                  <span className="farm-crop-visual">
                    <SceneAsset asset={cropAsset} label={`${plot.crop?.name}素材`} fill />
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
            return (
              <div
                className={`farm-visual-pet pet-${activePet.key}`}
                style={visualRectStyle(FARM_VISUAL_LAYOUT.petHome)}
                title={`${activePet.name}正在宠物窝门口玩耍`}
              >
                <SceneAsset asset={petAsset} label={`${activePet.name}素材`} fill />
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
            value={farm.lovePoints}
            className="farm-love-hud"
          />
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
          >
            <SceneAsset
              asset={FARM_VISUAL_ASSETS.hud.inviteButton}
              label="邀请码按钮素材"
              fill
            />
            <span>{farm.inviteCode}</span>
          </button>
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
  value: number;
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
