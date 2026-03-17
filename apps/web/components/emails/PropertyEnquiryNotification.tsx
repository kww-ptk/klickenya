interface PropertyEnquiryNotificationProps {
  propertyTitle: string;
  propertyUrl: string;
  enquirerName: string;
  enquirerEmail: string;
  enquirerPhone: string;
  enquiryType: string;
  mortgageInterest: boolean;
  message?: string;
}

export function propertyEnquiryNotificationHtml(props: PropertyEnquiryNotificationProps): string {
  const {
    propertyTitle,
    propertyUrl,
    enquirerName,
    enquirerEmail,
    enquirerPhone,
    enquiryType,
    mortgageInterest,
    message,
  } = props;

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
  <title>New Property Enquiry</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#8B4DAB;padding:24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Klickenya Real Estate</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111;">New Property Enquiry</h1>

              <!-- Property Info -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Property</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Title</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${propertyTitle}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Link</td>
                  <td style="padding:8px 12px;font-size:14px;"><a href="${propertyUrl}" style="color:#8B4DAB;text-decoration:underline;">View property</a></td>
                </tr>
              </table>

              <!-- Enquirer Contact -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Enquirer Contact</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Name</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${enquirerName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Email</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;"><a href="mailto:${enquirerEmail}" style="color:#8B4DAB;text-decoration:underline;">${enquirerEmail}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Phone</td>
                  <td style="padding:8px 12px;font-size:14px;"><a href="tel:${enquirerPhone}" style="color:#8B4DAB;text-decoration:underline;">${enquirerPhone}</a></td>
                </tr>
              </table>

              <!-- Enquiry Details -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">Enquiry Details</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Enquiry Type</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;">${enquiryType}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Mortgage Interest</td>
                  <td style="padding:8px 12px;color:#333;font-size:14px;">
                    <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:13px;font-weight:600;${mortgageInterest ? "background-color:#D1FAE5;color:#065F46;" : "background-color:#F3F4F6;color:#6B7280;"}">${mortgageInterest ? "Yes" : "No"}</span>
                  </td>
                </tr>
              </table>

              ${messageSection}
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
