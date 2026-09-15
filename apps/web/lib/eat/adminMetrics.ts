import { unstable_cache } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Everything the eat command centre counts, in one pass.
 *
 * Deliberately computed in JS from one window of orders rather than in SQL
 * views: the whole table is in the low hundreds of rows, a view is a
 * migration plus a refresh strategy, and every number here wants to be
 * derived the same way the pages already derive them (voided lines excluded,
 * "in flight" meaning the active statuses, not a stored flag).
 *
 * Revisit when order volume makes a full scan silly — not before.
 */

export const EAT_ORDER_TYPES = ["delivery", "takeaway"] as const;
export const ACTIVE_STATUSES = ["new", "preparing", "ready"] as const;

export type RiderRecord = {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  /** Klickenya-employed: works every delivering restaurant (089). */
  is_platform: boolean;
};

export type EatOrder = {
  id: string;
  menu_id: string;
  order_type: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_kes: number | null;
  cash_collected_kes: number | null;
  commission_kes: number | null;
  restaurant_payout_kes: number | null;
  rider_fee_kes: number | null;
  platform_delivery_fee_kes: number | null;
  delivery_fee_kes: number | null;
  rider_id: string | null;
  rider_accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  /** Not selected here — no admin page renders line items, and the embed
   *  was the heaviest part of the read. Optional so a caller that fetches
   *  its own rows with the embed still fits the type. */
  order_items?: { id: string; item_name: string; quantity: number; is_voided?: boolean | null }[];
};

export type EatMetrics = {
  orders: EatOrder[];
  restaurants: Map<string, string>;
  riders: Map<string, RiderRecord>;
  /** True when migration 088 has not been applied — riders read as empty. */
  ridersUnavailable: boolean;
  /**
   * The orders query itself failed — almost always a column the database does
   * not have yet. Surfaced rather than swallowed: PostgREST answers a missing
   * column with a 400 and our client reads `data` as null, so without this the
   * console would render a confident "0 orders" over a live restaurant. That
   * exact failure is why CLAUDE.md has a column-drift rule.
   */
  schemaError: string | null;
  totals: {
    all: number;
    delivered: number;
    cancelled: number;
    inFlight: number;
    deliveries: number;
    revenueKes: number;
    /** Average value of a DELIVERED order. Undelivered ones have not earned
     *  anything yet and would drag the number toward a fiction. */
    averageOrderKes: number;
    ordersPerDay: number;
    cashCollectedKes: number;
    /** Delivered cash orders where the rider recorded nothing. Not an
     *  accusation — usually a rider who skipped the field — but it is the
     *  number that has to be chased. */
    cashUnrecorded: number;
    /** Klickenya's commission on delivered orders. */
    commissionKes: number;
    /** Klickenya's share of delivery fees on delivered orders. */
    platformDeliveryFeeKes: number;
    /** Everything Klickenya earned. */
    platformEarnedKes: number;
    /** Owed to riders for delivered orders. */
    riderOwedKes: number;
    /** Owed to restaurants for delivered orders. */
    restaurantOwedKes: number;
  };
};

/** Sum one money column, treating nulls (pre-092 orders) as zero. */
function sum(orders: EatOrder[], key: keyof EatOrder): number {
  return orders.reduce((n, o) => n + Number((o[key] as number | null) ?? 0), 0);
}

const SELECT = `
  id, menu_id, order_type, status, customer_name, customer_phone,
  delivery_address, delivery_lat, delivery_lng, total_kes, cash_collected_kes,
  delivery_fee_kes, commission_kes, restaurant_payout_kes, rider_fee_kes,
  platform_delivery_fee_kes,
  rider_id, rider_accepted_at, picked_up_at, delivered_at, created_at
`;

/**
 * What the cache holds. unstable_cache round-trips through JSON, so this is
 * plain data only — a Map would come back as `{}`. getEatMetrics rebuilds
 * the Maps and derives the totals on the way out.
 */
type EatMetricsPayload = {
  orders: EatOrder[];
  restaurants: [string, string][];
  riders: RiderRecord[];
  ridersUnavailable: boolean;
  schemaError: string | null;
};

