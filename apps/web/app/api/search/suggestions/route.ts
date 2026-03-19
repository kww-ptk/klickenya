import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * GET /api/search/suggestions
 *
 * Returns the top 10 most searched queries from the last 30 days.
 * Used for "Popular searches" in the search dropdown.
 */
export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await adminClient.rpc(
      "get_popular_searches",
      { since: thirtyDaysAgo.toISOString(), result_limit: 10 }
    );

    if (error) throw error;

    return NextResponse.json({
      suggestions: (data ?? []).map(
        (row: { query: string; search_count: number }) => ({
          query: row.query,
          count: row.search_count,
        })
      ),
    });
  } catch (err) {
    console.error("Search suggestions error:", err);
    return NextResponse.json({ suggestions: [] });
  }
}
