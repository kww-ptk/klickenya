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
    const body = {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: data.email,
      phone: data.phone,
      locationId: process.env.GHL_LOCATION_ID,
    };
    console.log("[GHL] createOrUpdateContact request:", JSON.stringify(body));

    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("[GHL] createOrUpdateContact error:", res.status, JSON.stringify(json));
      return null;
    }
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
    const payload = {
      pipelineId: process.env.GHL_PIPELINE_ID,
      locationId: process.env.GHL_LOCATION_ID,
      name: data.listingName,
      pipelineStageId: data.stageId,
      status: "open",
      contactId,
    };
    console.log("[GHL] Creating opportunity with payload:", JSON.stringify(payload));

    const res = await fetch(`${GHL_BASE}/opportunities/`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    console.log("[GHL] Opportunity status:", res.status);
    console.log("[GHL] Opportunity response:", JSON.stringify(json));

    if (!res.ok) return null;
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
