import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { SUBCATEGORIES_BY_TYPE } from "@/lib/constants/subcategories";
import { readFileSync } from "fs";
import { join } from "path";

const schema = z.object({
  websiteUrl: z.string().url().optional(),
  googlePlaceId: z.string().optional(),
  listingType: z.string(),
  businessName: z.string().optional(),
});

type AiAnalysis = {
  score: number;
  summary: string;
  flags: string[];
  draft: {
    title: string;
    description: string;
    city: string;
    subcategory: string;
    tags: string[];
    website: string;
    instagram: string;
    facebook: string;
    phone: string;
    email: string;
  };
};

/* ---------- Firecrawl scrape ---------- */

async function scrapeWebsite(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 15000,
      }),
    });

    if (!res.ok) return "";
    const json = await res.json();
    const markdown: string = json?.data?.markdown ?? "";
    return markdown.slice(0, 4000);
  } catch {
    return "";
  }
}

/* ---------- Google Places ---------- */

type PlaceData = {
  name: string;
  formatted_address: string;
  formatted_phone_number: string;
  website: string;
  editorial_summary?: { overview: string };
  reviews?: Array<{ text: string; rating: number }>;
  types: string[];
};

async function fetchGooglePlace(placeId: string): Promise<PlaceData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const fields = [
    "name",
    "formatted_address",
    "formatted_phone_number",
    "website",
    "editorial_summary",
    "reviews",
    "types",
  ].join(",");

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.result ?? null;
  } catch {
    return null;
  }
}

/* ---------- Load guidelines ---------- */

function loadGuidelines(): string {
  try {
    const guidelinesPath = join(process.cwd(), "..", "..", "docs", "klickenya-listing-guidelines.md");
    return readFileSync(guidelinesPath, "utf-8");
  } catch {
    return "";
  }
}

/* ---------- Anthropic analysis ---------- */

async function analyseWithAI(
  listingType: string,
  businessName: string,
  websiteContent: string,
  placeData: PlaceData | null,
  guidelines: string
): Promise<AiAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const validSubcats = SUBCATEGORIES_BY_TYPE[listingType] ?? [];

  const placeContext = placeData
    ? `
Google Places data:
- Name: ${placeData.name}
- Address: ${placeData.formatted_address}
- Phone: ${placeData.formatted_phone_number ?? "none"}
- Website: ${placeData.website ?? "none"}
- Summary: ${placeData.editorial_summary?.overview ?? "none"}
- Types: ${(placeData.types ?? []).join(", ")}
- Top reviews:
${(placeData.reviews ?? [])
  .slice(0, 3)
  .map((r) => `  "${r.text}" (${r.rating}/5)`)
  .join("\n")}
`.trim()
    : "No Google Places data available.";

  const websiteContext = websiteContent
    ? `Website content (scraped):\n${websiteContent}`
    : "No website content available.";

  const userPrompt = `
You are analysing a new business listing submission for Klickenya, a Kenya-based marketplace.

Business name: ${businessName || "Unknown"}
Listing type: ${listingType}
Valid subcategories for this type: ${validSubcats.join(", ")}

${placeContext}

${websiteContext}

Using the content guidelines below, generate a complete analysis and draft listing.

CONTENT GUIDELINES:
${guidelines}

Respond with ONLY a valid JSON object matching this exact shape — no markdown, no explanation:
{
  "score": <integer 0-100>,
  "summary": "<1-3 sentence admin summary>",
  "flags": ["flag1", "flag2"],
  "draft": {
    "title": "<listing title>",
    "description": "<80-300 word third-person description>",
    "city": "<nearest Kenyan city/town>",
    "subcategory": "<one of: ${validSubcats.join(", ")}>",
    "tags": ["tag1", "tag2", "tag3"],
    "website": "<url or empty string>",
    "instagram": "<handle without @ or empty string>",
    "facebook": "<url or empty string>",
    "phone": "<phone or empty string>",
    "email": "<email or empty string>"
  }
}
`.trim();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        system:
          "You are a listing quality analyser for a Kenyan marketplace. Output only valid JSON — no prose, no markdown fences.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const text: string = json?.content?.[0]?.text ?? "";

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned) as AiAnalysis;
  } catch {
    return null;
  }
}

/* ---------- POST ---------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const guidelines = loadGuidelines();

    // Run Firecrawl + Google Places in parallel
    const [websiteContent, placeData] = await Promise.all([
      data.websiteUrl ? scrapeWebsite(data.websiteUrl) : Promise.resolve(""),
      data.googlePlaceId ? fetchGooglePlace(data.googlePlaceId) : Promise.resolve(null),
    ]);

    const businessName =
      data.businessName ??
      placeData?.name ??
      "";

    const analysis = await analyseWithAI(
      data.listingType,
      businessName,
      websiteContent,
      placeData,
      guidelines
    );

    if (!analysis) {
      return NextResponse.json(
        { error: "AI analysis unavailable. Please fill in the form manually." },
        { status: 503 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    console.error("AI analyse error:", err);
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}
