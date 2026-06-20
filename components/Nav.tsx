"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/farm", label: "农场", icon: "field" },
  { href: "/shop", label: "商店", icon: "shop" },
  { href: "/orders", label: "订单", icon: "order" },
  { href: "/messages", label: "留言", icon: "mail" },
];

export default function Nav() {
  const pathname = usePathname();

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
    </nav>
  );
}
