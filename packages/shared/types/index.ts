// ─── Enums ──────────────────────────────────────────────────────

export type ListingType = 'stay' | 'experience' | 'event' | 'rental' | 'service'

export type ListingStatus = 'draft' | 'published' | 'archived'

export type UserRole = 'admin' | 'host' | 'guest'

export type BookingType = 'contact_form' | 'instant' | 'request'

export type PropertyType = 'for-sale' | 'for-rent' | 'land'

export type PropertyStatus = 'available' | 'under-offer' | 'sold' | 'let'

// ─── Database Interfaces ────────────────────────────────────────

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
  status: ListingStatus
  title: string
  slug: string
  description: string
  short_description?: string
  destination: string
  city: string
  neighbourhood?: string
  address?: string
  latitude?: number
  longitude?: number
  price: number
  price_unit: string // e.g. "night", "person", "ticket", "day"
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
  // Event-specific
  event_date?: string
  event_end_date?: string
  event_venue?: string
  event_organiser?: string
  // Experience-specific
  duration_hours?: number
  group_size?: number
  languages?: string[]
  // AI-ready (V2)
  embedding?: number[]
  // Timestamps
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
  // AI-ready (V2)
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
  type: PropertyType
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
  // AI-ready (V2)
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
