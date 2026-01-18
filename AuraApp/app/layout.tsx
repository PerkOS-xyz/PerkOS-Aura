import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "./components/Header";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Aura",
  description: "Aura - Intelligent Vendor Service (Analysis, Generation, Whisper, TTS)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${dmSans.variable} font-sans bg-background text-foreground`} suppressHydrationWarning>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

