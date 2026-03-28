/**
 * GoHighLevel REST API integration.
 * Creates contacts and manages opportunities in the GHL pipeline.
 * No-op if GHL_API_KEY is not set — safe to call unconditionally.
 */

const GHL_BASE = "https://services.leadconnectorhq.com";

function ghlHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    Version: "2021-07-28",
  };
}

function isConfigured(): boolean {
  return !!process.env.GHL_API_KEY;
}

/* ---------- Pipeline stage IDs ---------- */

export const GHL_STAGES = {
  SCRAPED: process.env.GHL_STAGE_SCRAPED_ID!,
  CONTACTED: process.env.GHL_STAGE_CONTACTED_ID!,
  OPENED: process.env.GHL_STAGE_OPENED_ID!,
  CLAIMED: process.env.GHL_STAGE_CLAIMED_ID!,
  ACTIVE: process.env.GHL_STAGE_ACTIVE_ID!,
  PAYING: process.env.GHL_STAGE_PAYING_ID!,
  LOST: process.env.GHL_STAGE_LOST_ID!,
} as const;

/* ---------- Create or update contact ---------- */

export async function createOrUpdateContact(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): Promise<string | null> {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        locationId: process.env.GHL_LOCATION_ID,
      }),
    });

    const json = await res.json();
    return json.contact?.id ?? null;
  } catch {
    console.error("GHL createOrUpdateContact failed");
    return null;
  }
}

/* ---------- Create or update opportunity ---------- */

export async function createOrUpdateOpportunity(
  contactId: string,
  data: {
    stageId: string;
    listingName: string;
    listingUrl: string;
  }
): Promise<string | null> {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(`${GHL_BASE}/opportunities/`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({
        pipelineId: process.env.GHL_PIPELINE_ID,
        pipelineStageId: data.stageId,
        contactId,
        name: data.listingName,
        customFields: [
          { key: "plan_tier", field_value: "Basic" },
          { key: "total_listings", field_value: 1 },
          { key: "first_listing_name", field_value: data.listingName },
          { key: "first_listing_url", field_value: data.listingUrl },
        ],
      }),
    });

    const json = await res.json();
    return json.opportunity?.id ?? null;
  } catch {
    console.error("GHL createOrUpdateOpportunity failed");
    return null;
  }
}

/* ---------- Update opportunity stage ---------- */

export async function updateOpportunityStage(
  opportunityId: string,
  stageId: string
): Promise<void> {
  if (!isConfigured()) return;

  try {
    await fetch(`${GHL_BASE}/opportunities/${opportunityId}`, {
      method: "PUT",
      headers: ghlHeaders(),
      body: JSON.stringify({
        pipelineStageId: stageId,
      }),
    });
  } catch {
    console.error("GHL updateOpportunityStage failed");
  }
}
