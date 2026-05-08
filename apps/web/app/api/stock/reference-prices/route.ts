import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

/* ── GET — platform-wide median prices ──────────────────
 *
 * Reads the v_platform_ingredient_prices view, which is built on top of
 * stock_movements (purchase_in only, last 180 days, k-anonymised at >= 3
 * distinct businesses). Caller authentication is required, but the data
 * itself is NOT scoped to the caller's business -- it's the cross-platform
 * benchmark.
 *
 * Caller can pass ?q=... to filter by canonical name substring.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";

  let query = supabase
    .from("v_platform_ingredient_prices")
    .select("canonical_name, unit, restaurant_count, sample_size, median_kes, p25_kes, p75_kes, min_kes, max_kes, last_seen_at")
    .order("canonical_name", { ascending: true })
    .limit(500);
  if (q) query = query.ilike("canonical_name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

/* ── POST — ask Claude for a list of common Kenyan prices ──
 *
 * Used by the "Suggest common prices" button on the reference-prices
 * page. Returns a curated list with estimated KES per gram (or per
 * unit) for typical Kenyan coastal restaurant ingredients. Marked as
 * source='ai_estimate' so the UI can label them clearly.
 *
 * Same rate limit as the recipe draft: 5 calls/min/business, in-memory.
 */

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

function takeRateSlot(businessId: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(businessId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) {
    buckets.set(businessId, arr);
    return false;
  }
  arr.push(now);
  buckets.set(businessId, arr);
  return true;
}

const aiBodySchema = z.object({
  // Optional list of names the caller wants priced. If empty, the model
  // returns a default list of common Kenyan restaurant ingredients.
  names: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!takeRateSlot(user.id)) {
    return NextResponse.json(
      { error: "Slow down — only 5 AI suggestions per minute. Try again in a moment." },
      { status: 429 },
    );
  }

  const parsed = aiBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const requestedNames = parsed.data.names ?? [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const systemPrompt = `You are a sourcing analyst for restaurants on the Kenyan coast (Watamu / Malindi / Diani / Mombasa).
Return a JSON list of typical 2025 buying prices in KES, per gram or per millilitre, for common kitchen ingredients.

Return ONLY valid JSON — no markdown, no commentary, no code fences.

Schema:
{
  "rows": [
    {
      "canonical_name": "chicken thigh",
      "unit": "g",
      "median_kes": 0.5,
      "p25_kes": 0.45,
      "p75_kes": 0.6,
      "notes": "boneless skinless, supermarket pack"
    }
  ]
}

Rules:
- canonical_name lower-case, singular (e.g. 'chicken thigh' not 'Chicken Thighs').
- unit must be 'g' for solids or 'ml' for liquids.
- Prices are KES per ONE gram or ONE millilitre. Numbers are mostly 0.05–5.
  Examples (rough): chicken thigh ~0.50, basmati rice ~0.20, tomato ~0.15,
  white onion ~0.10, garlic ~1.0, olive oil ~0.6, parmesan ~3.0, butter ~1.0,
  octopus ~1.5, snapper fillet ~1.6, prawn ~2.5, cheddar ~1.5.
- p25_kes <= median_kes <= p75_kes always. Reasonable spread, not extreme.
- 12–24 rows in the default response. If the caller passed names, return one row per name.
- notes is a short string (or "") — supermarket pack vs market vs wholesaler hint.
- Use only ingredients you can plausibly justify. Do not invent prices for exotic items
  the user wouldn't actually buy in coastal Kenya.`;

  const userPayload =
    requestedNames.length > 0
      ? JSON.stringify({ requested_names: requestedNames })
      : "Return a default list of common Kenyan coastal restaurant ingredients.";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPayload }],
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "AI timed out" : "AI service error" },
      { status: 504 },
    );
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("reference-prices anthropic error", res.status, body);
    return NextResponse.json({ error: "AI service returned an error" }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";

  let parsedJson: { rows?: unknown };
  try {
    parsedJson = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: "AI returned non-JSON" }, { status: 422 });
    }
    try {
      parsedJson = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ error: "AI returned malformed JSON" }, { status: 422 });
    }
  }

  const rowSchema = z.object({
    canonical_name: z.string().trim().min(1).max(120),
    unit: z.enum(["g", "ml"]),
    median_kes: z.coerce.number().gt(0).max(10_000),
    p25_kes: z.coerce.number().gt(0).max(10_000).optional().nullable(),
    p75_kes: z.coerce.number().gt(0).max(10_000).optional().nullable(),
    notes: z.string().max(200).optional().nullable(),
  });
  const parsedRows = z
    .object({ rows: z.array(rowSchema).max(50) })
    .safeParse(parsedJson);
  if (!parsedRows.success) {
    return NextResponse.json({ error: "AI returned an unexpected shape" }, { status: 422 });
  }

  console.log(
    JSON.stringify({
      event: "stock_reference_prices_ai",
      business_id: user.id,
      requested: requestedNames.length,
      returned: parsedRows.data.rows.length,
      ts: new Date().toISOString(),
    }),
  );

  return NextResponse.json({
    rows: parsedRows.data.rows.map((r) => ({
      canonical_name: r.canonical_name.toLowerCase(),
      unit: r.unit,
      median_kes: r.median_kes,
      p25_kes: r.p25_kes ?? null,
      p75_kes: r.p75_kes ?? null,
      notes: r.notes ?? null,
      source: "ai_estimate" as const,
    })),
  });
}
