import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

/* ---------- Supabase ---------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- Zod schema ---------- */

const listingRequestSchema = z.object({
  // Required for all
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  listingAs: z.enum(["agent", "owner", "developer", "other"]),
  consentGiven: z.boolean().refine((v) => v === true),

  // Agent fields
  agencyName: z.string().optional(),
  licenceNumber: z.string().optional(),
  propertyCount: z.string().optional(),
  cities: z.array(z.string()).optional(),
  specialisations: z.array(z.string()).optional(),
  agentWebsite: z.string().optional(),
  agentNotes: z.string().optional(),

  // Owner fields
  propertyType: z.string().optional(),
  transactionType: z.string().optional(),
  ownerCity: z.string().optional(),
  neighbourhood: z.string().optional(),
  askingPrice: z.string().optional(),
  monthlyRent: z.string().optional(),
  leaseDuration: z.string().optional(),
  bedrooms: z.string().optional(),
  sizeSqm: z.string().optional(),
  features: z.array(z.string()).optional(),
  ownerDescription: z.string().optional(),
  photoOption: z.string().optional(),
  photoUrl: z.string().optional(),

  // Developer fields
  devName: z.string().optional(),
  devType: z.string().optional(),
  devCity: z.string().optional(),
  totalUnits: z.string().optional(),
  startingPrice: z.string().optional(),
  completionStatus: z.string().optional(),
  expectedCompletion: z.string().optional(),
  unitTypes: z.array(z.string()).optional(),
  devAmenities: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  devWebsite: z.string().optional(),
  devNotes: z.string().optional(),

  // Other fields
  otherDescription: z.string().optional(),
  otherCity: z.string().optional(),
  otherPrice: z.string().optional(),
});

type ListingRequestData = z.infer<typeof listingRequestSchema>;

/* ---------- Helpers ---------- */

function buildNotes(data: ListingRequestData): string {
  const lines: string[] = [];

  switch (data.listingAs) {
    case "agent":
      lines.push("PROPERTY LISTING REQUEST — AGENT");
      lines.push("");
      if (data.agencyName) lines.push(`Agency: ${data.agencyName}`);
      if (data.licenceNumber) lines.push(`Licence: ${data.licenceNumber}`);
      if (data.propertyCount) lines.push(`Properties: ${data.propertyCount}`);
      if (data.cities?.length) lines.push(`Cities: ${data.cities.join(", ")}`);
      if (data.specialisations?.length)
        lines.push(`Specialisations: ${data.specialisations.join(", ")}`);
      if (data.agentWebsite) lines.push(`Website: ${data.agentWebsite}`);
      if (data.agentNotes) lines.push(`Notes: ${data.agentNotes}`);
      break;

    case "owner":
      lines.push("PROPERTY LISTING REQUEST — OWNER");
      lines.push("");
      if (data.propertyType) lines.push(`Property: ${data.propertyType}`);
      if (data.transactionType) lines.push(`Transaction: ${data.transactionType}`);
      if (data.ownerCity) lines.push(`City: ${data.ownerCity}`);
      if (data.neighbourhood) lines.push(`Neighbourhood: ${data.neighbourhood}`);
      if (data.askingPrice) lines.push(`Asking price: ${data.askingPrice}`);
      if (data.monthlyRent) lines.push(`Monthly rent: ${data.monthlyRent}`);
      if (data.leaseDuration) lines.push(`Lease duration: ${data.leaseDuration}`);
      if (data.bedrooms) lines.push(`Bedrooms: ${data.bedrooms}`);
      if (data.sizeSqm) lines.push(`Size (sqm): ${data.sizeSqm}`);
      if (data.features?.length) lines.push(`Features: ${data.features.join(", ")}`);
      if (data.ownerDescription) lines.push(`Description: ${data.ownerDescription}`);
      if (data.photoOption) lines.push(`Photos: ${data.photoOption}`);
      if (data.photoUrl) lines.push(`Photo URL: ${data.photoUrl}`);
      break;

    case "developer":
      lines.push("PROPERTY LISTING REQUEST — DEVELOPER");
      lines.push("");
      if (data.devName) lines.push(`Project: ${data.devName}`);
      if (data.devType) lines.push(`Type: ${data.devType}`);
      if (data.devCity) lines.push(`City: ${data.devCity}`);
      if (data.totalUnits) lines.push(`Units: ${data.totalUnits}`);
      if (data.startingPrice) lines.push(`Starting price: ${data.startingPrice}`);
      if (data.completionStatus) lines.push(`Completion: ${data.completionStatus}`);
      if (data.expectedCompletion)
        lines.push(`Expected completion: ${data.expectedCompletion}`);
      if (data.unitTypes?.length)
        lines.push(`Unit types: ${data.unitTypes.join(", ")}`);
      if (data.devAmenities?.length)
        lines.push(`Amenities: ${data.devAmenities.join(", ")}`);
      if (data.materials?.length)
        lines.push(`Materials: ${data.materials.join(", ")}`);
      if (data.devWebsite) lines.push(`Website: ${data.devWebsite}`);
      if (data.devNotes) lines.push(`Notes: ${data.devNotes}`);
      break;

    case "other":
      lines.push("PROPERTY LISTING REQUEST — OTHER");
      lines.push("");
      if (data.otherDescription) lines.push(`Description: ${data.otherDescription}`);
      if (data.otherCity) lines.push(`City: ${data.otherCity}`);
      if (data.otherPrice) lines.push(`Price: ${data.otherPrice}`);
      break;
  }

  return lines.join("\n");
}

