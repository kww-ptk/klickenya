// ─── Profiles ───────────────────────────────────────────────────

export type { ProfileBase, HostProfile, AuthorProfile, GuestProfile, AmbassadorProfile } from './profiles'

// ─── Enums ──────────────────────────────────────────────────────

export type ListingType = 'stay' | 'experience' | 'event' | 'rental' | 'service' | 'restaurant'

export type ListingStatus = 'draft' | 'published' | 'archived'

export type UserRole = 'admin' | 'host' | 'guest'

export type BookingType = 'contact_form' | 'instant' | 'request'

// ─── Subcategories ──────────────────────────────────────────────

export type StaySubcategory =
  | 'villa'
  | 'private_room'
  | 'boutique_hotel'
  | 'lodge_camp'
  | 'hostel'
  | 'unique_stay'

export type ExperienceSubcategory =
  | 'safari'
  | 'outdoor'
  | 'beaches'
  | 'restaurants'
  | 'cultural'
  | 'wellness'
  | 'family'

export type EventSubcategory =
  | 'parties'
  | 'festival'
  | 'art_culture'
  | 'wellness_sport'
  | 'networking'
  | 'kids'
  | 'other'

export type ServiceSubcategory =
  | 'rentals'
  | 'transfers'
  | 'private_chef'
  | 'wellness_service'
  | 'supermarkets'
  | 'pharmacy'
  | 'fundis'
  | 'it_marketing'
  | 'utility_shops'

export type RealEstateSubcategory =
  | 'for_sale'
  | 'land_plots'
  | 'commercial'
  | 'new_developments'

export type ListingSubcategory =
  | StaySubcategory
  | ExperienceSubcategory
  | EventSubcategory
  | ServiceSubcategory
  | RealEstateSubcategory

export type PriceUnit = 'night' | 'person' | 'day' | 'session' | 'ticket'

export type PropertyCategory = 'for-sale' | 'for-rent' | 'land' | 'commercial'

export type PropertyType = 'apartment' | 'house' | 'villa' | 'studio' | 'townhouse' | 'land' | 'commercial'

export type PropertyStatus = 'available' | 'under-offer' | 'sold' | 'let' | 'draft'

export type AgentTier = 'free' | 'basic' | 'pro' | 'agency'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PortableTextBlock = any

// ─── Sanity Primitives ──────────────────────────────────────────

export interface SanityImage {
  asset: {
    _id: string
    url: string
    metadata: { dimensions: { width: number; height: number } }
  }
  alt?: string
  hotspot?: { x: number; y: number }
  crop?: { top: number; bottom: number; left: number; right: number }
}

export interface RoomType {
  _key: string
  roomName: string
  roomDescription?: any
  photos?: SanityImage[]
  pricePerNight: number
  capacity: number
  bedType?: string
  roomSizeSqm?: number
  roomAmenities?: string[]
  isAvailable: boolean
  quantity?: number
}

export interface SanitySlug {
  current: string
  _type: 'slug'
}

export interface SanityReference {
  _ref: string
  _type: 'reference'
}

/** Host reference from Sanity (expanded from host->) */
export interface HostRef {
  _id: string
  name: string
  slug: string
  photo?: SanityImage
  bio?: string
  website?: string
  instagram?: string
  facebook?: string
  planTier?: string
  verified?: boolean
}

// ─── Sanity Document Types ──────────────────────────────────────

/** Listing from Sanity (card fields) */
export interface SanityListing {
  _id: string
  title: string
  slug: SanitySlug
  type: ListingType
  subcategory?: ListingSubcategory
  status: ListingStatus
  city: string
  county?: string
  price: number
  priceUnit: PriceUnit
  priceRange?: string
  coverPhoto?: SanityImage
  tags: string[]
  avgRating?: number
  reviewCount?: number
  openingHours?: string
  hostName?: string
  isVerified?: boolean
  verificationStatus?: 'pending' | 'claimed' | 'verified'
  hostRef?: HostRef
}

/** Full listing (detail page) */
export interface SanityListingFull extends SanityListing {
  description?: PortableTextBlock[]
  photos: SanityImage[]
  amenities?: string[]
  address?: string
  maxGuests?: number
  bookingType: BookingType
  hostName?: string
  hostRef?: HostRef
  highlights?: Array<{ emoji: string; title: string; description: string }>
  cuisine?: string[]
  priceRange?: 'budget' | 'mid-range' | 'fine-dining'
  openingHours?: string
  reservationRequired?: boolean
  seoTitle?: string
  seoDescription?: string
}

/** Property from Sanity (card fields) */
export interface SanityProperty {
  _id: string
  title: string
  slug: SanitySlug
  listingCategory: PropertyCategory
  propertyType?: PropertyType
  status: PropertyStatus
  price: number
  priceType: 'total' | 'per-month'
  bedrooms?: number
  bathrooms?: number
  sizeSqm?: number
  neighbourhood: string
  city: string
  coverPhoto?: SanityImage
}

/** Full property (detail page) */
export interface SanityPropertyFull extends SanityProperty {
  description?: PortableTextBlock[]
  photos: SanityImage[]
  features?: string[]
  landSizeAcres?: number
  yearBuilt?: number
  county?: string
  lat?: number
  lng?: number
  isNewDevelopment?: boolean
  isFeatured?: boolean
  previousPrice?: number
  completionPercentage?: number
  developerName?: string
  unitsAvailable?: number
  agent?: SanityAgent
  seoTitle?: string
  seoDescription?: string
}