async function loadEatMetrics(days: number): Promise<EatMetricsPayload> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data: rows, error: ordersError } = await adminClient
    .from("orders")
    .select(SELECT)
    .in("order_type", [...EAT_ORDER_TYPES])
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("[getEatMetrics] orders query failed:", ordersError);
  }
  const orders = (rows ?? []) as unknown as EatOrder[];

  // Restaurant names and rider records, resolved in parallel. Riders are
  // wrapped because the table does not exist until 088 is applied — the
  // console must still render rather than 500 on a fresh database.
  const menuIds = Array.from(new Set(orders.map((o) => o.menu_id).filter(Boolean)));
  const [menusRes, ridersRes] = await Promise.allSettled([
    menuIds.length
      ? adminClient.from("menus").select("id, name").in("id", menuIds)
      : Promise.resolve({ data: [] }),
    adminClient.from("riders").select("id, name, phone, is_active, is_platform"),
  ]);

  const restaurants: [string, string][] = [];
  if (menusRes.status === "fulfilled") {
    for (const m of (menusRes.value.data ?? []) as { id: string; name: string }[]) {
      restaurants.push([m.id, String(m.name ?? "").replace(/\s+menu\s*$/i, "").trim()]);
    }
  }

  const riders: RiderRecord[] = [];
  let ridersUnavailable = true;
  if (ridersRes.status === "fulfilled" && Array.isArray(ridersRes.value.data)) {
    ridersUnavailable = false;
    riders.push(...(ridersRes.value.data as RiderRecord[]));
  }

  return {
    orders,
    restaurants,
    riders,
    ridersUnavailable,
    schemaError: ordersError
      ? ordersError.message || "The orders query was rejected by the database."
      : null,
  };
}

/**
 * Cached for 30 s — the freshness an ops console needs, and enough that the
 * five pages of the console (and the auto-refresh behind them) share one
 * read instead of each scanning the window. The tag lets a write path bust
 * it later with revalidateTag("eat:orders") when a change must show at once.
 */
const cachedEatMetrics = unstable_cache(loadEatMetrics, ["eat-metrics"], {
  revalidate: 30,
  tags: ["eat:orders"],
});

export async function getEatMetrics(days = 30): Promise<EatMetrics> {
  const { orders, restaurants, riders, ridersUnavailable, schemaError } =
    await cachedEatMetrics(days);

  const riderMap = new Map<string, RiderRecord>();
  for (const r of riders) riderMap.set(r.id, r);

  const delivered = orders.filter((o) => o.status === "delivered");
  const revenueKes = delivered.reduce((n, o) => n + Number(o.total_kes ?? 0), 0);
  const deliveredDeliveries = delivered.filter((o) => o.order_type === "delivery");

  return {
    orders,
    restaurants: new Map(restaurants),
    riders: riderMap,
    ridersUnavailable,
    schemaError,
    totals: {
      all: orders.length,
      delivered: delivered.length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      inFlight: orders.filter((o) =>
        (ACTIVE_STATUSES as readonly string[]).includes(o.status),
      ).length,
      deliveries: orders.filter((o) => o.order_type === "delivery").length,
      revenueKes,
      averageOrderKes: delivered.length ? Math.round(revenueKes / delivered.length) : 0,
      ordersPerDay: Math.round((orders.length / days) * 10) / 10,
      cashCollectedKes: orders.reduce((n, o) => n + Number(o.cash_collected_kes ?? 0), 0),
      cashUnrecorded: deliveredDeliveries.filter((o) => o.cash_collected_kes === null).length,
      // Delivered only. An order still being cooked has earned nobody
      // anything yet, and counting it would overstate every line.
      commissionKes: sum(delivered, "commission_kes"),
      platformDeliveryFeeKes: sum(delivered, "platform_delivery_fee_kes"),
      platformEarnedKes:
        sum(delivered, "commission_kes") + sum(delivered, "platform_delivery_fee_kes"),
      riderOwedKes: sum(delivered, "rider_fee_kes"),
      restaurantOwedKes: sum(delivered, "restaurant_payout_kes"),
    },
  };
}

/** Per-rider view of the same window. */
export function riderStats(orders: EatOrder[], riderId: string) {
  const mine = orders.filter((o) => o.rider_id === riderId);
  const done = mine.filter((o) => o.delivered_at);
  const cash = done.reduce((n, o) => n + Number(o.cash_collected_kes ?? 0), 0);

  // Accept → delivered, in minutes. Only where both ends were recorded.
  const durations = done
    .filter((o) => o.rider_accepted_at && o.delivered_at)
    .map(
      (o) =>
        (new Date(o.delivered_at as string).getTime() -
          new Date(o.rider_accepted_at as string).getTime()) /
        60000,
    )
    .filter((m) => m > 0 && m < 24 * 60); // a 3-day "delivery" is a forgotten tap

  return {
    total: mine.length,
    delivered: done.length,
    inFlight: mine.filter((o) => !o.delivered_at).length,
    cashCollectedKes: cash,
    averageMinutes: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null,
    orders: mine,
  };
}
