import "./globals.css";

export const metadata = {
  title: "Calories — Daily Nutrition Tracker",
  description: "A clean, fast personal calorie and macro tracker. Track what fuels you every day.",
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#0A0A0B",
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
