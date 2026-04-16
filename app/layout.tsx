import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-heading" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "Tomlee Open — Tennis Tournament",
  description: "Tennis tournament for the Korean community",
  icons: { icon: "/favicon.svg" },
  openGraph: { images: [{ url: "/og-image.svg" }] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`h-full w-full max-w-[100%] overflow-hidden p-0 ${anton.variable}`}>
      <body className="m-0 flex h-full min-h-0 w-full max-w-[100%] flex-col overflow-hidden bg-[var(--background)] p-0 font-sans text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  );
}
