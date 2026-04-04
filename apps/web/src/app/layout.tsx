import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Personal Knowledge Passport System",
  description: "A local-first knowledge compiler, capability projection layer, and digital-agent foundation"
};

export default function RootLayout(props: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{props.children}</body>
    </html>
  );
}
