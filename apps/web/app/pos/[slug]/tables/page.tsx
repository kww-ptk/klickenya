import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { getPosMenuBySlug } from "../_lib/menuFromSlug";
import { POS_SESSION_COOKIE, verifyPosSession } from "@/app/api/pos/_lib/auth";
import { PosTablesGrid, type PosFloorArea, type PosTable } from "@/components/pos/PosTablesGrid";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Tables grid page. The shared layout already fetched menu + staff into
 * context, so this page only fetches the lightweight table list. Auth
 * verification still lives here as a defence-in-depth check (layout context
 * is for the UI; redirect is for the server response).
 *
 * The floor-map toggle on the grid is read-only -- staff see live status,
 * tap a tile to open / manage that table's session, but cannot move tiles.
 * Owners arrange the floor from the dashboard.
 */
export default async function PosTablesPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPosMenuBySlug(slug);
  if (!menu) return null;

  const cookieStore = await cookies();
  const session = verifyPosSession(cookieStore.get(POS_SESSION_COOKIE)?.value);
  if (!session || session.menu_id !== menu.id) {
    redirect(`/pos/${slug}`);
  }
  // Kitchen staff don't have access to the waiter tables grid — bounce them
  // to the kitchen view. Defence in depth; the page.tsx login already does
  // this when they're signing in, but a direct nav here would slip through.
  if (session.role === "kitchen") {
    redirect(`/kitchen/${slug}/orders`);
  }

  // Tables (with positions + area links + legacy floor_section) and areas in
  // parallel. Areas drive the floor-map picker; positions place the tiles.
  const [{ data: tables }, { data: areas }] = await Promise.all([
    adminClient
      .from("restaurant_tables")
      .select(
        "id, table_number, capacity, display_order, is_active, pos_x, pos_y, area_id, floor_section",
      )
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("display_order"),
    adminClient
      .from("restaurant_areas")
      .select("id, name, color_hex")
      .eq("menu_id", menu.id)
      .eq("is_active", true)
      .order("display_order"),
  ]);

  const initialTables: PosTable[] = (tables ?? []).map((t) => ({
    id:            t.id,
    table_number:  t.table_number,
    capacity:      t.capacity ?? 4,
    pos_x:         t.pos_x ?? null,
    pos_y:         t.pos_y ?? null,
    area_id:       t.area_id ?? null,
    floor_section: t.floor_section ?? null,
    is_active:     t.is_active ?? true,
  }));

  return (
    <PosTablesGrid
      initialTables={initialTables}
      initialAreas={(areas ?? []) as PosFloorArea[]}
    />
  );
}
