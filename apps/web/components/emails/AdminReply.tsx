interface AdminReplyProps {
  guestName: string;
  listingTitle: string;
  listingType: string;
  enquiryDetails: [string, string][];
  status: "approved" | "rejected" | "pending" | "info";
  replyMessage: string;
}

const STATUS_CONFIG = {
  approved: {
    label: "Approved",
    color: "#22C55E",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    icon: "✓",
    text: "Great news! Your request has been approved.",
  },
  rejected: {
    label: "Declined",
    color: "#EF4444",
    bg: "#FEF2F2",
    border: "#FECACA",
    icon: "✗",
    text: "Unfortunately, your request could not be accommodated.",
  },
  pending: {
    label: "Pending",
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#FDE68A",
    icon: "⏳",
    text: "Your request is being reviewed.",
  },
  info: {
    label: "Update",
    color: "#3B82F6",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    icon: "ℹ",
    text: "Here's an update regarding your enquiry.",
  },
};

export function adminReplyHtml(props: AdminReplyProps): string {
  const { guestName, listingTitle, listingType, enquiryDetails, status, replyMessage } = props;
  const cfg = STATUS_CONFIG[status];

  const detailRows = enquiryDetails
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">${key}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${value}</td>
      </tr>`
    )
    .join("");

  const messageHtml = replyMessage
    .split("\n")
    .filter((l) => l.trim())
    .map((p) => `<p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.6;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Klickenya — ${cfg.label}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
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

          <!-- Status Badge -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:${cfg.bg};border:1px solid ${cfg.border};border-radius:8px;padding:16px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="36" style="width:36px;vertical-align:middle;">
                          <div style="width:36px;height:36px;background-color:${cfg.color};border-radius:18px;text-align:center;line-height:36px;color:#ffffff;font-size:16px;font-weight:700;display:block;">${cfg.icon}</div>
                        </td>
                        <td style="padding-left:14px;">
                          <p style="margin:0;font-size:16px;font-weight:700;color:${cfg.color};">${cfg.label}</p>
                          <p style="margin:4px 0 0;font-size:13px;color:#666;">${cfg.text}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;">Hi ${guestName},</p>

              ${messageHtml}
            </td>
          </tr>

          <!-- Reservation Summary -->
          ${listingTitle || detailRows ? `
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background-color:#fafafa;padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                    <strong style="font-size:14px;color:#111;">Your Reservation Details</strong>
                  </td>
                </tr>
                ${listingTitle ? `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Listing</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${listingTitle}</td>
                </tr>
                ` : ""}
                ${listingType ? `
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Type</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;text-transform:capitalize;">${listingType}</td>
                </tr>
                ` : ""}
                ${detailRows}
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;" align="center">
              <a href="https://klickenya.com" style="display:inline-block;padding:12px 32px;background-color:#E8A020;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                Browse more on Klickenya
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; Discover Kenya &middot; klickenya.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
