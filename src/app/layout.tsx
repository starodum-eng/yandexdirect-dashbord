import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Дашборд Яндекс.Директ",
  description: "Сводная статистика рекламных кабинетов агентства",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
