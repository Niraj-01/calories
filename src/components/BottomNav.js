"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./BottomNav.module.css";

const tabs = [
  {
    href: "/",
    label: "Today",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
    ),
  },
  {
    href: "/my-foods",
    label: "Foods",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6-5.3-2.9L6.3 19.6l1.1-6L3 9.4l6-.8z" /></svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const openScanner = () => {
    if (pathname !== "/") {
      try {
        sessionStorage.setItem("calo:autoscan", "1");
      } catch {}
      router.push("/");
    } else {
      window.dispatchEvent(new CustomEvent("calo:scan"));
    }
  };

  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);

  const renderTab = (tab) => {
    const isActive =
      tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
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
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.fade} />
      <div className={styles.bar}>
        {left.map(renderTab)}
        <div className={styles.gap} />
        {right.map(renderTab)}
      </div>
      <button className={styles.fab} onClick={openScanner} aria-label="Scan a meal">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3.2" /></svg>
      </button>
    </nav>
  );
}
