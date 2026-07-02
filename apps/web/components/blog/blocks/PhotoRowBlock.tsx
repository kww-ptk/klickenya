import Image from 'next/image'

interface PhotoItem { asset?: { url?: string }; alt?: string; aspectRatio?: 'wide' | 'tall' | 'square' | 'cinema' }
interface PhotoRowValue { layout?: 'cols-2' | 'cols-3' | 'cols-3-rev' | 'hero-full'; photos?: PhotoItem[]; caption?: string }

export function PhotoRowBlock({ value }: { value: PhotoRowValue }) {
  const { layout = 'cols-2', photos = [], caption } = value
  const gridClass = {
    'cols-2': 'grid-cols-2',
    'cols-3': 'grid-cols-[2fr_1fr_1fr]',
    'cols-3-rev': 'grid-cols-[1fr_1fr_2fr]',
    'hero-full': 'grid-cols-1',
  }[layout]
  const aspectClass = { wide: 'aspect-[16/9]', tall: 'aspect-[3/4]', square: 'aspect-square', cinema: 'aspect-[21/9]' }

  return (
    <div className="my-10">
      <div className={`grid gap-2.5 ${gridClass} max-md:grid-cols-2 max-sm:grid-cols-1`}>
        {photos.map((photo, i) => (
          <div key={i} className={`rounded-[22px] overflow-hidden bg-[#EDEAE4] ${aspectClass[photo.aspectRatio || 'wide']} relative group`}>
            {photo.asset?.url && (
              <Image
                src={photo.asset.url}
                alt={photo.alt || ''}
                fill
                className="object-cover transition-transform duration-600 group-hover:scale-[1.04]"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={85}
              />
            )}
          </div>
        ))}
      </div>
      {caption && <p className="text-[12.5px] text-[#9B9589] mt-2.5 italic text-center">{caption}</p>}
    </div>
  )
}
