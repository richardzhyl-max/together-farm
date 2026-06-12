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
    <nav className="pixel-nav">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`pixel-nav-button ${pathname === link.href ? "active" : ""}`}
        >
          <span className={`pixel-nav-icon ${link.icon}`} aria-hidden="true" />
          <b>{link.label}</b>
        </Link>
      ))}
      <button onClick={logout} className="pixel-logout" aria-label="退出登录">
        X
      </button>
    </nav>
  );
}
