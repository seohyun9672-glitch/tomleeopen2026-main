import type { Metadata } from "next";
import { Anton } from "next/font/google";
import { LocaleClientWrapper } from "@/app/components/LocaleClientWrapper";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "Tomlee Open — Tennis Tournament",
  description: "Tennis tournament for the Korean community",
  icons: { icon: "/favicon.svg" },
  openGraph: { images: [{ url: "/og-image.png" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`max-w-[100%] overflow-hidden ${anton.variable}`}>
      <body className="flex flex-col h-full w-full">
        <LocaleClientWrapper>{children}</LocaleClientWrapper>
      </body>
    </html>
  );
}
