import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steam 史低｜中国区当前有效 Deal",
  description: "查看中国区 Steam 当前有效的两年史低与发售以来史低游戏。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
