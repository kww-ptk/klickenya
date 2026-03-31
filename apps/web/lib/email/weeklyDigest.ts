const HEADER = `<div style="background:#16130C;padding:24px 32px;">
  <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
</div>`;

const FOOTER = `<div style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#999;text-align:center;">You're receiving this because you have a host account on Klickenya.</p>
  <p style="margin:4px 0 0;font-size:12px;color:#999;text-align:center;"><a href="https://klickenya.com/dashboard/settings" style="color:#E8A020;">Unsubscribe from weekly stats</a> &middot; klickenya.com</p>
</div>`;

export function weeklyDigestHtml(p: {
  hostName: string;
  views: number;
  contactClicks: number;
  enquiriesSent: number;
  phoneTaps: number;
  changePercent: number | null;
}): string {
  const trend = p.changePercent !== null
    ? p.changePercent > 0
      ? `<p style="margin:16px 0 0;font-size:14px;color:#22C55E;font-weight:600;">Up ${p.changePercent}% from last week</p>`
      : p.changePercent < 0
        ? `<p style="margin:16px 0 0;font-size:14px;color:#EF4444;">Views were down ${Math.abs(p.changePercent)}% this week. Tips: add more photos, update your description.</p>`
        : ""
    : "";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td>${HEADER}</td></tr>
<tr><td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#16130C;">Your Klickenya stats this week</h1>
  <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.hostName}, here's how your listings performed.</p>

  <div style="margin:24px 0;padding:20px;background:#F5F3F0;border-radius:12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#9C9485;">👁 Page views</td>
        <td style="padding:8px 0;font-size:18px;font-weight:700;color:#16130C;text-align:right;">${p.views}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#9C9485;">💬 Contact clicks</td>
        <td style="padding:8px 0;font-size:18px;font-weight:700;color:#16130C;text-align:right;">${p.contactClicks}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#9C9485;">📩 Enquiries sent</td>
        <td style="padding:8px 0;font-size:18px;font-weight:700;color:#16130C;text-align:right;">${p.enquiriesSent}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#9C9485;">📱 Phone taps</td>
        <td style="padding:8px 0;font-size:18px;font-weight:700;color:#16130C;text-align:right;">${p.phoneTaps}</td>
      </tr>
    </table>
  </div>

  ${trend}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr><td align="center">
      <a href="https://klickenya.com/dashboard/stats" style="display:inline-block;padding:12px 24px;background:#E8A020;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">View full stats</a>
    </td></tr>
  </table>
</td></tr>
<tr><td>${FOOTER}</td></tr>
</table></td></tr></table></body></html>`;
}
