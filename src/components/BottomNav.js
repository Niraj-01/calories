"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import styles from "./BottomNav.module.css";

const tabs = [
  { href: "/", label: "Today", icon: "◉" },
  { href: "/history", label: "History", icon: "☰" },
  { href: "/my-foods", label: "My Foods", icon: "★" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.icon}>{tab.icon}</span>
              <span className={styles.label}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
