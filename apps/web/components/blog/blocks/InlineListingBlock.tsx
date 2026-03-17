import Image from 'next/image'
import Link from 'next/link'

interface InlineListingValue {
  listing?: {
    _id?: string
    title?: string
    slug?: { current?: string }
    type?: string
    city?: string
    price?: number
    priceUnit?: string
    coverPhoto?: { asset?: { url?: string }; alt?: string }
    tags?: string[]
  }
  label?: string
}

export function InlineListingBlock({ value }: { value: InlineListingValue }) {
  const listing = value.listing
  if (!listing) return null

  const slug = listing.slug?.current
  const typeLabel = listing.type?.replace(/-/g, ' ') || 'Stay'
  const href = slug ? `/${listing.type}/${(listing.city || '').toLowerCase()}/${slug}` : '#'

  return (
    <Link href={href} className="flex gap-3.5 items-center p-3.5 rounded-[22px] border border-[#E4E0D8] bg-white my-2.5 transition-all hover:shadow-[0_2px_10px_rgba(0,0,0,.06),0_0_0_1px_rgba(0,0,0,.03)] hover:-translate-y-0.5 group">
      <div className="w-[68px] h-[68px] rounded-[16px] overflow-hidden shrink-0 bg-[#EDEAE4] relative">
        {listing.coverPhoto?.asset?.url && (
          <Image src={listing.coverPhoto.asset.url} alt={listing.coverPhoto.alt || listing.title || ''} fill className="object-cover" sizes="68px" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] font-extrabold tracking-[.06em] uppercase text-[#E8A020] mb-0.5">{value.label || typeLabel}</p>
        <p className="text-[14px] font-bold text-[#18160F] mb-0.5 truncate">{listing.title}</p>
        <p className="text-[12.5px] text-[#9B9589]">{listing.city}{listing.tags?.length ? ` · ${listing.tags[0]}` : ''}</p>
      </div>
      {listing.price && (
        <div className="shrink-0 text-right">
          <span className="font-[family-name:'Bricolage_Grotesque'] text-[16px] font-extrabold text-[#18160F] block">KSh {listing.price.toLocaleString()}</span>
          {listing.priceUnit && <span className="text-[11px] text-[#9B9589]">/ {listing.priceUnit}</span>}
        </div>
      )}
      <span className="shrink-0 py-[7px] px-3.5 rounded-full bg-[#18160F] text-white text-[12.5px] font-bold whitespace-nowrap transition-opacity group-hover:opacity-80">
        View →
      </span>
    </Link>
  )
}
