"use client";

import { useEffect, useState } from "react";
import {
  FARM_VISUAL_ASSETS,
  FARM_VISUAL_LAYOUT,
  type CropVisualStage,
  visualRectStyle,
} from "@/lib/visual-layout";
import { SceneAsset, type FarmSceneCrop, type FarmScenePlot } from "./FarmGameScene";

type Action = (path: string, body: object, success: string) => void;

export default function FarmPlotDialog({
  plot,
  stage,
  remaining,
  busy,
  action,
  onClose,
}: {
  plot: FarmScenePlot;
  stage: CropVisualStage;
  remaining: string;
  busy: string;
  action: Action;
  onClose: () => void;
}) {
  return (
    <div className="farm-dialog-backdrop" onClick={onClose}>
      <div
        className="farm-plot-dialog"
        style={visualRectStyle(FARM_VISUAL_LAYOUT.dialog.panel)}
        onClick={(event) => event.stopPropagation()}
      >
        <SceneAsset
          asset={FARM_VISUAL_ASSETS.dialog.panel}
          label="土地操作面板素材"
          fill
        />
        <button className="farm-dialog-close" onClick={onClose}>
          <SceneAsset
            asset={FARM_VISUAL_ASSETS.dialog.closeButton}
            label="关闭按钮素材"
            fill
          />
          <span>关闭</span>
        </button>
        <h2>{plot.state === "empty" ? "选择种子" : plot.crop?.name}</h2>
        {plot.state === "empty" ? (
          <SeedOptions plotId={plot.id} busy={busy} action={action} />
        ) : (
          <div className="farm-dialog-content">
            {plot.crop && (
              <div className="farm-dialog-crop">
                <SceneAsset
                  asset={
                    FARM_VISUAL_ASSETS.crops[
                      plot.crop.key as keyof typeof FARM_VISUAL_ASSETS.crops
                    ]?.[stage]
                  }
                  label={`${plot.crop.name} ${stage}`}
                  fill
                />
              </div>
            )}
            {plot.state === "growing" && (
              <>
                <p>距离成熟 {remaining}</p>
                <ActionButton
                  asset={FARM_VISUAL_ASSETS.dialog.waterButton}
                  label="浇水加速"
                  disabled={Boolean(busy)}
                  onClick={() => action("/api/farm/water", { plotId: plot.id }, "浇水成功，情侣值 +1")}
                />
              </>
            )}
            {plot.state === "mature" && (
              <ActionButton
                asset={FARM_VISUAL_ASSETS.dialog.harvestButton}
                label="收获作物"
                disabled={Boolean(busy)}
                onClick={() => action("/api/farm/harvest", { plotId: plot.id }, "收获成功")}
              />
            )}
            {plot.state === "withered" && (
              <>
                <p>作物已经枯萎，只能半价卖出</p>
                <ActionButton
                  asset={FARM_VISUAL_ASSETS.dialog.clearButton}
                  label="清理土地"
                  disabled={Boolean(busy)}
                  onClick={() => action("/api/farm/harvest", { plotId: plot.id }, "清理成功")}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SeedOptions({
  plotId,
  busy,
  action,
}: {
  plotId: string;
  busy: string;
  action: Action;
}) {
  const [crops, setCrops] = useState<FarmSceneCrop[]>([]);

  useEffect(() => {
    fetch("/api/shop")
      .then((response) => response.json())
      .then((data) => data.crops && setCrops(data.crops));
  }, []);

  return (
    <div className="farm-seed-options">
      {crops.map((crop) => (
        <button
          key={crop.key}
          disabled={Boolean(busy)}
          onClick={() =>
            action("/api/farm/plant", { plotId, cropKey: crop.key }, `种下了${crop.name}`)
          }
        >
          <SceneAsset asset={FARM_VISUAL_ASSETS.dialog.seedCard} label="种子卡片素材" fill />
          <span className="farm-seed-bag">
            <SceneAsset
              asset={
                FARM_VISUAL_ASSETS.seedBags[
                  crop.key as keyof typeof FARM_VISUAL_ASSETS.seedBags
                ]
              }
              label={`${crop.name}种子袋`}
              fill
            />
          </span>
          <span>{crop.name}</span>
          <small>{crop.seedPrice} 金币</small>
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  asset,
  label,
  disabled,
  onClick,
}: {
  asset: (typeof FARM_VISUAL_ASSETS.dialog)[keyof typeof FARM_VISUAL_ASSETS.dialog];
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button className="farm-dialog-action" disabled={disabled} onClick={onClick}>
      <SceneAsset asset={asset} label={`${label}素材`} fill />
      <span>{label}</span>
    </button>
  );
}
