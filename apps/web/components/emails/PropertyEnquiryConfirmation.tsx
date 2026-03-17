interface PropertyEnquiryConfirmationProps {
  enquirerName: string;
  propertyTitle: string;
  enquiryType: string;
  agentName?: string;
  agentPhone?: string;
}

export function propertyEnquiryConfirmationHtml(props: PropertyEnquiryConfirmationProps): string {
  const { enquirerName, propertyTitle, enquiryType, agentName, agentPhone } = props;

  const agentSection =
    agentName || agentPhone
      ? `
      <h2 style="margin:24px 0 12px;font-size:16px;font-weight:600;color:#111;">Your Agent</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
        ${agentName ? `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${agentName}</td></tr>` : ""}
        ${agentPhone ? `<tr><td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Phone</td><td style="padding:8px 12px;font-size:14px;"><a href="tel:${agentPhone}" style="color:#8B4DAB;text-decoration:underline;">${agentPhone}</a></td></tr>` : ""}
      </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Property Enquiry Confirmation</title>
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
              <p style="margin:0 0 8px;font-size:16px;color:#333;">Hi ${enquirerName},</p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111;">Your property enquiry has been sent!</h1>

              <!-- Property Summary -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="background-color:#fafafa;padding:12px;border-bottom:1px solid #e5e7eb;">
                    <strong style="font-size:14px;color:#111;">Property Details</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:14px;white-space:nowrap;">Property</td>
                  <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;font-size:14px;font-weight:600;">${propertyTitle}</td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;color:#666;font-size:14px;white-space:nowrap;">Enquiry Type</td>
                  <td style="padding:8px 12px;color:#333;font-size:14px;">${enquiryType}</td>
                </tr>
              </table>

              ${agentSection}

              <!-- What happens next -->
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111;">What happens next</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;height:32px;background-color:#F3E8FF;border-radius:50%;text-align:center;vertical-align:middle;color:#8B4DAB;font-weight:700;font-size:14px;">1</td>
                        <td style="padding-left:12px;font-size:14px;color:#333;">Your enquiry has been sent to the agent</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;height:32px;background-color:#F3E8FF;border-radius:50%;text-align:center;vertical-align:middle;color:#8B4DAB;font-weight:700;font-size:14px;">2</td>
                        <td style="padding-left:12px;font-size:14px;color:#333;">They'll review your request and get back within 2 hours</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;height:32px;background-color:#F3E8FF;border-radius:50%;text-align:center;vertical-align:middle;color:#8B4DAB;font-weight:700;font-size:14px;">3</td>
                        <td style="padding-left:12px;font-size:14px;color:#333;">Check your email for their response</td>
                      </tr>
                    </table>
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
