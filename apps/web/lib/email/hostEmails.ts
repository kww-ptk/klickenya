const HEADER = `<div style="background:#16130C;padding:24px 32px;">
  <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya</span>
</div>`;

const FOOTER = `<div style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#999;text-align:center;">&copy; 2026 Klickenya &middot; klickenya.com</p>
</div>`;

function wrap(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td>${HEADER}</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td>${FOOTER}</td></tr>
</table></td></tr></table></body></html>`;
}

function cta(label: string, url: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
<tr><td align="center">
<a href="${url}" style="display:inline-block;padding:12px 24px;background:#E8A020;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${label}</a>
</td></tr></table>`;
}

// Email 1 — TO HOST: Listing Assigned
export function listingAssignedToHostHtml(p: {
  hostName: string;
  listingTitle: string;
  listingType: string;
  city: string | null;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">A listing has been added to your profile</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.hostName},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">A new listing has been connected to your Klickenya host account.</p>
    <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#16130C;">${p.listingTitle}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#9C9485;">${p.listingType}${p.city ? ` · ${p.city}` : ""}</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6;">You can now manage this listing from your dashboard, and all enquiries will come directly to your email address.</p>
    ${cta("Go to Dashboard", "https://klickenya.com/dashboard")}
    <p style="margin-top:24px;font-size:12px;color:#9C9485;">Questions? Reply to this email.</p>
  `);
}

// Email 2 — TO ADMIN: Listing Assigned (confirmation)
export function listingAssignedToAdminHtml(p: {
  listingTitle: string;
  hostName: string;
  hostEmail: string;
  sanityId: string;
  hostProfileId: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Listing Assigned</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Listing <strong>${p.listingTitle}</strong> assigned to <strong>${p.hostName}</strong> (${p.hostEmail}).</p>
    <p style="font-size:13px;color:#9C9485;">Sanity ID: ${p.sanityId}</p>
    <p style="font-size:13px;color:#9C9485;">Timestamp: ${new Date().toISOString()}</p>
    ${cta("View Host", `https://klickenya.com/admin/hosts/${p.hostProfileId}`)}
  `);
}

// Email 3 — TO HOST: Listing Unassigned
export function listingUnassignedToHostHtml(p: {
  hostName: string;
  listingTitle: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">A listing has been removed from your profile</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.hostName},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">The listing <strong>"${p.listingTitle}"</strong> has been removed from your host account.</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">If you think this is a mistake, please reply to this email.</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">Your other listings and dashboard access remain unchanged.</p>
    ${cta("View Dashboard", "https://klickenya.com/dashboard")}
  `);
}

// Email 4 — TO ADMIN: Listing Unassigned (confirmation)
export function listingUnassignedToAdminHtml(p: {
  listingTitle: string;
  hostName: string;
  hostEmail: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Listing Unassigned</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Listing <strong>${p.listingTitle}</strong> has been unassigned from <strong>${p.hostName}</strong> (${p.hostEmail}).</p>
    <p style="font-size:13px;color:#9C9485;">notificationEmail1 has been reset.</p>
    <p style="font-size:13px;color:#9C9485;">Timestamp: ${new Date().toISOString()}</p>
  `);
}

// Email 5 — TO NEW HOST: Account Created
export function hostWelcomeHtml(p: {
  name: string;
  email: string;
  magicLink: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">Welcome to Klickenya</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">Hi ${p.name},</p>
    <p style="font-size:14px;color:#333;line-height:1.6;">Your Klickenya host account has been created.</p>
    <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#9C9485;">Email</p>
      <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#16130C;">${p.email}</p>
    </div>
    <p style="font-size:14px;color:#333;line-height:1.6;">Use the button below to set your password and access your dashboard. This link expires in 24 hours.</p>
    ${cta("Set Up My Account", p.magicLink)}
    <p style="margin-top:24px;font-size:14px;color:#333;line-height:1.6;"><strong>What's next:</strong> Complete your host profile, and we'll assign your listings shortly.</p>
  `);
}

// Email 6 — TO ADMIN: Host Created (confirmation)
export function hostCreatedToAdminHtml(p: {
  name: string;
  email: string;
  phone: string;
  slug: string;
  hostProfileId: string;
}): string {
  return wrap(`
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16130C;">New Host Created</h1>
    <p style="font-size:14px;color:#333;line-height:1.6;">New host account created manually via admin panel.</p>
    <div style="margin:16px 0;padding:16px;background:#F5F3F0;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#9C9485;">Name: <strong style="color:#16130C;">${p.name}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#9C9485;">Email: <strong style="color:#16130C;">${p.email}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#9C9485;">Phone: <strong style="color:#16130C;">${p.phone}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#9C9485;">Slug: <strong style="color:#16130C;">${p.slug}</strong></p>
    </div>
    <p style="font-size:13px;color:#9C9485;">Magic link sent: yes</p>
    ${cta("View Host", `https://klickenya.com/admin/hosts/${p.hostProfileId}`)}
  `);
}
