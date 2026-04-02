import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { menu_id } = await req.json();
    if (!menu_id) return NextResponse.json({ ok: true });

    const userAgent = req.headers.get("user-agent") ?? null;

    await supabase.from("menu_scans").insert({
      menu_id,
      user_agent: userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
