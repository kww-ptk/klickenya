import { AdminHeaderSkeleton, AdminTableSkeleton } from "../_components/AdminSkeletons";

export default function Loading() {
  return (
    <div className="animate-pulse">
      <AdminHeaderSkeleton width="w-32" />
      <AdminTableSkeleton rows={8} cols={9} />
    </div>
  );
}
