export type VisualRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
};

export type VisualAsset = {
  src: string;
  available: boolean;
  description: string;
};

export type PetAnimationConfig = {
  spriteSheet: string;
  rows: number;
  cols: number;
  frameCount: number;
  frameDuration: number;
};

export type CropVisualStage = "young" | "mid" | "mature" | "withered";

const asset = (src: string, description: string, available = false): VisualAsset => ({
  src,
  available,
  description,
});

export const FARM_VISUAL_CONFIG = {
  // Crops are transparent standalone layers rendered over the plot artwork.
  usePlotStateImageOnly: false,
} as const;

export const FARM_VISUAL_ASSETS = {
  background: asset(
    "/assets/game/backgrounds/farm-mobile.webp",
    "完整 Q 版农场背景，860x1520，包含天空、草地、房屋、树木、小路、围栏、池塘和氛围装饰",
    true,
  ),
  plots: {
    empty: asset("/assets/game/plots/plot-empty.webp", "空闲土地", true),
    growing: asset("/assets/game/plots/plot-growing.webp", "生长中土地", true),
    mature: asset("/assets/game/plots/plot-mature.webp", "成熟土地", true),
    withered: asset("/assets/game/plots/plot-withered.webp", "枯萎土地", true),
    selected: asset("/assets/game/plots/plot-selected.webp", "土地选中高亮", true),
  },
  crops: {
    radish: cropAssets("carrot", true),
    bokchoy: cropAssets("bokchoy", true),
    wheat: cropAssets("wheat", true),
    corn: cropAssets("corn", true),
    tomato: cropAssets("tomato", true),
    pumpkin: cropAssets("pumpkin", true),
    strawberry: cropAssets("strawberry", true),
    blueberry: cropAssets("blueberry", true),
    grape: cropAssets("grape", true),
    cotton: cropAssets("cotton", true),
    starflower: cropAssets("starflower", true),
    moonshroom: cropAssets("moonshroom", true),
    heartrose: cropAssets("heartrose", true),
  },
  seedBags: {
    radish: asset("/assets/game/crops/carrot/seed-bag.webp", "萝卜种子袋", true),
    bokchoy: asset("/assets/game/crops/bokchoy/seed-bag.webp", "青菜种子袋", true),
    wheat: asset("/assets/game/crops/wheat/seed-bag.webp", "小麦种子袋", true),
    corn: asset("/assets/game/crops/corn/seed-bag.webp", "玉米种子袋", true),
    tomato: asset("/assets/game/crops/tomato/seed-bag.webp", "番茄种子袋", true),
    pumpkin: asset("/assets/game/crops/pumpkin/seed-bag.webp", "南瓜种子袋", true),
    strawberry: asset("/assets/game/crops/strawberry/seed-bag.webp", "草莓种子袋", true),
    blueberry: asset("/assets/game/crops/blueberry/seed-bag.webp", "蓝莓种子袋", true),
    grape: asset("/assets/game/crops/grape/seed-bag.webp", "葡萄种子袋", true),
    cotton: asset("/assets/game/crops/cotton/seed-bag.webp", "棉花种子袋", true),
    starflower: asset("/assets/game/crops/starflower/seed-bag.webp", "星星花种子袋", true),
    moonshroom: asset("/assets/game/crops/moonshroom/seed-bag.webp", "月光菇种子袋", true),
    heartrose: asset("/assets/game/crops/heartrose/seed-bag.webp", "爱心玫瑰种子袋", true),
  },
  pets: {
    dog: asset("/assets/game/pets/dog-idle.webp", "小狗 Idle 动画或透明静态图", true),
    cat: asset("/assets/game/pets/cat-idle.webp", "小猫 Idle 动画或透明静态图", true),
    rabbit: asset("/assets/game/pets/rabbit-idle.webp", "小兔 Idle 动画或透明静态图", true),
    fairy: asset("/assets/game/pets/fairy-idle.webp", "小精灵 Idle 动画或透明静态图", true),
  },
  hud: {
    coinBar: asset("/assets/game/ui/hud/coin-bar.webp", "金币 HUD 槽", true),
    loveBar: asset("/assets/game/ui/hud/love-bar.webp", "情侣值 HUD 槽", true),
    loveBondSign: asset(
      "/assets/game/ui/hud/love-bond-sign.webp",
      "左下牌匾附属的情侣羁绊等级牌",
      true,
    ),
    farmSign: asset("/assets/game/ui/hud/farm-sign.webp", "农场名牌", true),
    inviteButton: asset("/assets/game/ui/buttons/invite.webp", "邀请码信封按钮", true),
    collectionButton: asset("/assets/game/ui/buttons/collection.webp", "图鉴书本按钮", true),
    shopButton: asset("/assets/game/ui/buttons/shop.webp", "商城按钮", true),
    messagesButton: asset("/assets/game/ui/buttons/messages.webp", "留言按钮", true),
    logoutButton: asset("/assets/game/ui/buttons/logout.webp", "退出按钮", true),
  },
  dialog: {
    panel: asset("/assets/game/ui/panels/plot-actions.webp", "土地操作面板", true),
    seedCard: asset("/assets/game/ui/panels/seed-card.webp", "种子商品底板", true),
    waterButton: asset("/assets/game/ui/buttons/water.webp", "浇水按钮", true),
    harvestButton: asset("/assets/game/ui/buttons/harvest.webp", "收获按钮", true),
    clearButton: asset("/assets/game/ui/buttons/clear.webp", "清理土地按钮", true),
    closeButton: asset("/assets/game/ui/buttons/close.webp", "关闭按钮", true),
  },
} as const;

