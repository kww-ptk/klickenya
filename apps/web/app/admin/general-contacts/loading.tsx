import { AdminHeaderSkeleton, AdminTableSkeleton } from "../_components/AdminSkeletons";

export default function Loading() {
  return (
    <div className="animate-pulse">
      <AdminHeaderSkeleton />
      <AdminTableSkeleton rows={6} cols={4} />
    </div>
  );
}
