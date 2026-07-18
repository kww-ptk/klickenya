import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { sanityClient } from "@/lib/sanity/client";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const parsed = z.string().min(2).max(80).safeParse(q);
  if (!parsed.success) return NextResponse.json({ results: [] });
  const results = await sanityClient.fetch<
    { _id: string; title: string; type: string; city: string | null }[]
  >(
    `*[_type == "listing" && status == "published" && title match $m][0...10]{ _id, title, type, city }`,
    { m: `${parsed.data}*` },
  );
  return NextResponse.json({ results: results ?? [] });
}
