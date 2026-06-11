import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "两个人的农场",
  description: "只属于两个人的共同农场小游戏",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
