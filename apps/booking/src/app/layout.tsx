import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "Learn Space · Book a space", template: "%s · Learn Space" },
  description: "Book professional spaces for meetings, podcasts, photography and video production in Lagos.",
};

export const viewport: Viewport = { themeColor: "#f6f7fc" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
