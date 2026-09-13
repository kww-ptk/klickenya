import { EatAdminNav } from "./_components/EatAdminNav";

/**
 * /admin/eat — the food-delivery command centre.
 *
 * Separate from the rest of /admin because it answers a different question.
 * The marketplace admin is about approving and listing things; this is about
 * a live operation: what is in flight, who is riding, whose cash is missing.
 */
export default function EatAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 lg:p-8 max-w-[1200px]">
      <div className="mb-5">
        <h1 className="font-display text-[26px] lg:text-[32px] font-bold tracking-[-0.03em] text-zinc-900">
          Eat
        </h1>
        <p className="text-[14px] text-zinc-500 mt-1">
          Food delivery and takeaway across every restaurant.
        </p>
      </div>
      <EatAdminNav />
      {children}
    </div>
  );
}
