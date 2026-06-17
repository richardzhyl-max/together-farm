# 两个人的农场

一个仅限两人共同使用的轻量农场 Web 游戏。两位玩家共享金币、土地、宠物、装饰和情侣值，所有成长状态以服务端与 SQLite 数据为准。

## 视觉风格

`/farm` 正在迁移为完整 Q 版休闲手游插画方案：

- 一张统一绘制的完整农场背景承载天空、草地、房屋、树木、小路、围栏、池塘和氛围装饰。
- 仅土地、作物、宠物、HUD 和操作弹窗作为动态交互层。
- 所有场景坐标和资源路径集中在 `lib/visual-layout.ts`。
- 当前阶段只搭建 `/farm` 的视觉架构，不用 CSS、SVG、emoji 或像素素材伪造缺失美术。
- 正式素材清单见 [`FARM_VISUAL_ASSETS.md`](FARM_VISUAL_ASSETS.md)。

`/shop` 与 `/messages` 暂时保留上一阶段视觉，后续在 `/farm` 美术验收后单独迁移。

## 技术栈

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS
- Prisma ORM + SQLite
- Socket.IO
- bcryptjs + jose + zod

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

访问 `http://localhost:3000`。开发服务器由根目录的 `server.ts` 启动，以便 Next.js 和 Socket.IO 共用同一端口。

开发环境示例后台密码为 `lovefarm-admin`，访问 `http://localhost:3000/admin` 后输入。生产环境必须显式提供 `JWT_SECRET` 与 `ADMIN_PASSWORD`，缺失任一变量时服务会拒绝启动或请求，不会使用开发默认值。

## 测试两个账号

1. 打开普通浏览器访问 `/register`，注册第一个账号并创建农场。
2. 点击农场顶部的邀请码可复制 6 位邀请码。
3. 使用无痕窗口访问 `/register` 注册第二个账号。
4. 在引导页输入邀请码加入。
5. 两个窗口会通过 Socket.IO 自动同步农场与留言状态。

账号由注册页面即时创建，没有写死的测试账号。

## 常用命令

```bash
npm run dev       # 启动开发服务器
npm run build     # Prisma generate + Next.js 生产构建
npm run start     # 启动生产服务器
npm run assets:generate # 从本地 Tiny Ranch 精灵表生成运行时地形切片
npm run db:push   # 同步 Prisma schema 到 SQLite
npm run db:seed   # 写入作物、宠物和装饰配置
npm run db:setup  # 初始化数据库并写入配置
```

## 玩法说明

- 初始 500 金币、4 块土地。
- 点击空地选择种子并扣除共同金币。
- 离开页面后作物继续按数据库时间成长。
- 生长期每块地默认 30 分钟可浇水一次，减少剩余时间 5%，累计最多减少原成长时间 30%。
- 正常成熟收获增加 2 情侣值；枯萎后仍可按原售价 50% 售出。
- 宠物提供售价、成长和浇水冷却加成，叠加受服务端上限约束。
- 每人每天第一次留言增加 1 情侣值；两人同一天登录增加 3 情侣值。
- 管理后台可修改金币、情侣值、重置土地及编辑首版商品价格和解锁值。
- Socket.IO 的 `farm:join` 会验证登录 cookie 和农场成员关系，用户只能加入自己所属农场的实时房间。
- 新农场邀请码由 Node.js `crypto` 生成，为 6 位大写字母数字组合。

## 目录

- `app/api`：认证、农场、商城、留言和后台 API
- `components`：客户端交互页面
- `lib/farm.ts`：服务端成长、宠物加成、每日奖励和农场快照
- `prisma/schema.prisma`：SQLite 数据模型
- `prisma/seed.ts`：首版配置数据
- `server.ts`：Next.js + Socket.IO 自定义服务器
