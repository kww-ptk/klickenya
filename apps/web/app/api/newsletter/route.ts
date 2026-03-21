import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import * as React from "react";

/* ---------- Validation ---------- */

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  source: z.string().optional().default("website"),
});

/* ---------- Welcome email template ---------- */

function WelcomeEmail() {
  return React.createElement(
    "div",
    {
      style: {
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        maxWidth: "520px",
        margin: "0 auto",
        padding: "40px 24px",
        color: "#1a1a1a",
      },
    },
    React.createElement("img", {
      src: "https://klickenya.com/logo.png",
      alt: "Klickenya",
      width: 140,
      height: 40,
      style: { marginBottom: "32px" },
    }),
    React.createElement(
      "h1",
      {
        style: {
          fontSize: "24px",
          fontWeight: 700,
          marginBottom: "16px",
          color: "#1a1a1a",
        },
      },
      "We got you! \u2728"
    ),
    React.createElement(
      "p",
      {
        style: {
          fontSize: "16px",
          lineHeight: "1.6",
          color: "#555",
          marginBottom: "16px",
        },
      },
      "You will be notified soon about Klickenya."
    ),
    React.createElement(
      "p",
      {
        style: {
          fontSize: "16px",
          lineHeight: "1.6",
          color: "#555",
          marginBottom: "16px",
        },
      },
      "Just so you know, you will be able to find the best that Kenya has to offer, both for residents and tourists \u2014 events, parties, tours, special deals, and much more."
    ),
    React.createElement(
      "p",
      {
        style: {
          fontSize: "16px",
          lineHeight: "1.6",
          color: "#555",
          marginBottom: "24px",
        },
      },
      "Thank you once again!"
    ),
    React.createElement(
      "a",
      {
        href: "https://klickenya.com",
        style: {
          display: "inline-block",
          backgroundColor: "#E8A020",
          color: "#16130C",
          padding: "12px 24px",
          borderRadius: "9999px",
          fontSize: "14px",
          fontWeight: 700,
          textDecoration: "none",
        },
      },
      "Visit Klickenya"
    ),
    React.createElement(
      "p",
      {
        style: {
          fontSize: "13px",
          color: "#999",
          marginTop: "32px",
          borderTop: "1px solid #eee",
          paddingTop: "16px",
        },
      },
      "You're receiving this because you subscribed at klickenya.com. You can unsubscribe at any time."
    )
  );
}

/* ---------- POST handler ---------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;

    /* Save to Supabase */
    const supabase = await createClient();
    // Try with source column first, fallback without it if column doesn't exist yet
    let { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email, source });

    if (dbError && dbError.code === "42703") {
      // Column doesn't exist yet — insert without source
      const res = await supabase
        .from("newsletter_subscribers")
        .insert({ email });
      dbError = res.error;
    }

    if (dbError) {
      // Unique constraint violation — email already subscribed
      if (dbError.code === "23505") {
        return NextResponse.json({ success: true, message: "Already subscribed" });
      }
      console.error("Newsletter DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    /* Send welcome email via Resend (only if API key is configured) */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Klickenya <hello@klickenya.com>",
          to: email,
          subject: "We got you! Welcome to Klickenya \u2728",
          react: React.createElement(WelcomeEmail),
        });
      } catch (emailError) {
        // Log but don't fail the subscription if email sending fails
        console.error("Welcome email error:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
