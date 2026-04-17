import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./AddFoodModal.module.css";

export default function AddFoodModal({
  open,
  onClose,
  onCamera,
  onSearch,
  onBarcode,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <main
        className={`${styles.modal} glass-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dragHandleContainer}>
          <div className={styles.dragHandle}></div>
        </div>

        <header className={styles.titleContainer}>
          <h2 className={styles.title}>Add Food</h2>
        </header>

        <nav className={styles.actionList}>
          {/* Scan with Camera */}
          <button
            className={`${styles.actionButton} glass-card`}
            onClick={() => {
              onClose();
              onCamera();
            }}
            aria-label="Scan with Camera"
          >
            <div className={styles.iconContainer}>
              <svg
                className={styles.icon}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
            <span className={styles.actionText}>Scan with Camera</span>
            <div className={styles.chevronContainer}>
              <svg
                className={styles.chevron}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </div>
          </button>

          {/* Search Food */}
          <button
            className={`${styles.actionButton} glass-card`}
            onClick={() => {
              onClose();
              onSearch();
            }}
            aria-label="Search Food"
          >
            <div className={styles.iconContainer}>
              <svg
                className={styles.icon}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" x2="16.65" y1="21" y2="16.65"></line>
              </svg>
            </div>
            <span className={styles.actionText}>Search Food</span>
            <div className={styles.chevronContainer}>
              <svg
                className={styles.chevron}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </div>
          </button>

          {/* Scan Barcode */}
          <button
            className={`${styles.actionButton} glass-card`}
            onClick={() => {
              onClose();
              onBarcode();
            }}
            aria-label="Scan Barcode"
          >
            <div className={styles.iconContainer}>
              <svg
                className={styles.icon}
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14M3 5h2M3 19h2M19 5h2M19 19h2"></path>
                <path
                  d="M5 5h3M5 19h3M16 5h3M16 19h3"
                  opacity="0.3"
                  stroke="white"
                  strokeWidth="2"
                ></path>
              </svg>
            </div>
            <span className={styles.actionText}>Scan Barcode</span>
            <div className={styles.chevronContainer}>
              <svg
                className={styles.chevron}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
            </div>
          </button>
        </nav>
      </main>
    </div>,
    document.body
  );
}
