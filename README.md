# 两个人的农场

一个仅限两人共同使用的轻量农场 Web 游戏。两位玩家共享金币、土地、宠物、装饰和情侣值，所有成长状态以服务端与 SQLite 数据为准。

## 视觉风格

- Cozy Pixel Farm：统一的俯视像素地图、RPG 商店、情侣留言墙和像素 HUD。
- 农场使用 Tile Map 思路组织草地、泥土、道路、池塘、建筑、树木、围栏和可交互土地。
- 土地保持现有扩建规则，作物根据服务端状态自动切换幼苗、成长、成熟和枯萎帧。
- 宠物使用精灵表 Idle 动画，成熟提示、浇水粒子和操作反馈均采用低成本像素动画。
- 手机端使用约 430px 游戏画布，桌面端固定宽度居中展示。

像素美术使用 Gustavo Vituri 的免费
[`[8x8] Tiny Ranch Asset Pack`](https://gvituri.itch.io/tiny-ranch)。
作者允许个人及商业项目使用和修改，但禁止重新分发素材包，因此素材文件不会提交到 Git。
本地安装方法见 [`docs/PIXEL_ASSETS.md`](docs/PIXEL_ASSETS.md)。

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
