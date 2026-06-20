import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const crops = [
  { key: "radish", name: "萝卜", emoji: "🥕", rarity: "普通", seedPrice: 20, growDurationSeconds: 600, sellPrice: 45, witherAfterSeconds: 43200 },
  { key: "bokchoy", name: "青菜", emoji: "🥬", rarity: "普通", seedPrice: 35, growDurationSeconds: 900, sellPrice: 82, witherAfterSeconds: 43200 },
  { key: "wheat", name: "小麦", emoji: "🌾", rarity: "普通", seedPrice: 50, growDurationSeconds: 1800, sellPrice: 120, witherAfterSeconds: 43200 },
  { key: "corn", name: "玉米", emoji: "🌽", rarity: "普通", seedPrice: 90, growDurationSeconds: 3600, sellPrice: 230, witherAfterSeconds: 54000 },
  { key: "tomato", name: "番茄", emoji: "🍅", rarity: "优秀", seedPrice: 150, growDurationSeconds: 7200, sellPrice: 380, witherAfterSeconds: 64800 },
  { key: "pumpkin", name: "南瓜", emoji: "🎃", rarity: "优秀", seedPrice: 260, growDurationSeconds: 14400, sellPrice: 720, witherAfterSeconds: 72000 },
  { key: "strawberry", name: "草莓", emoji: "🍓", rarity: "稀有", seedPrice: 400, growDurationSeconds: 21600, sellPrice: 1100, witherAfterSeconds: 86400 },
  { key: "blueberry", name: "蓝莓", emoji: "🫐", rarity: "稀有", seedPrice: 520, growDurationSeconds: 28800, sellPrice: 1480, witherAfterSeconds: 86400 },
  { key: "grape", name: "葡萄", emoji: "🍇", rarity: "稀有", seedPrice: 760, growDurationSeconds: 36000, sellPrice: 2200, witherAfterSeconds: 108000 },
  { key: "cotton", name: "棉花", emoji: "☁️", rarity: "稀有", seedPrice: 920, growDurationSeconds: 39600, sellPrice: 2680, witherAfterSeconds: 108000 },
  { key: "starflower", name: "星星花", emoji: "🌟", rarity: "史诗", seedPrice: 1200, growDurationSeconds: 43200, sellPrice: 3600, witherAfterSeconds: 129600 },
  { key: "moonshroom", name: "月光菇", emoji: "🍄", rarity: "史诗", seedPrice: 1800, growDurationSeconds: 54000, sellPrice: 5600, witherAfterSeconds: 129600 },
  { key: "heartrose", name: "爱心玫瑰", emoji: "🌹", rarity: "史诗", seedPrice: 2400, growDurationSeconds: 64800, sellPrice: 7800, witherAfterSeconds: 172800 },
];

const pets = [
  { key: "dog", name: "小狗", emoji: "🐶", description: "作物售价 +3%", price: 1000, sellBonus: 0.03 },
  { key: "cat", name: "小猫", emoji: "🐱", description: "成熟时间 -3%", price: 1500, growBonus: 0.03 },
  { key: "rabbit", name: "小兔", emoji: "🐰", description: "浇水冷却 -10%", price: 2200, waterCooldown: 0.1 },
  { key: "fairy", name: "小精灵", emoji: "🧚", description: "每天自动浇水 2 块", price: 8000, unlockLove: 100, autoWaterPlots: 2 },
];

const decorations = [
  { key: "fence", name: "木栅栏", emoji: "🪵", price: 180, unlockLove: 0 },
  { key: "path", name: "石子小路", emoji: "🪨", price: 240, unlockLove: 5 },
  { key: "flowerbed", name: "花坛", emoji: "🌷", price: 360, unlockLove: 10 },
  { key: "swing", name: "秋千", emoji: "🛝", price: 680, unlockLove: 20 },
  { key: "lamp", name: "路灯", emoji: "🏮", price: 520, unlockLove: 30 },
  { key: "heartarch", name: "爱心拱门", emoji: "💞", price: 1200, unlockLove: 60 },
];

async function main() {
  for (const crop of crops) {
    await prisma.cropConfig.upsert({ where: { key: crop.key }, update: crop, create: crop });
  }
  for (const pet of pets) {
    await prisma.petConfig.upsert({ where: { key: pet.key }, update: pet, create: pet });
  }
  for (const decoration of decorations) {
    await prisma.decorationConfig.upsert({
      where: { key: decoration.key },
      update: decoration,
      create: decoration,
    });
  }
  console.log("Farm catalog seeded.");
}

main().finally(() => prisma.$disconnect());