function labelForListingAs(listingAs: string): string {
  switch (listingAs) {
    case "agent":
      return "Agent";
    case "owner":
      return "Owner";
    case "developer":
      return "Developer";
    default:
      return "Other";
  }
}

function subjectIdentifier(data: ListingRequestData): string {
  switch (data.listingAs) {
    case "agent":
      return data.agencyName || data.name;
    case "owner":
      return data.ownerCity || data.name;
    case "developer":
      return data.devName || data.name;
    case "other":
      return data.otherCity || data.name;
  }
}

/* ---------- Email builders ---------- */

const logoImg = `<img src="https://klickenya.com/logo-profile.jpg" width="48" height="48" alt="Klickenya" style="border-radius: 50%; display: block;" />`;

function buildAdminEmailHtml(data: ListingRequestData): string {
  const label = labelForListingAs(data.listingAs);

  const rows: [string, string][] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Listing as", label],
  ];

  switch (data.listingAs) {
    case "agent":
      if (data.agencyName) rows.push(["Agency", data.agencyName]);
      if (data.licenceNumber) rows.push(["Licence #", data.licenceNumber]);
      if (data.propertyCount) rows.push(["Property count", data.propertyCount]);
      if (data.cities?.length) rows.push(["Cities", data.cities.join(", ")]);
      if (data.specialisations?.length)
        rows.push(["Specialisations", data.specialisations.join(", ")]);
      if (data.agentWebsite) rows.push(["Website", data.agentWebsite]);
      if (data.agentNotes) rows.push(["Notes", data.agentNotes]);
      break;

    case "owner":
      if (data.propertyType) rows.push(["Property type", data.propertyType]);
      if (data.transactionType) rows.push(["Transaction", data.transactionType]);
      if (data.ownerCity) rows.push(["City", data.ownerCity]);
      if (data.neighbourhood) rows.push(["Neighbourhood", data.neighbourhood]);
      if (data.askingPrice) rows.push(["Asking price", data.askingPrice]);
      if (data.monthlyRent) rows.push(["Monthly rent", data.monthlyRent]);
      if (data.leaseDuration) rows.push(["Lease duration", data.leaseDuration]);
      if (data.bedrooms) rows.push(["Bedrooms", data.bedrooms]);
      if (data.sizeSqm) rows.push(["Size (sqm)", data.sizeSqm]);
      if (data.features?.length) rows.push(["Features", data.features.join(", ")]);
      if (data.ownerDescription) rows.push(["Description", data.ownerDescription]);
      if (data.photoOption) rows.push(["Photo option", data.photoOption]);
      if (data.photoUrl) rows.push(["Photo URL", data.photoUrl]);
      break;

    case "developer":
      if (data.devName) rows.push(["Project name", data.devName]);
      if (data.devType) rows.push(["Type", data.devType]);
      if (data.devCity) rows.push(["City", data.devCity]);
      if (data.totalUnits) rows.push(["Total units", data.totalUnits]);
      if (data.startingPrice) rows.push(["Starting price", data.startingPrice]);
      if (data.completionStatus) rows.push(["Completion status", data.completionStatus]);
      if (data.expectedCompletion)
        rows.push(["Expected completion", data.expectedCompletion]);
      if (data.unitTypes?.length)
        rows.push(["Unit types", data.unitTypes.join(", ")]);
      if (data.devAmenities?.length)
        rows.push(["Amenities", data.devAmenities.join(", ")]);
      if (data.materials?.length)
        rows.push(["Materials", data.materials.join(", ")]);
      if (data.devWebsite) rows.push(["Website", data.devWebsite]);
      if (data.devNotes) rows.push(["Notes", data.devNotes]);
      break;

    case "other":
      if (data.otherDescription) rows.push(["Description", data.otherDescription]);
      if (data.otherCity) rows.push(["City", data.otherCity]);
      if (data.otherPrice) rows.push(["Price", data.otherPrice]);
      break;
  }

  const tableRows = rows
    .map(
      ([key, val]) =>
        `<tr>
          <td style="padding: 10px 12px; font-size: 13px; color: #9C9485; border-bottom: 1px solid #E2DDD5; white-space: nowrap; vertical-align: top;">${key}</td>
          <td style="padding: 10px 12px; font-size: 14px; color: #16130C; border-bottom: 1px solid #E2DDD5;">${val}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      ${logoImg}
      <h2 style="font-size: 18px; font-weight: 700; color: #16130C; margin: 20px 0 4px;">New ${label} Listing Request</h2>
      <p style="font-size: 14px; color: #5E5848; margin: 0 0 24px;">A new property listing request has been submitted.</p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2DDD5; border-radius: 8px;">
        ${tableRows}
      </table>
      <div style="margin: 24px 0 0;">
        <a href="https://admin.klickenya.com" style="display: inline-block; padding: 10px 20px; background: #E8A020; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">Review in dashboard &rarr;</a>
      </div>
      <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 32px 0 16px;" />
      <p style="font-size: 12px; color: #9C9485; margin: 0;">
        &mdash; Klickenya Property Notifications<br />
        <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
      </p>
    </div>
  `;
}

