import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { AppProvider } from "@/context/app-context";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-body",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harmoni Feasibility Studio",
  description: "Studi kelayakan proyek konstruksi & perumahan — Cipta Harmoni Lestari",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
