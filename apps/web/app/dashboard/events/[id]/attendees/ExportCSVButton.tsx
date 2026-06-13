"use client";

import { Download } from "lucide-react";

interface Attendee {
  name: string;
  email: string;
  phone: string | null;
  joined_at: string;
}

interface ExportCSVButtonProps {
  attendees: Attendee[];
  eventTitle: string;
}

export function ExportCSVButton({ attendees, eventTitle }: ExportCSVButtonProps) {
  function handleExport() {
    const header = "Name,Email,Phone,Joined\n";
    const rows = attendees.map((a) =>
      `"${a.name}","${a.email}","${a.phone ?? ""}","${new Date(a.joined_at).toLocaleDateString("en-GB")}"`
    ).join("\n");

    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-zA-Z0-9]/g, "-")}-attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-[13px] font-semibold text-text hover:bg-surface transition-colors"
    >
      <Download className="size-3.5" />
      Export CSV
    </button>
  );
}
