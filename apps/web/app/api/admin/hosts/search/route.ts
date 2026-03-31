import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { sanityClient } from "@/lib/sanity/client";

export async function GET(request: NextRequest) {
  try {
    await assertAdmin(request);
    const q = request.nextUrl.searchParams.get("q") ?? "";

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await sanityClient.fetch<
      { _id: string; title: string; type: string; city: string | null; isVerified: boolean }[]
    >(
      `*[_type == "listing" && title match $q + "*" && (!defined(hostId) || hostId == "" || hostId == null)] | order(title asc) [0...20] {
        _id, title, type, city, isVerified
      }`,
      { q }
    );

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
