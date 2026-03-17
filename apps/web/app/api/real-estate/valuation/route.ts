import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";

/* ---------- Supabase (service role for server-side inserts) ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Validation ---------- */

const valuationSchema = z.object({
  neighbourhood: z.string().min(1),
  propertyType: z.string().min(1),
  bedrooms: z.number().int().min(0).max(10),
  sizeSqm: z.number().min(10).max(5000),
});

/* ---------- Rate limiter: 5 requests per minute per IP ---------- */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 5;
}

/* ---------- Valuation constants ---------- */

const BASE_PRICES: Record<string, number> = {
  kilimani: 124500,
  westlands: 138000,
  karen: 95000,
  lavington: 112000,
  upperhill: 165000,
  nyali: 78000,
  default: 85000,
};

const TYPE_MULTIPLIERS: Record<string, number> = {
  villa: 1.3,
  house: 1.1,
  apartment: 1.0,
  studio: 0.85,
  townhouse: 1.05,
};

/* ---------- POST handler ---------- */

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = valuationSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json(
        { success: false, errors: fieldErrors },
        { status: 400 }
      );
    }

    const { neighbourhood, propertyType, bedrooms, sizeSqm } = parsed.data;

    /* Mock valuation logic */
    const neighbourhoodKey = neighbourhood.toLowerCase().replace(/\s+/g, "");
    const basePricePerSqm = BASE_PRICES[neighbourhoodKey] ?? BASE_PRICES.default;

    let estimatedValue = basePricePerSqm * sizeSqm;

    // Adjust by property type
    const typeKey = propertyType.toLowerCase().replace(/\s+/g, "");
    const typeMultiplier = TYPE_MULTIPLIERS[typeKey] ?? 1.0;
    estimatedValue *= typeMultiplier;

    // Adjust by bedrooms: +5% per bedroom above 2
    if (bedrooms > 2) {
      estimatedValue *= 1 + (bedrooms - 2) * 0.05;
    }

    // Round to nearest whole number
    estimatedValue = Math.round(estimatedValue);

    // Range: estimated ± 12%
    const rangeMin = Math.round(estimatedValue * 0.88);
    const rangeMax = Math.round(estimatedValue * 1.12);

    /* Save to Supabase */
    const { error: dbError } = await supabase.from("valuations").insert({
      neighbourhood,
      property_type: propertyType,
      bedrooms,
      size_sqm: sizeSqm,
      estimated_value: estimatedValue,
      range_min: rangeMin,
      range_max: rangeMax,
    });

    if (dbError) {
      console.error("Valuation DB error:", dbError);
      // Continue even if DB save fails — still return valuation to user
    }

    return NextResponse.json({
      success: true,
      estimatedValue,
      rangeMin,
      rangeMax,
      confidence: "moderate",
    });
  } catch (err) {
    console.error("Valuation error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
