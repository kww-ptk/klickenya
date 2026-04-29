"use client";

import { PosHeader } from "./PosHeader";
import { PosTabBar } from "./PosTabBar";

export interface HistoryRow {
  id:             string;
  status:         "paid" | "void";
  payment_method: string | null;
  total_kes:      number;
  closed_at:      string;
  covers:         number;
  table_number:   string;
}

interface PosHistoryProps {
  rows: HistoryRow[];
}

function formatKes(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

export function PosHistory({ rows }: PosHistoryProps) {
  const totalCollected = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.total_kes, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <PosHeader />

      <main className="flex-1 max-w-screen-md mx-auto w-full px-3 sm:px-6 pt-4 pb-24">
        <h1 className="text-[20px] font-bold text-white">History · today</h1>
        <p className="text-[12px] text-[#9C9485] mt-1">
          {rows.length} closed sessions · {formatKes(totalCollected)} collected
        </p>

        <div className="mt-4 rounded-2xl border border-[#2A2520] bg-[#1A170F] overflow-hidden">
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[#9C9485]">
              No closed sessions yet today.
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#2A2520] last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-white">Table {r.table_number}</p>
                  <p className="text-[11px] text-[#9C9485]">
                    {new Date(r.closed_at).toLocaleTimeString("en-KE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Africa/Nairobi",
                    })}
                    <span className="mx-1">·</span>
                    ×{r.covers}
                    {r.status === "paid" && r.payment_method ? (
                      <span className="ml-1 uppercase">· {r.payment_method}</span>
                    ) : null}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-[13px] font-bold ${r.status === "void" ? "text-[#FF8A6B]" : "text-white"}`}>
                    {r.status === "void" ? "VOID" : formatKes(r.total_kes)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <PosTabBar />
    </div>
  );
}
