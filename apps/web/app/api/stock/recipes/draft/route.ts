import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/* ── Schemas ─────────────────────────────────────────── */

const requestSchema = z.object({
  item_name: z.string().trim().min(1).max(200),
  item_description: z.string().trim().min(1).max(2000),
  existing_pantry: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().max(200),
        unit: z.string().max(20),
      }),
    )
    .max(500)
    .default([]),
});

/* ── Rate limiter (per-business, in-memory, 5/min) ───── */
//
// Process-local — fine for V0 because draft generation is a low-volume,
// human-driven action. If we move to multiple Vercel regions or want
// cross-region accuracy, swap to a Redis-backed limiter.

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

/* ── POST ────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!takeRateSlot(user.id)) {
    return NextResponse.json(
      { error: "Slow down — only 5 drafts per minute. Try again in a moment." },
      { status: 429 },
    );
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { item_name, item_description, existing_pantry } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI draft not configured" }, { status: 503 });
  }

  // Trim the pantry list passed to the model to keep the context small
  // and reduce cost. Names + ids only.
  const pantryForPrompt = existing_pantry.slice(0, 200);

  const systemPrompt = `You are a chef-grade recipe drafter for a Kenyan restaurant.
Given a dish name and a short menu description, return a plausible ingredient list as JSON only.
You will also be given the restaurant's current pantry. Whenever an ingredient already exists in the pantry,
return that ingredient's pantry id in matched_pantry_id. Otherwise return null.

Return ONLY valid JSON — no markdown, no commentary, no code fences.

Schema:
{
  "ingredients": [
    {
      "name": "Ingredient name (Title Case, singular, e.g. 'Chicken thigh')",
      "ep_qty_g": 120,             // edible-portion quantity in GRAMS (or millilitres for liquids)
      "yield_pct": 100,             // expected usable portion after trim/cooking, 1–100
      "matched_pantry_id": null     // pantry id if matched, else null
    }
  ]
}

Rules:
- Quantities are PER PORTION (per single serving).
- ep_qty_g must be a positive number; for liquids treat ml as g for consistency.
- 4–10 ingredients typical. Skip salt/pepper unless central to the dish.
- Match aggressively: "chicken thigh fillet" matches "chicken thigh"; "garlic clove" matches "garlic".
- Use only ingredients you can plausibly justify from the description.`;

  const userPayload = JSON.stringify({
    item_name,
    item_description,
    existing_pantry: pantryForPrompt,
  });

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
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPayload }],
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "Draft timed out" : "AI service error" },
      { status: 504 },
    );
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("recipe draft anthropic error", res.status, body);
    return NextResponse.json({ error: "AI service returned an error" }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";

  let parsedJson: { ingredients?: Array<unknown> };
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

  // Validate + sanitise the response
  const lineSchema = z.object({
    name: z.string().trim().min(1).max(120),
    ep_qty_g: z.coerce.number().gt(0).max(100_000),
    yield_pct: z.coerce.number().gt(0).max(100).default(100),
    matched_pantry_id: z.union([z.string().uuid(), z.null()]).default(null),
  });
  const parsedLines = z
    .object({ ingredients: z.array(lineSchema).max(50) })
    .safeParse(parsedJson);
  if (!parsedLines.success) {
    return NextResponse.json({ error: "AI returned an unexpected shape" }, { status: 422 });
  }

  // Defensive: confirm matched pantry ids actually exist + belong to this user.
  const claimedIds = parsedLines.data.ingredients
    .map((i) => i.matched_pantry_id)
    .filter((x): x is string => !!x);
  let allowed = new Set<string>();
  if (claimedIds.length > 0) {
    const { data: rows } = await adminClient
      .from("ingredients")
      .select("id")
      .eq("business_id", user.id)
      .in("id", claimedIds);
    allowed = new Set((rows ?? []).map((r) => r.id));
  }

  const ingredients = parsedLines.data.ingredients.map((i) => ({
    name: i.name,
    ep_qty_g: i.ep_qty_g,
    yield_pct: i.yield_pct,
    matched_pantry_id: i.matched_pantry_id && allowed.has(i.matched_pantry_id)
      ? i.matched_pantry_id
      : null,
  }));

  // Log the call (one row per call, for cost tracking + abuse).
  console.log(
    JSON.stringify({
      event: "stock_recipe_draft",
      business_id: user.id,
      item_name,
      ingredient_count: ingredients.length,
      pantry_size: pantryForPrompt.length,
      ts: new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ingredients });
}
