/**
 * GoHighLevel webhook sender.
 * Sends form submissions and events to GHL for CRM automation.
 * No-op if GHL_INBOUND_WEBHOOK_URL is not set — safe to call unconditionally.
 */
export async function sendToGHL(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const url = process.env.GHL_INBOUND_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.GHL_API_KEY && {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        }),
      },
      body: JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
  } catch {
    // GHL failure must never break the calling function
  }
}
