"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="size-8 text-[#E8A020]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="font-display text-[20px] font-bold text-[#16130C] mb-2">
          Something went wrong
        </h2>
        <p className="text-[14px] text-[#9C9485] mb-6">
          We had trouble loading this page. This is usually temporary.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-full bg-[#E8A020] text-white font-semibold text-[14px] hover:bg-[#d4911c] transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-full border border-[#E2DDD5] text-[#9C9485] font-semibold text-[14px] hover:bg-[#F4F1EC] transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
