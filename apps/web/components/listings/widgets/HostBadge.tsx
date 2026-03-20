interface HostBadgeProps {
  hostName: string;
}

function HostBadge({ hostName }: HostBadgeProps) {
  const initials = hostName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-4 mb-7">
      <div className="size-12 rounded-full bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[16px] font-bold shrink-0">
        {initials}
      </div>
      <div>
        <p className="text-[15px] font-semibold text-text">
          Hosted by {hostName}
        </p>
        <p className="text-[13px] text-text2">Joined Klickenya</p>
      </div>
    </div>
  );
}

export { HostBadge };
export type { HostBadgeProps };
