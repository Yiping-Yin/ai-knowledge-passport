import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI个人知识护照系统",
  description: "本地知识编译、能力投影与数字代理底座"
};

export default function RootLayout(props: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{props.children}</body>
    </html>
  );
}
