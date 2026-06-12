import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  new: "bg-amber/15 text-amber",
  responded: "bg-[#22C55E]/15 text-[#22C55E]",
  converted: "bg-[#3B82F6]/15 text-[#3B82F6]",
  closed: "bg-text3/15 text-text3",
  // /list flow statuses
  pending_otp: "bg-amber/15 text-amber",
  submitted: "bg-[#6366F1]/15 text-[#6366F1]",
  // Ambassador / claim / listing statuses
  approved: "bg-[#22C55E]/15 text-[#22C55E]",
  rejected: "bg-[#EF4444]/15 text-[#EF4444]",
  pending: "bg-amber/15 text-amber",
  verified: "bg-[#3B82F6]/15 text-[#3B82F6]",
  // Property/listing statuses
  available: "bg-[#22C55E]/15 text-[#22C55E]",
  "under-offer": "bg-amber/15 text-amber",
  sold: "bg-[#3B82F6]/15 text-[#3B82F6]",
  let: "bg-[#3B82F6]/15 text-[#3B82F6]",
  draft: "bg-text3/15 text-text3",
  published: "bg-[#22C55E]/15 text-[#22C55E]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize",
        statusStyles[status] ?? "bg-text3/15 text-text3"
      )}
    >
      {status.replace(/_/g, " ").replace(/-/g, " ")}
    </span>
  );
}
