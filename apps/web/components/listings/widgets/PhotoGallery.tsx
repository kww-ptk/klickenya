import Image from "next/image";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
}

function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="rounded-[32px] overflow-hidden mb-10">
        <div className="aspect-[16/9] bg-surface2 flex items-center justify-center">
          <span className="text-[48px]">📷</span>
        </div>
      </div>
    );
  }

  if (photos.length >= 5) {
    return (
      <div className="rounded-[32px] overflow-hidden mb-10">
        <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[420px] md:h-[480px]">
          {/* Main image */}
          <div className="col-span-2 row-span-2 relative">
            <Image
              src={photos[0]}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          {photos.slice(1, 5).map((photo, i) => (
            <div key={i} className="relative">
              <Image
                src={photo}
                alt={`${title} photo ${i + 2}`}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] overflow-hidden mb-10">
      <div className="relative aspect-[16/9] md:aspect-[2.2/1]">
        <Image
          src={photos[0]}
          alt={title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
    </div>
  );
}

export { PhotoGallery };
export type { PhotoGalleryProps };
