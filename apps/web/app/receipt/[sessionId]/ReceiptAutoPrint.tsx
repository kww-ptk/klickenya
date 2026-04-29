"use client";

import { useEffect } from "react";

/**
 * Triggers window.print() once on mount. Wrapped in setTimeout(0) so the
 * browser has a chance to lay out the receipt before opening the print
 * sheet — without that delay Safari occasionally prints a blank page.
 *
 * Also renders a manual "Print" fallback for when the OS blocks the auto
 * print sheet (mobile Chrome) or the user dismissed it and wants to retry.
 */
export function ReceiptAutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { window.print(); } catch { /* noop */ }
    }, 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className="no-print"
      style={{ marginTop: 16, textAlign: "center" }}
    >
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          font:        "inherit",
          padding:     "8px 16px",
          borderRadius: 999,
          border:      "1px solid #16130C",
          background:  "#16130C",
          color:       "#fff",
          cursor:      "pointer",
        }}
      >
        Print receipt
      </button>
    </div>
  );
}
