import { Plus_Jakarta_Sans, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/src/components/ServiceWorkerRegister";

// NOTE: force-dynamic lives on the (app) route group, not here, so that public
// static pages (e.g. /privacy) can be statically generated and CDN-cached while
// the personalized app routes still render per-request for the CSP nonce.

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-main",
  weight: ["400", "500", "600", "700", "800"],
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "600", "700", "800"],
});

export const metadata = {
  applicationName: "Calories",
  title: "Calories — Daily Nutrition Tracker",
  description:
    "A clean, fast personal calorie and macro tracker. Track what fuels you every day.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Calories",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: "#FFFFFF",
  };
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={`${jakarta.variable} ${bricolage.variable}`}
    >
      <body suppressHydrationWarning={true}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
