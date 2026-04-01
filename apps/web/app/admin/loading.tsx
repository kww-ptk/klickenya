import { AdminHeaderSkeleton, AdminCardGridSkeleton, AdminListSkeleton } from "./_components/AdminSkeletons";

export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <AdminHeaderSkeleton width="w-48" />
      <AdminCardGridSkeleton count={4} />
      <AdminListSkeleton rows={4} />
    </div>
  );
}
