"use client";

import { FormEvent, useEffect, useState } from "react";

type Data = {
  users: { id: string; username: string; createdAt: string; membership: { farmId: string } | null }[];
  farms: { id: string; name: string; inviteCode: string; coins: number; lovePoints: number; plotCount: number; members: { user: { username: string } }[]; plots: { id: string; index: number; cropKey: string | null }[] }[];
  crops: { key: string; name: string; emoji: string; seedPrice: number; sellPrice: number }[];
  pets: { key: string; name: string; emoji: string; price: number; unlockLove: number }[];
  decorations: { key: string; name: string; emoji: string; price: number; unlockLove: number }[];
};

export default function AdminClient({ authenticated }: { authenticated: boolean }) {
  const [ready, setReady] = useState(authenticated);
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/admin/data", { cache: "no-store" }).then(async (r) => { if (r.ok) setData(await r.json()); });
  useEffect(() => { if (ready) load(); }, [ready]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
    if (response.ok) setReady(true); else setMessage((await response.json()).error);
  }
  async function request(path: string, method: string, body: object) {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json(); setMessage(response.ok ? "保存成功" : result.error); if (response.ok) load();
  }

  if (!ready) return <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5"><form onSubmit={login} className="card w-full p-7"><div className="text-5xl">🔐</div><h1 className="mt-3 text-2xl font-black">农场管理后台</h1><p className="mb-4 text-sm text-slate-500">使用环境变量 ADMIN_PASSWORD 登录。</p><input className="input" type="password" name="password" required placeholder="管理员密码" />{message && <p className="mt-3 text-sm text-red-600">{message}</p>}<button className="btn-primary mt-4 w-full">进入后台</button></form></main>;
  if (!data) return <main className="grid min-h-screen place-items-center font-bold">正在读取农场数据...</main>;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8">
      <header className="card flex items-center justify-between p-6"><div><p className="text-sm text-slate-500">Together Farm Console</p><h1 className="text-3xl font-black">农场管理后台</h1></div><a href="/farm" className="btn-soft">返回农场</a></header>
      {message && <button onClick={() => setMessage("")} className="mt-4 w-full rounded-2xl bg-slate-800 p-3 text-white">{message}</button>}
      <section className="card mt-5 overflow-hidden p-5"><h2 className="text-xl font-black">用户（{data.users.length}）</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">用户名</th><th>注册时间</th><th>农场</th></tr></thead><tbody>{data.users.map((u) => <tr className="border-b border-slate-100" key={u.id}><td className="p-2 font-bold">{u.username}</td><td>{new Date(u.createdAt).toLocaleString("zh-CN")}</td><td>{u.membership?.farmId || "未加入"}</td></tr>)}</tbody></table></div></section>
      <section className="mt-5 space-y-4"><h2 className="text-xl font-black">农场（{data.farms.length}）</h2>{data.farms.map((farm) => <article key={farm.id} className="card p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-black">{farm.name}</h3><p className="text-sm text-slate-500">{farm.members.map((m) => m.user.username).join(" + ")} · 邀请码 {farm.inviteCode} · {farm.plotCount} 块地</p></div></div><form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); request("/api/admin/farm", "PATCH", { farmId: farm.id, coins: Number(f.get("coins")), lovePoints: Number(f.get("lovePoints")) }); }} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-bold">金币<input className="input mt-1" name="coins" type="number" min="0" defaultValue={farm.coins} /></label><label className="text-sm font-bold">情侣值<input className="input mt-1" name="lovePoints" type="number" min="0" defaultValue={farm.lovePoints} /></label><button className="btn-primary self-end">保存</button></form><div className="mt-4 flex flex-wrap gap-2">{farm.plots.map((plot) => <button key={plot.id} onClick={() => request("/api/admin/plot", "POST", { plotId: plot.id })} className={`rounded-xl px-3 py-2 text-xs font-bold ${plot.cropKey ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>#{plot.index + 1} {plot.cropKey || "空地"} · 重置</button>)}</div></article>)}</section>
      <ConfigTable title="作物配置" type="crop" items={data.crops} request={request} />
      <ConfigTable title="宠物配置" type="pet" items={data.pets} request={request} />
      <ConfigTable title="装饰配置" type="decoration" items={data.decorations} request={request} />
    </main>
  );
}

function ConfigTable({ title, type, items, request }: { title: string; type: "crop" | "pet" | "decoration"; items: Record<string, string | number>[]; request: (path: string, method: string, body: object) => void }) {
  return <section className="card mt-5 p-5"><h2 className="text-xl font-black">{title}</h2><div className="mt-3 space-y-2">{items.map((item) => <form key={String(item.key)} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); request("/api/admin/config", "PATCH", type === "crop" ? { type, key: item.key, price: Number(f.get("price")), sellPrice: Number(f.get("secondary")) } : { type, key: item.key, price: Number(f.get("price")), unlockLove: Number(f.get("secondary")) }); }} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2 rounded-2xl bg-slate-50 p-2"><span className="font-bold">{item.emoji} {item.name}</span><input className="input !p-2" aria-label="价格" name="price" type="number" min="0" defaultValue={Number(type === "crop" ? item.seedPrice : item.price)} /><input className="input !p-2" aria-label={type === "crop" ? "售价" : "解锁情侣值"} name="secondary" type="number" min="0" defaultValue={Number(type === "crop" ? item.sellPrice : item.unlockLove)} /><button className="btn-soft !px-3 !py-2">保存</button></form>)}</div></section>;
}
