import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { COOKIE_LANG } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Pukar — آپ کی آواز ، ایک بہتر کل کی بنیاد",
  description: "From Complaints to Action. Detect. Prioritize. Resolve. Prevent.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#052b21",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const lang = store.get(COOKIE_LANG)?.value === "UR" ? "UR" : "EN";
  const dir = lang === "UR" ? "rtl" : "ltr";

  return (
    <html lang={lang === "UR" ? "ur" : "en"} dir={dir}>
      <head>
        {/* Loaded via standard <link> tags (rather than next/font) so the
            build never depends on reaching Google Fonts at build time —
            important for offline/CI/sandboxed environments. Falls back
            gracefully to system fonts if the request is blocked. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
