export type EnabledModule = 'stays' | 'tours' | 'events' | 'restaurant'

export type PartnerListingType =
  | 'stay'
  | 'experience'
  | 'event'
  | 'rental'
  | 'service'

export interface PartnerImage {
  url: string | null
  alt?: string | null
}

export interface Partner {
  _id: string
  name: string
  slug: string
  domains: string[]
  logo: PartnerImage | null
  favicon: PartnerImage | null
  poweredByKlickenya: boolean
  // Theme tokens (all optional — fall back to Klickenya defaults)
  colorPrimary?: string | null
  colorAccent?: string | null
  colorDark?: string | null
  fontDisplay?: string | null
  fontBody?: string | null
  fontUrl?: string | null
  // Feature scoping
  enabledModules: EnabledModule[]
  allowedListingTypes: PartnerListingType[]
  // Content
  contactEmail?: string | null
  contactPhone?: string | null
  footerText?: string | null
  defaultCity?: string | null
}
