import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, AdminAuthError } from "@/lib/admin/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

export async function POST(request: NextRequest) {
  try {
    await assertAdmin(request);
    const { type, id } = await request.json();

    if (!type || !id) {
      return NextResponse.json(
        { error: "type and id are required" },
        { status: 400 }
      );
    }

    if (type !== "contact_request" && type !== "property_enquiry") {
      return NextResponse.json(
        { error: 'type must be "contact_request" or "property_enquiry"' },
        { status: 400 }
      );
    }

    let contextPrompt: string;

    if (type === "contact_request") {
      const { data: record, error } = await adminClient
        .from("contact_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !record) {
        return NextResponse.json(
          { error: "Contact request not found" },
          { status: 404 }
        );
      }

      let listingInfo = "";
      if (record.listing_id) {
        const listing = await sanityClient.fetch(
          `*[_type == "listing" && _id == $id][0]{ title, type, city, price, priceUnit }`,
          { id: record.listing_id }
        );
        if (listing) {
          listingInfo = `\nListing details:\n- Title: ${listing.title}\n- Type: ${listing.type}\n- City: ${listing.city}\n- Price: ${listing.price} ${listing.priceUnit || ""}`.trim();
        }
      }

      contextPrompt = `Please draft a reply to the following contact request:

Enquirer name: ${record.name}
Enquirer email: ${record.email}
Enquiry type: Contact request
Listing: ${record.listing_title || "N/A"}${listingInfo}
${record.message ? `\nCustomer message:\n${record.message}` : ""}
${record.phone ? `Phone: ${record.phone}` : ""}`;
    } else {
      const { data: record, error } = await adminClient
        .from("property_enquiries")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !record) {
        return NextResponse.json(
          { error: "Property enquiry not found" },
          { status: 404 }
        );
      }

      let propertyInfo = "";
      if (record.property_id) {
        const property = await sanityClient.fetch(
          `*[_type == "property" && _id == $id][0]{ title, listingCategory, city, neighbourhood, price, priceType, "agent": agent->{ displayName, phone } }`,
          { id: record.property_id }
        );
        if (property) {
          propertyInfo = `\nProperty details:\n- Title: ${property.title}\n- Category: ${property.listingCategory}\n- Location: ${property.neighbourhood ? `${property.neighbourhood}, ` : ""}${property.city}\n- Price: ${property.price} (${property.priceType || "N/A"})`;
          if (property.agent) {
            propertyInfo += `\n- Agent: ${property.agent.displayName}${property.agent.phone ? ` (${property.agent.phone})` : ""}`;
          }
        }
      }

      contextPrompt = `Please draft a reply to the following property enquiry:

Enquirer name: ${record.name}
Enquirer email: ${record.email}
Enquiry type: Property enquiry
Property: ${record.property_title || "N/A"}${propertyInfo}
${record.message ? `\nCustomer message:\n${record.message}` : ""}
${record.phone ? `Phone: ${record.phone}` : ""}`;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        draft: `Thank you for your enquiry. We appreciate your interest and will get back to you with more details shortly.\n\nIf you have any additional questions in the meantime, please don't hesitate to reach out.\n\nWarm regards,\nThe Klickenya Team`,
      });
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system:
          "You are a helpful customer service agent for Klickenya, a Kenyan travel and real estate platform. Write a warm, professional reply email to the customer's enquiry. Be concise (2-3 short paragraphs). Use the provided context about the listing/property. Sign off as 'The Klickenya Team'. Do not include a subject line.",
        messages: [{ role: "user", content: contextPrompt }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", await res.text());
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const textBlock = data.content?.[0];

    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: textBlock.text });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("AI draft error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
