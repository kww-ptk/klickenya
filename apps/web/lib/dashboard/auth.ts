import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

export class HostAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the request is from an authenticated host who owns the listing
 * associated with the given enquiry. Returns the user and contact request.
 */
export async function assertHostOwnsEnquiry(
  request: NextRequest,
  enquiryId: string
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new HostAuthError("Not authenticated", 401);

  // Fetch host profile
  const { data: hostProfile } = await adminClient
    .from("host_profiles")
    .select("user_id, sanity_host_id")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile) throw new HostAuthError("Not a host", 403);

  // Fetch the contact request
  const { data: contactRequest } = await adminClient
    .from("contact_requests")
    .select("*")
    .eq("id", enquiryId)
    .single();

  if (!contactRequest) throw new HostAuthError("Enquiry not found", 404);

  // Verify the listing belongs to this host via Sanity
  if (!contactRequest.listing_sanity_id) {
    throw new HostAuthError("Enquiry has no linked listing", 403);
  }

  const ownerCheck = await sanityClient.fetch<string | null>(
    `*[_type == "listing" && _id == $listingId && (hostId == $hostId || host._ref == $sanityHostId)][0]._id`,
    {
      listingId: contactRequest.listing_sanity_id,
      hostId: hostProfile.user_id,
      sanityHostId: hostProfile.sanity_host_id ?? "",
    }
  );

  if (!ownerCheck) throw new HostAuthError("Forbidden", 403);

  return { user, contactRequest, hostProfile };
}
