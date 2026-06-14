import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "패들렛 과제 확인",
  description: "Padlet 게시글을 학생별로 수합하여 과제 제출 현황을 확인합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
