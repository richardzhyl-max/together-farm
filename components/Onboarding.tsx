"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboarding({ username }: { username: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>, action: "create" | "join") {
    event.preventDefault();
    setError("");
    setLoading(action);
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/onboarding/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "create" ? { name: data.get("name") } : { inviteCode: data.get("inviteCode") }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      setLoading("");
      return;
    }
    router.push("/farm");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <div className="mb-8 text-center">
        <div className="text-6xl">🏡</div>
        <h1 className="mt-3 text-3xl font-black">嗨，{username}</h1>
        <p className="mt-2 text-slate-600">创建一片新农场，或者循着邀请码去找另一半。</p>
      </div>
      {error && <p className="mx-auto mb-5 max-w-lg rounded-2xl bg-red-50 p-4 text-center font-bold text-red-700">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2">
        <form onSubmit={(e) => submit(e, "create")} className="card p-6">
          <div className="text-4xl">🌾</div><h2 className="mt-3 text-xl font-black">创建情侣农场</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">创建后会得到一个 6 位邀请码。</p>
          <input className="input" name="name" placeholder="例如：我们的向日葵农场" maxLength={24} required />
          <button className="btn-primary mt-4 w-full" disabled={Boolean(loading)}>{loading === "create" ? "正在开垦..." : "创建农场"}</button>
        </form>
        <form onSubmit={(e) => submit(e, "join")} className="card p-6">
          <div className="text-4xl">💌</div><h2 className="mt-3 text-xl font-black">加入另一半</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">输入对方分享给你的邀请码。</p>
          <input className="input uppercase tracking-[.3em]" name="inviteCode" placeholder="ABC123" minLength={6} maxLength={6} required />
          <button className="btn-primary mt-4 w-full" disabled={Boolean(loading)}>{loading === "join" ? "正在寻找..." : "加入农场"}</button>
        </form>
      </div>
    </main>
  );
}
