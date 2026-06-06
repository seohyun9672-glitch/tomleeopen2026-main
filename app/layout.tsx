import type { Metadata } from "next";
import { Anton } from "next/font/google";
import { LocaleClientWrapper } from "@/app/components/LocaleClientWrapper";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://www.tomleeopen.ca"),
  title: "Tomlee Open — Tennis Tournament",
  description: "Tennis tournament for the Korean community",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    url: "https://www.tomleeopen.ca",
    title: "Tomlee Open — Tennis Tournament",
    description: "Tennis tournament for the Korean community",
    images: [{ url: "https://www.tomleeopen.ca/og-image.png", width: 1584, height: 1000, alt: "Tomlee Open" }],
  },
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