/** Blog post (card) */
export interface SanityBlogPost {
  _id: string
  title: string
  slug: SanitySlug
  excerpt: string
  coverImage: SanityImage
  tags?: string[]
  publishedAt: string
  readingTime?: number
  author: { name: string; avatar?: SanityImage }
}

/** Blog post (full) */
export interface SanityBlogPostFull extends SanityBlogPost {
  body: PortableTextBlock[]
  relatedListings?: SanityListing[]
  seoTitle?: string
  seoDescription?: string
}

/** Agent */
export interface SanityAgent {
  _id: string
  displayName: string
  slug: SanitySlug
  photo?: SanityImage
  agencyName?: string
  licenceNumber?: string
  isVerified: boolean
  bio?: string
  phone?: string
  email?: string
  specialisations?: string[]
  serviceAreas?: string[]
  subscriptionTier: AgentTier
}

/** Destination */
export interface SanityDestination {
  _id: string
  name: string
  slug: SanitySlug
  heroImage: SanityImage
  tagline?: string
  description?: PortableTextBlock[]
  highlights?: Array<{ icon: string; text: string }>
  county?: string
  relatedListings?: SanityListing[]
}

/** Neighbourhood */
export interface SanityNeighbourhood {
  _id: string
  name: string
  slug: SanitySlug
  city: string
  heroImage: SanityImage
  tagline?: string
  description?: PortableTextBlock[]
  avgPriceForSale?: number
  avgPriceForRent?: number
  avgPriceSqm?: number
  avgRentalYield?: number
  highlights?: string[]
  commuteInfo?: string
  relatedProperties?: SanityProperty[]
}

/** Site settings */
export interface SanitySettings {
  siteName: string
  tagline?: string
  contactEmail?: string
  contactPhone?: string
  primaryCTA?: string
  heroImages?: SanityImage[]
  navLinks?: Array<{ label: string; href: string; isExternal?: boolean }>
  footerColumns?: Array<{
    heading: string
    links: Array<{ label: string; href: string }>
  }>
  socialLinks?: {
    twitter?: string
    instagram?: string
    facebook?: string
    linkedin?: string
    whatsapp?: string
  }
  stats?: Array<{ value: string; label: string }>
}

// ─── Database Interfaces (Supabase) ────────────────────────────

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Listing {
  id: string
  sanity_id?: string
  type: ListingType
  subcategory?: ListingSubcategory
  status: ListingStatus
  title: string
  slug: string
  description: string
  short_description?: string
  tags: string[]
  destination: string
  city: string
  neighbourhood?: string
  address?: string
  latitude?: number
  longitude?: number
  price: number
  price_unit: string
  currency: string
  images: string[]
  amenities?: string[]
  highlights?: { title: string; description: string; icon?: string }[]
  host_id?: string
  host_name?: string
  host_avatar?: string
  rating?: number
  review_count?: number
  max_guests?: number
  bedrooms?: number
  beds?: number
  bathrooms?: number
  event_date?: string
  event_end_date?: string
  event_venue?: string
  event_organiser?: string
  duration_hours?: number
  group_size?: number
  languages?: string[]
  rentingType?: 'entire_place' | 'by_room' | 'both'
  rooms?: RoomType[]
  embedding?: number[]
  created_at: string
  updated_at: string
  published_at?: string
}

export interface BlogPost {
  id: string
  sanity_id?: string
  title: string
  slug: string
  excerpt: string
  cover_image: string
  author_name: string
  author_avatar?: string
  category: string
  tags: string[]
  read_time_minutes: number
  published_at: string
  embedding?: number[]
  created_at: string
  updated_at: string
}

export interface ContactRequest {
  id: string
  listing_id?: string
  listing_title?: string
  listing_type?: ListingType
  name: string
  email: string
  phone?: string
  message: string
  check_in?: string
  check_out?: string
  guests?: number
  booking_type: BookingType
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  sanity_id?: string
  type: PropertyCategory
  status: PropertyStatus
  title: string
  slug: string
  description: string
  city: string
  neighbourhood: string
  address?: string
  latitude?: number
  longitude?: number
  price: number
  currency: string
  price_per_sqft?: number
  bedrooms?: number
  bathrooms?: number
  parking_spaces?: number
  floor_area_sqft?: number
  plot_size_sqft?: number
  year_built?: number
  features: string[]
  images: string[]
  agent_id?: string
  agent_name?: string
  agent_phone?: string
  agent_avatar?: string
  embedding?: number[]
  created_at: string
  updated_at: string
  published_at?: string
}

export interface Agent {
  id: string
  name: string
  email: string
  phone: string
  avatar_url?: string
  company?: string
  bio?: string
  licence_number?: string
  verified: boolean
  listing_count: number
  created_at: string
}

export interface PropertyEnquiry {
  id: string
  property_id: string
  property_title: string
  agent_id: string
  name: string
  email: string
  phone?: string
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string
  action: string
  entity_type: string
  entity_id: string
  metadata?: Record<string, unknown>
  created_at: string
}
