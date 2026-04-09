import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-main",
  weight: ["300", "400", "500", "600", "700", "800"],
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
    <html lang="en" suppressHydrationWarning={true} className={jakarta.variable}>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
