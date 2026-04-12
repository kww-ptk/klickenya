import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { revalidateTag, revalidatePath } from "next/cache";
import { getMenuAuth, verifyMenuAccess } from "@/app/api/menu/_lib/auth";

/* ── Types returned by the parse action ─────────────── */

export interface ImportedItem {
  name: string;
  description: string;
  price_kes: number;
  dietary_tags: string[];
}

export interface ImportedSection {
  title: string;
  items: ImportedItem[];
}

/* ── Commit payload schema ───────────────────────────── */

const commitItemSchema = z.object({
  name:         z.string().min(1).max(200),
  description:  z.string().max(1000).optional().default(""),
  price_kes:    z.number().min(0),
  dietary_tags: z.array(z.string().max(50)).max(10).optional().default([]),
});

const commitSectionSchema = z.object({
  title: z.string().min(1).max(200),
  items: z.array(commitItemSchema).min(0).max(200),
});

const commitSchema = z.object({
  action:   z.literal("commit"),
  menu_id:  z.string().uuid(),
  sections: z.array(commitSectionSchema).min(1).max(50),
});

/* ── Sanitise text ───────────────────────────────────── */

function sanitiseText(raw: string, maxLen: number): string {
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

/* ── POST handler ────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { userId, isAdmin, supabase } = await getMenuAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const action = body.action as string;

  /* ── action: parse ────────────────────────────────── */

  if (action === "parse") {
    const menuId = body.menu_id;
    if (!menuId || typeof menuId !== "string") {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    const rawText = body.raw_text;
    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return NextResponse.json({ error: "raw_text required" }, { status: 400 });
    }
    if (rawText.length > 15000) {
      return NextResponse.json({ error: "raw_text exceeds 15 000 character limit" }, { status: 400 });
    }

    const access = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI parsing not configured" }, { status: 503 });
    }

    const systemPrompt = `You are a menu parser. The user will paste raw menu text (e.g. from a photo, PDF, WhatsApp message, or typed list).
Extract all sections and items and return ONLY valid JSON — no markdown, no explanation, no code fences.

Return this exact structure:
{
  "sections": [
    {
      "title": "Section Name",
      "items": [
        {
          "name": "Item Name",
          "description": "Brief description or empty string",
          "price_kes": 450,
          "dietary_tags": []
        }
      ]
    }
  ],
  "summary": "One sentence describing what was imported"
}

Rules:
- price_kes must be a number (no currency symbols). If price is ambiguous or missing, use 0.
- dietary_tags must be an array of short codes ONLY from this list: ["V","VG","GF","H","S","DF"]
  V  = Vegetarian (no meat/fish)
  VG = Vegan (no animal products at all)
  GF = Gluten-free (no wheat/gluten)
  H  = Halal (halal certified or clearly halal)
  S  = Spicy (contains chilli/hot spices)
  DF = Lactose Free (contains no dairy/milk/cheese/butter)
  Use only codes that are clearly indicated in the text. Do not guess. Use [] if unsure.
- If there are no clear sections, put everything in a single section called "Menu"
- Maximum 50 sections, 200 items total
- Trim and clean all text
- Return ONLY JSON`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let anthropicRes: Response;
    try {
      anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: "user", content: rawText }],
        }),
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      return NextResponse.json(
        { error: isAbort ? "Parse timed out after 30 seconds" : "AI service error" },
        { status: 504 }
      );
    }
    clearTimeout(timeout);

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text().catch(() => "");
      console.error("Anthropic error:", anthropicRes.status, errBody);
      return NextResponse.json({ error: "AI service returned an error" }, { status: 502 });
    }

    const anthropicData = await anthropicRes.json();
    const rawContent: string = anthropicData?.content?.[0]?.text ?? "";

    let parsed: { sections: ImportedSection[]; summary: string };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Try to extract JSON from the response if there's surrounding text
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "AI returned non-JSON response" }, { status: 422 });
      }
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json({ error: "AI returned malformed JSON" }, { status: 422 });
      }
    }

    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
      return NextResponse.json({ error: "No sections found in the menu text" }, { status: 422 });
    }

    // Count total items
    const totalItems = parsed.sections.reduce((sum, s) => sum + (s.items?.length ?? 0), 0);
    if (totalItems > 200) {
      return NextResponse.json({ error: "Too many items (max 200)" }, { status: 422 });
    }

    return NextResponse.json({
      sections: parsed.sections,
      summary: parsed.summary ?? `Parsed ${parsed.sections.length} section(s) with ${totalItems} item(s)`,
    });
  }

  /* ── action: commit ───────────────────────────────── */

  if (action === "commit") {
    const parsedBody = commitSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    const { menu_id, sections } = parsedBody.data;

    const access = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Check total item count across all sections
    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    if (totalItems > 200) {
      return NextResponse.json({ error: "Too many items (max 200)" }, { status: 400 });
    }

    // Get current max display_order for sections in this menu
    const { data: existingSections } = await adminClient
      .from("menu_sections")
      .select("display_order")
      .eq("menu_id", menu_id)
      .order("display_order", { ascending: false })
      .limit(1);

    let sectionOrder = (existingSections?.[0]?.display_order ?? -1) + 1;

    let createdSections = 0;
    let createdItems = 0;

    for (const section of sections) {
      const sanitisedTitle = sanitiseText(section.title, 200);
      if (!sanitisedTitle) continue;

      const { data: newSection, error: secErr } = await adminClient
        .from("menu_sections")
        .insert({
          menu_id,
          title:         sanitisedTitle,
          display_order: sectionOrder++,
          is_visible:    true,
        })
        .select("id")
        .single();

      if (secErr || !newSection) {
        console.error("Section insert error:", secErr);
        continue;
      }
      createdSections++;

      // Insert items for this section
      let itemOrder = 0;
      const itemRows = section.items
        .map((item) => {
          const name = sanitiseText(item.name, 200);
          if (!name) return null;
          return {
            section_id:    newSection.id,
            name,
            description:   sanitiseText(item.description ?? "", 1000),
            price_kes:     Math.max(0, Math.round(item.price_kes ?? 0)),
            dietary_tags:  (item.dietary_tags ?? [])
                             .map((t) => sanitiseText(t, 50))
                             .filter(Boolean)
                             .slice(0, 10),
            is_available:  true,
            display_order: itemOrder++,
          };
        })
        .filter(Boolean);

      if (itemRows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: itemErr } = await adminClient
          .from("menu_items")
          .insert(itemRows as any[]);

        if (itemErr) {
          console.error("Item insert error:", itemErr);
        } else {
          createdItems += itemRows.length;
        }
      }
    }

    revalidateTag(`menu:${menu_id}`, "default");
    revalidatePath(`/m/${access.slug}`);
    return NextResponse.json({ created_sections: createdSections, created_items: createdItems });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
