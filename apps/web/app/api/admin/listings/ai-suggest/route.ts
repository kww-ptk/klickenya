import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { TAG_SUGGESTIONS_BY_TYPE, TAG_SUGGESTIONS, AMENITIES } from "@/lib/constants/listing";

const schema = z.object({
  title: z.string().min(2),
  type: z.string().min(1),
  subcategory: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
});

type AiSuggestion = {
  description: string;
  tags: string[];
  amenities: string[];
  seoTitle: string;
  seoDescription: string;
  priceSuggestion: string;
};

export async function POST(req: NextRequest) {
  try {
    await assertAdmin(req);

    const body = await req.json();
    const data = schema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured." }, { status: 503 });
    }

    /* Build the tag pool relevant to this listing */
    const tagKey =
      data.subcategory === "restaurants" ? "restaurants" : (data.type ?? "stay");
    const relevantTags = TAG_SUGGESTIONS_BY_TYPE[tagKey] ?? TAG_SUGGESTIONS.slice(0, 40);

    const prompt = `You are helping an admin populate a business listing on Klickenya, Kenya's marketplace.

Listing details:
- Title: ${data.title}
- Type: ${data.type}${data.subcategory ? ` / ${data.subcategory}` : ""}
- City: ${data.city || "Kenya"}
- Existing description: ${data.description?.trim() || "(none — please write one)"}

Generate a JSON response with EXACTLY these fields:
{
  "description": "Compelling, factual 100-200 word description. Write in third person. Highlight what makes it unique, who it suits, and the experience. Don't repeat the title. Kenya-specific context where relevant.",
  "tags": ["5-10 tags chosen ONLY from the approved list below"],
  "amenities": ["2-6 amenities chosen ONLY from the approved amenities list below"],
  "seoTitle": "SEO page title, max 60 chars, include city and type",
  "seoDescription": "Meta description for search results, max 160 chars, compelling and specific",
  "priceSuggestion": "Realistic price range in KES, e.g. 'KSh 8,000–15,000 per night' or 'KSh 500–1,500 per person'"
}

Approved tags (pick ONLY from this list):
${relevantTags.join(", ")}

Approved amenities (pick ONLY from this list):
${AMENITIES.join(", ")}

Rules:
- description: if an existing description is provided, improve and expand it; otherwise write a fresh one
- tags: only values from the approved list above, no invented tags
- amenities: only values from the approved amenities list, only include ones that genuinely apply
- seoTitle: natural, not keyword-stuffed
- Return ONLY valid JSON, no markdown, no extra text`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error("Anthropic error:", await anthropicRes.text());
      return NextResponse.json({ error: "AI request failed." }, { status: 502 });
    }

    const anthropicData = await anthropicRes.json();
    const raw: string = anthropicData.content?.[0]?.text ?? "";
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let suggestion: AiSuggestion;
    try {
      suggestion = JSON.parse(jsonText);
    } catch {
      console.error("AI JSON parse failed:", jsonText);
      return NextResponse.json({ error: "AI returned unexpected format." }, { status: 502 });
    }

    /* Sanitise — only return tags/amenities that are actually in our approved lists */
    suggestion.tags = (suggestion.tags ?? []).filter((t: string) =>
      TAG_SUGGESTIONS.includes(t) || relevantTags.includes(t)
    );
    suggestion.amenities = (suggestion.amenities ?? []).filter((a: string) =>
      AMENITIES.includes(a)
    );
    suggestion.seoTitle = (suggestion.seoTitle ?? "").slice(0, 60);
    suggestion.seoDescription = (suggestion.seoDescription ?? "").slice(0, 160);

    return NextResponse.json({ suggestion });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    console.error("AI suggest error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
