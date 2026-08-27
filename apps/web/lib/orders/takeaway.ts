/**
 * Manual WhatsApp fallback for takeaway pickup notifications — same pattern
 * as reservation wa.me links. The owner taps this; nothing is sent automatically.
 */
export function pickupWaMeLink(
  phone: string,
  name: string | null,
  shortId: string,
): string {
  const digits = phone.replace(/\D/g, "");
  const greeting = name ? `Hi ${name}, ` : "Hi, ";
  const text = `${greeting}your order #${shortId} is ready for pickup!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
