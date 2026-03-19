import { createClient } from "./server";

// Re-declare types locally until monorepo package resolution is configured.
// Canonical types live in packages/shared/types/index.ts.
type Listing = Record<string, unknown> & { id: string; slug: string };
type BlogPost = Record<string, unknown> & { id: string; slug: string };
type ContactRequest = Record<string, unknown> & { id: string };
type Property = Record<string, unknown> & { id: string; slug: string };
type Agent = Record<string, unknown> & { id: string; slug: string };
type PropertyEnquiry = Record<string, unknown> & { id: string };

// ─── Insert types ───────────────────────────────────────────

type ContactRequestInsert = {
  listing_id?: string;
  full_name: string;
  email: string;
  phone: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  message?: string;
};

type PropertyEnquiryInsert = {
  property_id: string;
  agent_id: string;
  full_name: string;
  email: string;
  phone?: string;
  message?: string;
  enquiry_type?: string;
};

type ContactStatus = "new" | "responded" | "converted" | "closed";

// ─── Listings ───────────────────────────────────────────────

interface GetListingsParams {
  type?: string;
  city?: string;
  subcategory?: string | null;
  tags?: string[];
  status?: string;
  limit?: number;
  offset?: number;
}

export async function getListings({
  type,
  city,
  subcategory,
  tags,
  status = "published",
  limit = 20,
  offset = 0,
}: GetListingsParams = {}): Promise<Listing[]> {
  const supabase = await createClient();
  let query = supabase.from("listings").select("*").eq("status", status);

  if (type) query = query.eq("type", type);
  if (city) query = query.ilike("city", city);
  if (subcategory) query = query.eq("subcategory", subcategory);
  if (tags && tags.length > 0) query = query.contains("tags", tags);

  query = query
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function getSubcategoryCounts(type: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("subcategory")
    .eq("status", "published")
    .eq("type", type)
    .not("subcategory", "is", null);

  if (error) throw error;

  const counts: Record<string, number> = {};
  data?.forEach((row) => {
    if (row.subcategory) {
      counts[row.subcategory] = (counts[row.subcategory] || 0) + 1;
    }
  });
  return counts;
}

export async function getListingBySlug(
  type: string,
  city: string,
  slug: string
): Promise<Listing | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("type", type)
    .eq("city", city)
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Listing) ?? null;
}

export async function getListingsByOwner(ownerId: string): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Listing[];
}

// ─── Contact Requests ───────────────────────────────────────

export async function createContactRequest(
  input: ContactRequestInsert
): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .insert(input)
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function getContactRequests(
  listingId?: string
): Promise<ContactRequest[]> {
  const supabase = await createClient();
  let query = supabase.from("contact_requests").select("*");

  if (listingId) query = query.eq("listing_id", listingId);
  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ContactRequest[];
}

export async function updateContactRequestStatus(
  id: string,
  status: ContactStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_requests")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

// ─── Blog ───────────────────────────────────────────────────

export async function getBlogPosts(opts?: {
  status?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<BlogPost[]> {
  const supabase = await createClient();
  let query = supabase.from("blog_posts").select("*");

  if (opts?.status) query = query.eq("status", opts.status);
  else query = query.eq("status", "published");

  if (opts?.tag) query = query.contains("tags", [opts.tag]);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);

  query = query.order("published_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as BlogPost) ?? null;
}

// ─── Search (uses Postgres functions from migration) ────────

export async function searchListings(
  query: string,
  type?: string,
  city?: string
): Promise<Listing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_listings", {
    query,
    listing_type_filter: type ?? null,
    city_filter: city ?? null,
  });

  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function searchProperties(
  query: string,
  category?: string,
  city?: string
): Promise<Property[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_properties", {
    query,
    category_filter: category ?? null,
    city_filter: city ?? null,
  });

  if (error) throw error;
  return (data ?? []) as Property[];
}

export async function searchBlogPosts(
  query: string
): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_blog_posts", {
    query,
  });

  if (error) throw error;
  return (data ?? []) as BlogPost[];
}

// ─── Real Estate ────────────────────────────────────────────

export async function getProperties(opts?: {
  category?: string;
  city?: string;
  neighbourhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Property[]> {
  const supabase = await createClient();
  let query = supabase.from("properties").select("*");

  if (opts?.category) query = query.eq("listing_category", opts.category);
  if (opts?.city) query = query.eq("city", opts.city);
  if (opts?.neighbourhood) query = query.eq("neighbourhood", opts.neighbourhood);
  if (opts?.minPrice) query = query.gte("price", opts.minPrice);
  if (opts?.maxPrice) query = query.lte("price", opts.maxPrice);
  if (opts?.bedrooms) query = query.gte("bedrooms", opts.bedrooms);
  if (opts?.status) query = query.eq("status", opts.status);
  else query = query.eq("status", "available");

  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Property[];
}

export async function getPropertyBySlug(
  category: string,
  city: string,
  neighbourhood: string,
  slug: string
): Promise<Property | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("listing_category", category)
    .eq("city", city)
    .eq("neighbourhood", neighbourhood)
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Property) ?? null;
}

export async function createPropertyEnquiry(
  input: PropertyEnquiryInsert
): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_enquiries")
    .insert(input)
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

// ─── Agents ─────────────────────────────────────────────────

export async function getAgents(opts?: {
  city?: string;
  specialisation?: string;
  tier?: string;
  limit?: number;
}): Promise<Agent[]> {
  const supabase = await createClient();
  let query = supabase.from("agents").select("*");

  if (opts?.city) query = query.contains("service_areas", [opts.city]);
  if (opts?.specialisation) query = query.contains("specialisations", [opts.specialisation]);
  if (opts?.tier) query = query.eq("subscription_tier", opts.tier);
  if (opts?.limit) query = query.limit(opts.limit);

  query = query.order("listing_count", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Agent[];
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as Agent) ?? null;
}

// ─── Admin ──────────────────────────────────────────────────

export async function getAllContactRequests(): Promise<ContactRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContactRequest[];
}

export async function getAllPropertyEnquiries(): Promise<PropertyEnquiry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_enquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PropertyEnquiry[];
}
