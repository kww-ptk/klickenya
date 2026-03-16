export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F7F5F2] flex items-center justify-center relative overflow-hidden">
      {/* Subtle swoosh decoration */}
      <svg
        className="absolute bottom-0 left-0 w-[500px] opacity-[0.06] pointer-events-none"
        viewBox="0 0 500 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 80 C120 120, 280 20, 500 60"
          stroke="#E8A020"
          strokeWidth="3"
          fill="none"
        />
      </svg>
      {children}
    </div>
  );
}
