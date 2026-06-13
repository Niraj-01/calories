import { Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/src/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-main",
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="en" suppressHydrationWarning={true} className={inter.variable}>
      <body suppressHydrationWarning={true}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
