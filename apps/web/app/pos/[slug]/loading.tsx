/**
 * POS login skeleton — shown while the layout resolves the menu and the
 * cookie. Matches the dark POS theme so the transition is invisible.
 */
export default function PosLoginLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-pulse">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / restaurant name */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-7 w-40 rounded-lg bg-[#252019]" />
          <div className="mx-auto h-4 w-24 rounded bg-[#1A170F]" />
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-[#252019]" />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-[#1A170F]" />
          ))}
        </div>
      </div>
    </div>
  );
}
