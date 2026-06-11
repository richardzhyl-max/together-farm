"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    if (mode === "register" && password !== data.get("confirm")) {
      setError("两次输入的密码不一致");
      setLoading(false);
      return;
    }
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: data.get("username"), password }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(mode === "login" && result.hasFarm ? "/farm" : "/onboarding");
    router.refresh();
  }

  const register = mode === "register";
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
      <section className="card w-full overflow-hidden">
        <div className="bg-gradient-to-br from-green-700 to-green-500 px-7 py-8 text-white">
          <div className="mb-3 text-5xl">🌱💛</div>
          <h1 className="text-3xl font-black">{register ? "一起开垦吧" : "欢迎回到农场"}</h1>
          <p className="mt-2 text-green-50">两个人，一片地，慢慢把日子种成喜欢的样子。</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-7">
          <label className="block font-bold">用户名<input className="input mt-2" name="username" autoComplete="username" required /></label>
          <label className="block font-bold">密码<input className="input mt-2" name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={6} required /></label>
          {register && <label className="block font-bold">确认密码<input className="input mt-2" name="confirm" type="password" minLength={6} required /></label>}
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? "请稍候..." : register ? "注册并开始" : "登录"}</button>
          <p className="text-center text-sm text-slate-500">
            {register ? "已经有账号？" : "还没有账号？"}
            <Link className="ml-1 font-bold text-leaf" href={register ? "/login" : "/register"}>{register ? "去登录" : "去注册"}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
