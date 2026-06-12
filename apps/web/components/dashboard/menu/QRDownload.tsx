"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface QRMenu {
  id: string;
  slug: string;
  display_name: string | null;
  listing_slug: string | null;
  is_published: boolean;
  table_ordering?: boolean;
}

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  floor_section: string | null;
  is_active: boolean;
}

interface QRDownloadProps {
  menu: QRMenu;
  /** Override the "← Back" link target. Defaults to the menu builder. */
  backHref?: string;
}

export function QRDownload({ menu: initialMenu, backHref }: QRDownloadProps) {
  const [menu, setMenu] = useState(initialMenu);
  const [generatingPng, setGeneratingPng] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Per-table QR state
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  // Map of table_id → canvas element ref
  const tableCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    if (!menu.table_ordering) return;
    setTablesLoading(true);
    fetch(`/api/menu/tables?menu_id=${menu.id}`)
      .then(r => r.json())
      .then(d => setTables((d.tables ?? []).filter((t: RestaurantTable) => t.is_active)))
      .catch(() => {})
      .finally(() => setTablesLoading(false));
  }, [menu.id, menu.table_ordering]);

  const downloadTableQR = useCallback((tableNumber: string, tableId: string) => {
    const canvas = tableCanvasRefs.current.get(tableId);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${menu.slug}-table-${tableNumber}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [menu.slug]);

  const publicUrl = `https://klickenya.com/m/${menu.slug}`;
  const displayName = (menu.display_name ?? menu.slug).replace(/ Menu$/i, "");

  async function captureCard(): Promise<HTMLCanvasElement> {
    const el = cardRef.current;
    if (!el) throw new Error("Card element not found");

    return html2canvas(el, {
      scale: 2,
      useCORS: false,
      allowTaint: false,
      backgroundColor: "#ffffff",
    });
  }

  async function downloadPng() {
    setGeneratingPng(true);
    try {
      const canvas = await captureCard();
      const link = document.createElement("a");
      link.download = `${menu.slug}-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG generation failed:", err);
    } finally {
      setGeneratingPng(false);
    }
  }

  async function downloadPdf() {
    setGeneratingPdf(true);
    try {
      const canvas = await captureCard();
      // A6 = 105mm × 148mm
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [105, 148] });
      const imgData = canvas.toDataURL("image/png");
      // Scale image to fit A6 with margins
      const margin = 5;
      const w = 105 - margin * 2;
      const h = (canvas.height / canvas.width) * w;
      pdf.addImage(imgData, "PNG", margin, margin, w, h);
      pdf.save(`${menu.slug}-qr.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function publishMenu() {
    setPublishing(true);
    try {
      const res = await fetch("/api/menu/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menu.id, is_published: true }),
      });
      if (!res.ok) throw new Error();
      setMenu((prev) => ({ ...prev, is_published: true }));
    } catch {
      // ignore
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      {/* Back link + title */}
      <div className="mb-5">
        <Link
          href={backHref ?? `/dashboard/menu/${menu.id}`}
          className="text-[13px] text-text3 hover:text-dark transition-colors"
        >
          {backHref ? "← Back to dashboard" : "← Back to menu builder"}
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mt-2">
          QR Code — {menu.display_name ?? menu.slug}
        </h1>
        <p className="text-[13px] text-text3 mt-0.5">
          Print this and place it on your tables
        </p>
      </div>

      {/* Draft warning */}
      {!menu.is_published && (
        <div className="mb-5 rounded-xl border border-amber/30 bg-amber/[0.06] p-4 flex items-start gap-3">
          <span className="text-[18px] shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-dark">
              Your menu is not published yet
            </p>
            <p className="text-[12.5px] text-text2 mt-0.5">
              Customers who scan this QR code will see a 404 page. Publish your menu first.
            </p>
          </div>
          <button
            onClick={publishMenu}
            disabled={publishing}
            className="shrink-0 bg-amber text-dark font-bold text-[12px] px-4 h-[32px] flex items-center rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {publishing ? "Publishing..." : "Publish menu →"}
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left: QR preview + download */}
        <div className="flex-1 min-w-0">
          {/* Table card preview */}
          <div className="flex justify-center mb-6">
            <div
              ref={cardRef}
              id="table-card"
              style={{
                width: 300,
                padding: 32,
                backgroundColor: "#ffffff",
                borderRadius: 16,
                border: "1px solid #E2DDD5",
                textAlign: "center",
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              {/* Klickenya wordmark */}
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#E8A020",
                  letterSpacing: "-0.02em",
                  marginBottom: 20,
                  fontFamily: "Georgia, serif",
                }}
              >
                KlicKenya
              </p>

              {/* QR code */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <QRCodeSVG
                  value={publicUrl}
                  size={200}
                  fgColor="#16130C"
                  bgColor="#ffffff"
                  includeMargin
                  level="M"
                />
              </div>

              {/* Restaurant name */}
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#16130C",
                  marginBottom: 4,
                  fontFamily: "Georgia, serif",
                }}
              >
                {displayName}
              </p>

              {/* Call to action */}
              <p
                style={{
                  fontSize: 13,
                  color: "#5E5848",
                  marginBottom: 12,
                }}
              >
                Scan to view our menu
              </p>

              {/* URL */}
              <p
                style={{
                  fontSize: 10,
                  color: "#9C9485",
                  fontFamily: "monospace",
                }}
              >
                klickenya.com/m/{menu.slug}
              </p>
            </div>
          </div>

          {/* Download buttons */}
          <div className="flex justify-center gap-3">
            <button
              onClick={downloadPng}
              disabled={generatingPng}
              className="flex items-center gap-2 bg-dark text-white font-bold text-[13px] px-5 h-[44px] rounded-full hover:bg-[#2A2520] transition-colors disabled:opacity-50"
            >
              {generatingPng ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>⬇ Download PNG</>
              )}
            </button>
            <button
              onClick={downloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-2 border border-border text-dark font-bold text-[13px] px-5 h-[44px] rounded-full hover:border-text3 transition-colors disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>⬇ Download PDF</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Instructions */}
        <div className="lg:w-[40%] shrink-0 space-y-4">
          <div className="bg-white rounded-xl lg:rounded-2xl border border-border p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-dark mb-4">
              How to use your QR code
            </h2>

            <div className="space-y-5">
              <div className="flex gap-3">
                <span className="text-[20px] shrink-0">🖨️</span>
                <div>
                  <p className="text-[13px] font-semibold text-dark">Print</p>
                  <p className="text-[12px] text-text2 mt-0.5 leading-relaxed">
                    Download the PDF and print on card stock. A6 size (105×148mm) works best.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-[20px] shrink-0">✂️</span>
                <div>
                  <p className="text-[13px] font-semibold text-dark">Cut & laminate</p>
                  <p className="text-[12px] text-text2 mt-0.5 leading-relaxed">
                    Laminate for durability — they live on tables and get handled constantly.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-[20px] shrink-0">📱</span>
                <div>
                  <p className="text-[13px] font-semibold text-dark">Test it</p>
                  <p className="text-[12px] text-text2 mt-0.5 leading-relaxed">
                    Scan your own QR code to confirm it works before putting it on tables.
                  </p>
                  <Link
                    href={`/m/${menu.slug}`}
                    target="_blank"
                    className="text-[12px] font-semibold text-amber hover:underline mt-1 inline-block"
                  >
                    Test scan →
                  </Link>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="text-[20px] shrink-0">🔄</span>
                <div>
                  <p className="text-[13px] font-semibold text-dark">It updates automatically</p>
                  <p className="text-[12px] text-text2 mt-0.5 leading-relaxed">
                    When you update your menu, the QR code page updates too. No need to reprint.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status callout */}
          <div
            className={`rounded-xl border p-4 ${
              menu.is_published
                ? "border-green/20 bg-green/[0.04]"
                : "border-amber/20 bg-amber/[0.04]"
            }`}
          >
            <p className="text-[13px] font-semibold text-dark">
              💡 Your menu is{" "}
              {menu.is_published ? (
                <span className="text-green">Live</span>
              ) : (
                <span className="text-amber">Draft</span>
              )}
            </p>
            {menu.is_published ? (
              <p className="text-[12px] text-text2 mt-1">
                Customers can scan this QR code right now.
              </p>
            ) : (
              <>
                <p className="text-[12px] text-text2 mt-1">
                  Publish your menu first so customers can see it when they scan.
                </p>
                <Link
                  href={`/dashboard/menu/${menu.id}`}
                  className="text-[12px] font-semibold text-amber hover:underline mt-1 inline-block"
                >
                  Publish now →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Per-table QR codes ───────────────────────────────────────────── */}
      {menu.table_ordering && (
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="text-[18px] font-bold text-dark">Table QR codes</h2>
            <p className="text-[13px] text-text3 mt-0.5">
              Each table gets a unique QR. When a guest scans it, their table is pre-filled — no manual entry needed.
            </p>
          </div>

          {tablesLoading ? (
            <p className="text-[13px] text-text3">Loading tables…</p>
          ) : tables.length === 0 ? (
            <div className="bg-white rounded-xl border border-border p-5 text-center">
              <p className="text-[13px] text-text3">No active tables yet.</p>
              <Link
                href={`/dashboard/menu/${menu.id}`}
                className="text-[13px] font-semibold text-amber hover:underline mt-1 inline-block"
              >
                Add tables in the menu builder →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {tables.map(table => {
                const tableUrl = `https://klickenya.com/m/${menu.slug}?table=${encodeURIComponent(table.table_number)}`;
                return (
                  <div
                    key={table.id}
                    className="bg-white rounded-xl border border-border p-4 flex flex-col items-center gap-3 shadow-sm"
                  >
                    {/* Hidden canvas for PNG download */}
                    <QRCodeCanvas
                      value={tableUrl}
                      size={200}
                      fgColor="#16130C"
                      bgColor="#ffffff"
                      level="M"
                      ref={(el: HTMLCanvasElement | null) => {
                        if (el) tableCanvasRefs.current.set(table.id, el);
                        else tableCanvasRefs.current.delete(table.id);
                      }}
                      style={{ display: "none" }}
                    />

                    {/* Visible QR */}
                    <QRCodeSVG
                      value={tableUrl}
                      size={120}
                      fgColor="#16130C"
                      bgColor="#ffffff"
                      level="M"
                    />

                    {/* Table label */}
                    <div className="text-center">
                      <p className="text-[15px] font-bold text-dark">Table {table.table_number}</p>
                      {table.floor_section && (
                        <p className="text-[11px] text-text3">{table.floor_section}</p>
                      )}
                      <p className="text-[10px] text-text3 mt-0.5">{table.capacity} guests</p>
                    </div>

                    {/* Download */}
                    <button
                      onClick={() => downloadTableQR(table.table_number, table.id)}
                      className="w-full h-[30px] rounded-full bg-dark text-white text-[11px] font-bold hover:bg-[#2A2520] transition-colors"
                    >
                      ⬇ Download PNG
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
