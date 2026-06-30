"use client";

import { useState } from "react";
import styles from "./PdfsPage.module.css";

const PDFS = [
  {
    key: "synopsis",
    label: "Calories Project Synopsis",
    src: "/Calories_Project_Synopsis.pdf",
  },
  {
    key: "abstract",
    label: "Project Abstract",
    src: "/Project_Abstract.pdf",
  },
];

export default function PdfsPage() {
  const [selectedKey, setSelectedKey] = useState(PDFS[0].key);
  const active = PDFS.find((p) => p.key === selectedKey) || PDFS[0];

  return (
    <div className={`page container fade-in ${styles.container}`}>
      <header className={styles.header}>
        {/* Intrinsic dimensions let the browser reserve the right space (the
            CSS caps width to 92px and derives height from this 838:312 ratio),
            so the header doesn't jump when the logo loads. */}
        <img
          className={styles.logo}
          src="/amity_logo.png"
          alt="AMITY University logo"
          width={838}
          height={312}
        />
        <h1 className={styles.university}>AMITY UNIVERSITY, MUMBAI</h1>
        <p className={styles.school}>
          Amity School of Engineering and Technology
        </p>
        <p className={styles.dept}>Department of Computer Science & Engineering</p>
      </header>

      <div className={styles.controls}>
        <label className={styles.label}>
          Document
          <select
            className={styles.select}
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {PDFS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <a
          className={styles.openLink}
          href={active.src}
          target="_blank"
          rel="noreferrer"
        >
          Open full PDF
        </a>
      </div>

      <div className={styles.viewerWrap}>
        <iframe
          className={styles.iframe}
          src={active.src}
          title={active.label}
        />
      </div>
    </div>
  );
}

