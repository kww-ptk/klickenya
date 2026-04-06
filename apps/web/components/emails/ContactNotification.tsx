interface PricingFee { name: string; hint: string; amount: number; }

interface PricingBreakdown {
  roomName: string;
  perNight: number;
  nights: number;
  subtotal: number;
  mandatoryFees: PricingFee[];
  upsellFees: PricingFee[];
  estimatedTotal: number;
}

interface ContactNotificationProps {
  listingTitle: string;
  listingType: string;
  listingUrl: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  message?: string;
  enquiryDetails: Record<string, string>;
  pricingBreakdown?: PricingBreakdown;
}

const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

export function contactNotificationHtml(props: ContactNotificationProps): string {
  const {
    listingTitle,
    listingType,
    listingUrl,
    guestName,
    guestEmail,
    guestPhone,
    message,
    enquiryDetails,
    pricingBreakdown,
  } = props;

  const detailRows = Object.entries(enquiryDetails)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">${key}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${value}</td>
      </tr>`
    )
    .join("");

  const messageSection = message
    ? `
      <h2 style="margin:24px 0 12px;font-size:16px;font-weight:600;color:#111;">Message</h2>
      <div style="padding:16px;background-color:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${message}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Enquiry</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#E8A020;padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111;">New Enquiry</h1>

              <!-- Listing Info -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Listing</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Title</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${listingTitle}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Type</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${listingType}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Link</td>
                  <td style="padding:8px 12px;font-size:14px;"><a href="${listingUrl}" style="color:#E8A020;text-decoration:underline;">View listing</a></td>
                </tr>
              </table>

              <!-- Guest Contact -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Guest Contact</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Name</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${guestName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Email</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;"><a href="mailto:${guestEmail}" style="color:#E8A020;text-decoration:underline;">${guestEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Phone</td>
                  <td style="padding:8px 12px;font-size:14px;"><a href="tel:${guestPhone}" style="color:#E8A020;text-decoration:underline;">${guestPhone}</a></td>
                </tr>
              </table>

              <!-- Enquiry Details -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Enquiry Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                ${detailRows}
              </table>

              ${pricingBreakdown ? `
              <!-- Price Breakdown -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Price breakdown</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:${message ? "24px" : "0"};border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background-color:#fafafa;padding:10px 14px;border-bottom:1px solid #e5e7eb;">
                    <strong style="font-size:13px;color:#111;">${pricingBreakdown.roomName}</strong>
                    <span style="font-size:12px;color:#888;margin-left:8px;">${pricingBreakdown.nights} night${pricingBreakdown.nights !== 1 ? "s" : ""}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${ksh(pricingBreakdown.perNight)} × ${pricingBreakdown.nights} night${pricingBreakdown.nights !== 1 ? "s" : ""}</td>
                  <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:600;text-align:right;">${ksh(pricingBreakdown.subtotal)}</td>
                </tr>
                ${pricingBreakdown.mandatoryFees.map((f) => `
                <tr>
                  <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${f.name}${f.hint ? ` <span style="color:#aaa;">${f.hint}</span>` : ""}</td>
                  <td style="padding:8px 14px;border-bottom:1px solid #eee;color:#333;font-size:13px;font-weight:600;text-align:right;">${ksh(f.amount)}</td>
                </tr>`).join("")}
                ${pricingBreakdown.upsellFees.length > 0 ? `
                <tr>
                  <td colspan="2" style="padding:6px 14px;background-color:#f5f3ff;font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:0.05em;border-bottom:1px solid #ede9fe;">OPTIONAL EXTRAS (GUEST SELECTED)</td>
                </tr>
                ${pricingBreakdown.upsellFees.map((f) => `
                <tr>
                  <td style="padding:8px 14px;border-bottom:1px solid #ede9fe;color:#6d28d9;font-size:13px;">${f.name}${f.hint ? ` <span style="color:#a78bfa;">${f.hint}</span>` : ""}</td>
                  <td style="padding:8px 14px;border-bottom:1px solid #ede9fe;color:#6d28d9;font-size:13px;font-weight:600;text-align:right;">${ksh(f.amount)}</td>
                </tr>`).join("")}` : ""}
                <tr>
                  <td style="padding:10px 14px;background-color:#fffbeb;border-top:2px solid #fcd34d;font-size:14px;font-weight:700;color:#92400e;">Estimated total</td>
                  <td style="padding:10px 14px;background-color:#fffbeb;border-top:2px solid #fcd34d;font-size:16px;font-weight:800;color:#E8A020;text-align:right;">${ksh(pricingBreakdown.estimatedTotal)}</td>
                </tr>
              </table>
              ` : ""}

              ${messageSection}

              <!-- Admin Link -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="https://klickenya.com/admin/contact-requests" style="display:inline-block;padding:12px 24px;background-color:#E8A020;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">View in Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
