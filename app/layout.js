import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-text",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Calories — Daily Nutrition Tracker",
  description:
    "A clean, fast personal calorie and macro tracker. Track what fuels you every day.",
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#000000",
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true} className={`${inter.variable} ${dmSans.variable}`}>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
