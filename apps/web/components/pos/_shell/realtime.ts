"use client";

import { createClient } from "@/lib/supabase/client";
import {
  recordRealtimeHeartbeat,
  setRealtimeStatus,
} from "./status";

/**
 * Subscribe to changes on a single table_session: the session row itself + any
 * orders attached to it. Calls `onChange()` whenever Postgres emits an INSERT,
 * UPDATE, or DELETE matching the filter.
 *
 * Channel name is derived from sessionId so the same session opened in two
 * tabs gets two channels (Supabase allows that — channels are per-client).
 *
 * Returns an unsubscribe function. Status updates flow into the global POS
 * status store so the header chip can reflect connection health.
 *
 * Requires the migration that adds `orders` and `table_sessions` to the
 * `supabase_realtime` publication — see migration 055.
 */
export function subscribeSessionRealtime(args: {
  sessionId: string;
  onChange:  () => void;
}): () => void {
  const supabase = createClient();
  setRealtimeStatus("connecting");

  const channel = supabase
    .channel(`pos-session-${args.sessionId}`)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event:  "*",
        schema: "public",
        table:  "orders",
        filter: `table_session_id=eq.${args.sessionId}`,
      },
      () => {
        recordRealtimeHeartbeat();
        args.onChange();
      },
    )
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event:  "*",
        schema: "public",
        table:  "table_sessions",
        filter: `id=eq.${args.sessionId}`,
      },
      () => {
        recordRealtimeHeartbeat();
        args.onChange();
      },
    )
    .subscribe((status) => {
      // status: SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
      if (status === "SUBSCRIBED") {
        setRealtimeStatus("connected");
        recordRealtimeHeartbeat();
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setRealtimeStatus("disconnected");
      }
    });

  return () => {
    setRealtimeStatus("idle");
    supabase.removeChannel(channel);
  };
}
