import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./AddFoodModal.module.css";

export default function AddFoodModal({
  open,
  onClose,
  onCamera,
  onSearch,
  onBarcode,
}) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => onClose();
  const handleAction = (action) => {
    onClose();
    action();
  };

  if (!open || typeof document === "undefined") return null;

  const options = [
    {
      key: "camera",
      label: "Scan with Camera",
      onClick: onCamera,
      icon: (
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
          viewBox="0 0 24 24"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      ),
    },
    {
      key: "search",
      label: "Search Food",
      onClick: onSearch,
      icon: (
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" x2="16.65" y1="21" y2="16.65" />
        </svg>
      ),
    },
    {
      key: "barcode",
      label: "Scan Barcode",
      onClick: onBarcode,
      icon: (
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
          viewBox="0 0 24 24"
        >
          <path d="M3 5v14M7 5v14M11 5v10M15 5v14M19 5v10" />
          <path d="M3 19h16" opacity="0.35" />
        </svg>
      ),
    },
  ];

  return createPortal(
    <div
      className={`${styles.overlay} ${styles.overlayVisible}`}
      onClick={handleClose}
    >
      <main
        className={`${styles.modal} ${styles.modalVisible}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-food-title"
      >
        <div className={styles.handleBar}>
          <div className={styles.handle} />
        </div>

        <header className={styles.titleContainer}>
          <h2 id="add-food-title" className={styles.title}>
            Add Food
          </h2>
        </header>

        <nav className={styles.actionList}>
          {options.map((opt) => (
            <button
              key={opt.key}
              className={styles.actionButton}
              onClick={() => handleAction(opt.onClick)}
              aria-label={opt.label}
            >
              <div className={styles.iconContainer}>
                <div className={styles.icon}>{opt.icon}</div>
              </div>
              <div className={styles.textGroup}>
                <span className={styles.actionText}>{opt.label}</span>
              </div>
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
                  />
                </svg>
              </div>
            </button>
          ))}
        </nav>
      </main>
    </div>,
    document.body
  );
}
