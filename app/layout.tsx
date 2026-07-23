import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Steam Deal Recommender | Multi-region historical lows",
  description: "Find active Steam deals that are at or near regional historical lows across supported stores and languages.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
