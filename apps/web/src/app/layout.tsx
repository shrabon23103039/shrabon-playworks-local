import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { FavoritesProvider, LocaleProvider } from "@/components/locale-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Shrabon Playworks — Original HTML5 Browser Games",
    template: "%s · Shrabon Playworks",
  },
  description: "Independent portal for original HTML5 browser games. Play immediately in an isolated browser frame.",
  applicationName: "Shrabon Playworks",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3000"),
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();
  return (
    <html lang="en">
      <body>
        <LocaleProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
