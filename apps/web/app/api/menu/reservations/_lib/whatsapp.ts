/**
 * whatsapp.ts — Server-side WhatsApp URL generator for reservation status changes.
 * Do NOT import this in any client component.
 * Prompt 8c consumes the URL from the PATCH response verbatim.
 */

export type WhatsAppTransition = "approved" | "declined" | "cancelled";

function formatNairobiDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function formatNairobiTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));
}

function cleanPhone(phone: string): string {
  // Strip leading +, spaces, and dashes — wa.me requires digits only after the slash
  return phone.replace(/^\+/, "").replace(/[\s\-]/g, "");
}

export function generateWhatsAppUrl(
  reservation: {
    guest_name: string;
    guest_phone: string;
    party_size: number;
    reserved_for: string; // ISO string
    decline_reason?: string | null;
  },
  transition: WhatsAppTransition,
  menuName: string,
): string {
  const { guest_name, guest_phone, party_size, reserved_for, decline_reason } = reservation;
  const date = formatNairobiDate(reserved_for);
  const time = formatNairobiTime(reserved_for);
  const phone = cleanPhone(guest_phone);

  let message: string;
  switch (transition) {
    case "approved":
      message = `Hi ${guest_name}, your reservation at ${menuName} for ${party_size} on ${date} at ${time} is confirmed. See you then!`;
      break;
    case "declined":
      message = `Hi ${guest_name}, unfortunately we can't confirm your reservation for ${party_size} on ${date} at ${time}. Reason: ${decline_reason ?? ""}. Please try another time or contact us directly.`;
      break;
    case "cancelled":
      message = `Hi ${guest_name}, we need to cancel your reservation for ${party_size} on ${date} at ${time}. We're sorry for the inconvenience.`;
      break;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
