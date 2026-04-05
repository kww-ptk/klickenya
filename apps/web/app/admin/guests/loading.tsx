import { AdminHeaderSkeleton, AdminTableSkeleton } from "../_components/AdminSkeletons";

export default function Loading() {
  return (
    <div className="animate-pulse">
      <AdminHeaderSkeleton width="w-24" />
      <AdminTableSkeleton rows={6} cols={6} />
    </div>
  );
}
