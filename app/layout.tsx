import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

const body = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const display = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SellerMate — সেলার খাতা",
  description: "ছোট অনলাইন বিক্রেতাদের জন্য গ্রাহক, বাকি ও ফলো-আপের সহজ খাতা।",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E2B25",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${body.variable} ${display.variable}`}>
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
