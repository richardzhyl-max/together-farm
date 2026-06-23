import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import CropVariantVisual from "@/components/game/CropVariantVisual";
import { CROP_KEYS, CROP_VARIANT_CONFIG, type CropVariantType } from "@/lib/crop-variants";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FARM_VISUAL_ASSETS } from "@/lib/visual-layout";

const categories: { key: CropVariantType; title: string }[] = [
  { key: "normal", title: "普通作物" },
  { key: "golden", title: "金色作物" },
  { key: "rainbow", title: "炫彩作物" },
];

export default async function CollectionPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const member = await prisma.farmMember.findUnique({ where: { userId } });
  if (!member) redirect("/onboarding");

  const [crops, entries] = await Promise.all([
    prisma.cropConfig.findMany({
      where: { key: { in: [...CROP_KEYS] }, enabled: true },
      orderBy: { seedPrice: "asc" },
    }),
    prisma.cropCollectionEntry.findMany({ where: { farmId: member.farmId } }),
  ]);
  const entryMap = new Map(
    entries.map((entry) => [`${entry.cropKey}:${entry.variantType}`, entry]),
  );

  return (
    <main className="collection-visual-page">
      <div className="collection-game-scene">
        <Image
          className="collection-scene-background"
          src={FARM_VISUAL_ASSETS.background.src}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 860px"
        />
        <div className="collection-scene-wash" />

        <header className="collection-header">
          <h1>作物图鉴</h1>
          <p>普通、金色、炫彩的共同发现记录</p>
        </header>

        <section className="collection-board" aria-label="作物图鉴">
          {categories.map((category) => (
            <section key={category.key} className={`collection-section variant-${category.key}`}>
              <h2>{category.title}</h2>
              <div className="collection-grid">
                {crops.map((crop) => {
                  const entry = entryMap.get(`${crop.key}:${category.key}`);
                  return (
                    <article
                      key={`${category.key}:${crop.key}`}
                      className={`collection-card ${entry ? "discovered" : "locked"}`}
                    >
                      <span className="collection-card-art">
                        {entry ? (
                          <CropVariantVisual
                            cropKey={crop.key}
                            cropName={crop.name}
                            variantType={category.key}
                          />
                        ) : (
                          <span className="collection-question">?</span>
                        )}
                      </span>
                      <div>
                        <b>{entry ? variantCropName(crop.name, category.key) : "未发现"}</b>
                        <small>{entry ? `发现时间 ${formatDate(entry.discoveredAt)}` : "发现时间 ?"}</small>
                        <small>{entry ? `发现次数 ${entry.discoveryCount}` : "发现次数 ?"}</small>
                        <small>{entry ? `最高售价 ${entry.highestSellPrice}` : "最高售价 ?"}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </section>

        <nav className="orders-visual-nav collection-visual-nav" aria-label="游戏导航">
          <NavLink href="/farm" label="农场" src={FARM_VISUAL_ASSETS.plots.empty.src} />
          <NavLink href="/shop" label="商店" src={FARM_VISUAL_ASSETS.hud.shopButton.src} />
          <NavLink href="/collection" label="图鉴" src={FARM_VISUAL_ASSETS.hud.collectionButton.src} active />
          <NavLink href="/orders" label="订单" src={FARM_VISUAL_ASSETS.dialog.harvestButton.src} />
          <NavLink href="/messages" label="留言" src={FARM_VISUAL_ASSETS.hud.messagesButton.src} />
        </nav>
      </div>
    </main>
  );
}

function variantCropName(cropName: string, variantType: CropVariantType) {
  return `${CROP_VARIANT_CONFIG[variantType].label}${cropName}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NavLink({
  href,
  label,
  src,
  active = false,
}: {
  href: string;
  label: string;
  src: string;
  active?: boolean;
}) {
  return (
    <Link href={href} className={active ? "active" : ""}>
      <span className="orders-nav-art">
        <img src={src} alt="" draggable={false} />
      </span>
      <b>{label}</b>
    </Link>
  );
}
