import { AdminHeaderSkeleton, AdminListSkeleton } from "../../_components/AdminSkeletons";

export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-[#F4F1EC] rounded mb-6" />
      <AdminHeaderSkeleton />
      <AdminListSkeleton rows={3} />
    </div>
  );
}
