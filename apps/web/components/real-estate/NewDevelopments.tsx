import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/real-estate/format';
import { propertyPath } from '@/lib/real-estate/constants';

interface Development {
  title: string;
  slug: string;
  developerName?: string;
  city: string;
  neighbourhood: string;
  price: number;
  currency?: string;
  completionPercentage?: number;
  unitsAvailable?: number;
  coverPhoto?: string;
  isNewDevelopment?: boolean;
}

interface NewDevelopmentsProps {
  developments: Development[];
}

function NewDevelopments({ developments }: NewDevelopmentsProps) {
  return (
    <div className="flex gap-4.5 overflow-x-auto scrollbar-none pb-1">
      {developments.map((dev) => (
        <Link
          key={dev.slug}
          href={propertyPath(dev.slug)}
          className="shrink-0 w-[320px] bg-white border border-border rounded-[22px] overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
        >
          {/* Media */}
          <div className="relative h-[200px] overflow-hidden bg-surface2">
            {dev.coverPhoto && (
              <Image
                src={dev.coverPhoto}
                alt={dev.title}
                fill
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                sizes="320px"
              />
            )}

            {/* New Development badge */}
            {dev.isNewDevelopment && (
              <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-blue-500/[0.88] text-white text-[11px] font-bold backdrop-blur-[8px]">
                New Development
              </span>
            )}

            {/* Completion bar */}
            {dev.completionPercentage != null && (
            <div className="absolute bottom-0 left-0 right-0 bg-dark/70 backdrop-blur-[6px] px-3.5 py-2 flex items-center gap-2.5">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber"
                  style={{ width: `${Math.min(100, dev.completionPercentage ?? 0)}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-amber shrink-0">
                {dev.completionPercentage}%
              </span>
            </div>
            )}
          </div>

          {/* Body */}
          <div className="p-4">
            {dev.developerName && (
              <p className="text-[11.5px] font-semibold text-purple2 uppercase tracking-[0.04em] mb-1">
                {dev.developerName}
              </p>
            )}
            <h3 className="text-[16px] font-bold text-text tracking-[-0.01em] mb-1">
              {dev.title}
            </h3>
            <p className="text-[13px] text-text3 mb-3">
              📍 {dev.neighbourhood}, {dev.city}
            </p>
            <p className="text-[15px] font-bold text-text">
              From {formatPrice(dev.price, dev.currency)}
              <span className="text-text3 font-normal text-[12.5px]"> · per unit</span>
            </p>
            {dev.unitsAvailable != null && dev.unitsAvailable > 0 && (
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-surface border border-border text-[11.5px] font-semibold text-text2">
                {dev.unitsAvailable} {dev.unitsAvailable === 1 ? 'unit' : 'units'} available
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export { NewDevelopments };
export type { NewDevelopmentsProps, Development };
