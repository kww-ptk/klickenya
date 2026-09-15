import { AdminCardGridSkeleton, AdminListSkeleton } from "../_components/AdminSkeletons";

/**
 * Shown while /admin/eat (and its nested pages) fetch. The Eat heading and
 * tab nav come from layout.tsx, so this only stands in for the page body:
 * two KPI grids and the two "busiest" lists side by side.
 */
export default function EatAdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <section>
        <div className="h-3 w-24 bg-border rounded mb-2.5" />
        <AdminCardGridSkeleton count={4} />
      </section>
      <section>
        <div className="h-3 w-16 bg-border rounded mb-2.5" />
        <AdminCardGridSkeleton count={4} />
      </section>
      <div className="grid lg:grid-cols-2 gap-5">
        <section>
          <div className="h-3 w-28 bg-border rounded mb-2.5" />
          <AdminListSkeleton rows={4} />
        </section>
        <section>
          <div className="h-3 w-36 bg-border rounded mb-2.5" />
          <AdminListSkeleton rows={4} />
        </section>
      </div>
    </div>
  );
}