function buildConfirmationEmailHtml(data: ListingRequestData): string {
  let bodyContent = "";

  switch (data.listingAs) {
    case "agent":
      bodyContent = `
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          Thank you for registering as an agent on Klickenya Property. We have received your details
          ${data.agencyName ? `for <strong>${data.agencyName}</strong>` : ""} and will begin our verification process.
        </p>
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          We will verify your EARB licence details and get back to you within <strong>24 hours</strong> with
          next steps to set up your agent profile and start listing properties.
        </p>
      `;
      break;

    case "owner":
      bodyContent = `
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          Thank you for submitting your property listing request. We have received all the details
          ${data.propertyType ? `for your <strong>${data.propertyType}</strong>` : ""}
          ${data.ownerCity ? ` in <strong>${data.ownerCity}</strong>` : ""}.
        </p>
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          Our team will create your listing within <strong>24 hours</strong>. We may reach out if we
          need any additional information or photos.
        </p>
      `;
      break;

    case "developer":
      bodyContent = `
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          Thank you for submitting your development project
          ${data.devName ? `<strong>${data.devName}</strong>` : ""} to Klickenya Property.
          We have received your details and our team is reviewing them.
        </p>
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          We will send you an email within <strong>24 hours</strong> with a request for marketing
          materials (brochures, floor plans, renders) so we can create the best possible listing
          for your project.
        </p>
      `;
      break;

    case "other":
      bodyContent = `
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          Thank you for your listing request on Klickenya Property. We have received your details
          and our team will review them shortly.
        </p>
        <p style="font-size: 15px; color: #5E5848; margin: 0 0 16px;">
          We will be in touch soon to discuss next steps. If you have any questions in the meantime,
          feel free to reply to this email.
        </p>
      `;
      break;
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
      ${logoImg}
      <h2 style="font-size: 18px; font-weight: 700; color: #16130C; margin: 20px 0 4px;">We received your listing request</h2>
      <p style="font-size: 15px; color: #5E5848; margin: 0 0 20px;">Hi ${data.name},</p>
      ${bodyContent}
      <p style="font-size: 14px; color: #9C9485; margin: 0 0 8px;">Karibu sana,</p>
      <p style="font-size: 14px; color: #5E5848; font-weight: 600; margin: 0 0 24px;">The Klickenya Property Team</p>
      <hr style="border: none; border-top: 1px solid #E2DDD5; margin: 0 0 16px;" />
      <p style="font-size: 12px; color: #9C9485; margin: 0;">
        <a href="https://klickenya.com" style="color: #E8A020; text-decoration: none;">klickenya.com</a>
      </p>
    </div>
  `;
}

/* ---------- POST handler ---------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = listingRequestSchema.parse(body);

    /* STEP 1 — Save to Supabase */
    const { error: dbError } = await supabase
      .from("contact_requests")
      .insert({
        full_name: data.name,
        email: data.email,
        phone: data.phone,
        status: "new",
        notes: buildNotes(data),
      });

    if (dbError) {
      console.error("Listing request DB error:", dbError);
      return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }

    /* STEP 2 — Send emails via Resend */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const label = labelForListingAs(data.listingAs);
        const identifier = subjectIdentifier(data);

        // Admin notification
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          await resend.emails.send({
            from: "Klickenya Property <hello@klickenya.com>",
            to: adminEmail,
            subject: `New ${label} listing request — ${identifier}`,
            html: buildAdminEmailHtml(data),
          });
        }

        // Confirmation to submitter
        await resend.emails.send({
          from: "Klickenya Property <hello@klickenya.com>",
          to: data.email,
          subject: "We received your listing request — Klickenya Property",
          html: buildConfirmationEmailHtml(data),
        });
      } catch (emailErr) {
        console.error("Listing request email error:", emailErr);
        // Non-blocking — DB row is saved, continue
      }
    }

    /* STEP 3 — Return success */
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data. Please check your details." },
        { status: 400 }
      );
    }
    console.error("Listing request error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
