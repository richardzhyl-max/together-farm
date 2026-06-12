"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/farm", label: "农场", icon: "field" },
  { href: "/shop", label: "商店", icon: "shop" },
  { href: "/messages", label: "留言", icon: "mail" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="wood-nav">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`wood-nav-button ${pathname === link.href ? "active" : ""}`}
        >
          <span className={`nav-symbol ${link.icon}`} aria-hidden="true" />
          <b>{link.label}</b>
        </Link>
      ))}
      <button onClick={logout} className="nav-logout" aria-label="退出登录">×</button>
    </nav>
  );
}
