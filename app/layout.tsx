import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steam å²ä½Žï½œä¸­å›½åŒºå½“å‰æœ‰æ•ˆ Deal",
  description: "æŸ¥çœ‹ä¸­å›½åŒº Steam å½“å‰æœ‰æ•ˆçš„ä¸¤å¹´å²ä½Žä¸Žå‘å”®ä»¥æ¥å²ä½Žæ¸¸æˆã€‚",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
