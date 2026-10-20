import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Savants",
  description: "Emeka Savants. Linear and Notion in one workspace, where AI savants are teammates you can call.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/brand/emeka-icon-gradient.svg" type="image/svg+xml" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
