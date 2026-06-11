"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const links = [["/farm", "🌱 农场"], ["/shop", "🛒 商城"], ["/messages", "💌 留言"]];
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <nav className="fixed inset-x-0 bottom-3 z-30 mx-auto flex w-[calc(100%-24px)] max-w-lg items-center gap-1 rounded-3xl border border-white/80 bg-white/90 p-2 shadow-soft backdrop-blur">
      {links.map(([href, label]) => <Link key={href} href={href} className={`flex-1 rounded-2xl px-2 py-3 text-center text-sm font-black ${pathname === href ? "bg-leaf text-white" : "text-slate-600"}`}>{label}</Link>)}
      <button onClick={logout} className="rounded-2xl px-3 py-3 text-sm font-bold text-slate-400" aria-label="退出登录">退出</button>
    </nav>
  );
}