export const PET_ANIMATION_CONFIGS: Partial<
  Record<keyof typeof FARM_VISUAL_ASSETS.pets, PetAnimationConfig>
> = {
  dog: {
    spriteSheet: "/assets/game/pets/dog-idle-video-sprite.png",
    rows: 16,
    cols: 6,
    frameCount: 96,
    frameDuration: 55,
  },
  cat: {
    spriteSheet: "/assets/game/pets/cat-idle-video-sprite.png",
    rows: 16,
    cols: 6,
    frameCount: 96,
    frameDuration: 55,
  },
  rabbit: {
    spriteSheet: "/assets/game/pets/rabbit-idle-video-sprite-v2.png",
    rows: 16,
    cols: 6,
    frameCount: 96,
    frameDuration: 20,
  },
  fairy: {
    spriteSheet: "/assets/game/pets/fairy-idle-video-sprite-v2.png",
    rows: 16,
    cols: 6,
    frameCount: 96,
    frameDuration: 55,
  },
};

function cropAssets(
  folder: string,
  available = false,
): Record<CropVisualStage, VisualAsset> {
  return {
    young: asset(
      `/assets/game/crops/${folder}/seedling.webp`,
      `${folder} 幼苗`,
      available,
    ),
    mid: asset(
      `/assets/game/crops/${folder}/growing.webp`,
      `${folder} 生长期`,
      available,
    ),
    mature: asset(
      `/assets/game/crops/${folder}/mature.webp`,
      `${folder} 成熟期`,
      available,
    ),
    withered: asset(
      `/assets/game/crops/${folder}/withered.webp`,
      `${folder} 枯萎期`,
      available,
    ),
  };
}

export const FARM_VISUAL_LAYOUT = {
  canvas: {
    designWidth: 430,
    designHeight: 760,
    maxDesktopWidth: 860,
  },
  hud: {
    coins: { x: 2.5, y: 2, width: 29, height: 6.4, zIndex: 50 },
    love: { x: 34, y: 2, width: 29, height: 6.4, zIndex: 50 },
    loveBond: { x: 5.4, y: 86, width: 18.5, height: 6.2, zIndex: 42 },
    farmSign: { x: 31, y: 8.5, width: 38, height: 11, zIndex: 45 },
    invite: { x: 77, y: 1.4, width: 14, height: 8, zIndex: 50 },
    harvestAll: { x: 34, y: 77.5, width: 32, height: 5.8, zIndex: 55 },
    harvestAllWithClear: { x: 17.5, y: 77.5, width: 30, height: 5.8, zIndex: 55 },
    clearWithered: { x: 34, y: 77.5, width: 32, height: 5.8, zIndex: 55 },
    clearWitheredWithHarvest: { x: 51.5, y: 77.5, width: 30, height: 5.8, zIndex: 55 },
    collection: { x: 42, y: 87, width: 13, height: 8, zIndex: 55 },
    shop: { x: 56, y: 87, width: 13, height: 8, zIndex: 55 },
    orders: { x: 70, y: 87, width: 13, height: 8, zIndex: 55 },
    messages: { x: 84, y: 87, width: 13, height: 8, zIndex: 55 },
    logout: { x: 92, y: 1.7, width: 7, height: 4, zIndex: 55 },
  },
  plots: {
    centerX: 50,
    centerY: 54,
    maxColumns: 5,
  },
  petHome: { x: 78, y: 32.5, width: 14, height: 10.5, zIndex: 34 } satisfies VisualRect,
  dialog: {
    panel: { x: 5, y: 18, width: 90, height: 66, zIndex: 80 },
  },
} as const;

export function farmPlotRect(index: number, total: number): VisualRect {
  const config = FARM_VISUAL_LAYOUT.plots;
  const size =
    total <= 4
      ? { width: 23.5, height: 15.6, columnGap: 1.6, rowGap: .4, centerY: 56 }
      : total <= 9
        ? { width: 19.2, height: 12.7, columnGap: .8, rowGap: -.4, centerY: 54.5 }
        : total <= 16
          ? { width: 16.4, height: 13.3, columnGap: -.8, rowGap: -4.1, centerY: 54 }
          : { width: 15.8, height: 10.2, columnGap: -.8, rowGap: -5.0, centerY: 53.5 };
  const columns =
    total <= 4 ? 2 : total <= 9 ? 3 : total <= 16 ? 4 : 4;
  const rows = Math.ceil(total / columns);
  const row = Math.floor(index / columns);
  const itemsInRow = Math.min(columns, total - row * columns);
  const column = index % columns;
  const rowWidth =
    itemsInRow * size.width + Math.max(0, itemsInRow - 1) * size.columnGap;
  const gridHeight =
    rows * size.height + Math.max(0, rows - 1) * size.rowGap;

  return {
    x:
      config.centerX -
      rowWidth / 2 +
      column * (size.width + size.columnGap),
    y:
      size.centerY -
      gridHeight / 2 +
      row * (size.height + size.rowGap),
    width: size.width,
    height: size.height,
    zIndex: 20 + row,
  };
}

export function visualRectStyle(rect: VisualRect) {
  return {
    left: `${rect.x}%`,
    top: `${rect.y}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    zIndex: rect.zIndex,
  };
}
