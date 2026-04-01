import { AdminHeaderSkeleton, AdminCardGridSkeleton } from "../_components/AdminSkeletons";

export default function Loading() {
  return (
    <div className="animate-pulse">
      <AdminHeaderSkeleton width="w-32" />
      <AdminCardGridSkeleton count={4} />
      <div className="bg-white rounded-xl border border-[#E2DDD5] p-5 mb-6">
        <div className="h-5 w-32 bg-[#E2DDD5] rounded mb-4" />
        <div className="h-48 bg-[#F4F1EC] rounded-lg" />
      </div>
    </div>
  );
}
