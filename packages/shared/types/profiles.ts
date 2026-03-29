/**
 * Shared profile type hierarchy for Klickenya.
 *
 * ProfileBase → HostProfile (Sanity host doc)
 *             → AuthorProfile (Sanity author doc)
 *             → AmbassadorProfile (future)
 *
 * GuestProfile → Supabase only, no Sanity document
 */

export interface ProfileBase {
  name: string
  slug: { current: string }
  photo?: { asset?: { url?: string } }
  bio?: string
  website?: string
  instagram?: string
  facebook?: string
  twitter?: string
}

export interface HostProfile extends ProfileBase {
  _id: string
  planTier: string
  verified: boolean
  email?: string
  phone?: string
  listings?: Array<{
    _id: string
    title: string
    slug: string
    type: string
    city?: string
    isVerified?: boolean
    coverPhotoUrl?: string
  }>
  supabaseUserId?: string
  createdAt: string
}

export interface AuthorProfile extends ProfileBase {
  _id: string
  role?: string
  avatar?: { asset?: { url?: string }; alt?: string }
  posts?: Array<{
    _id: string
    title: string
    slug: string
    excerpt?: string
    coverImageUrl?: string
    publishedAt?: string
    readingTime?: number
  }>
}

/** Guest profile — Supabase only, no Sanity document */
export interface GuestProfile {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  avatar_url?: string
  created_at: string
}

/** Ambassador profile — future implementation */
export interface AmbassadorProfile extends ProfileBase {
  _id: string
  region?: string
  referralCode?: string
}
