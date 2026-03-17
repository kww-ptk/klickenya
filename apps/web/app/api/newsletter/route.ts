import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import * as React from "react";

/* ---------- Validation ---------- */

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
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
      "Welcome to Klickenya Journal"
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
      "Thanks for subscribing! You'll receive our best travel stories, insider tips, and curated guides to exploring Kenya."
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
      "From stunning safari destinations to hidden coastal gems, we'll keep you inspired for your next adventure."
    ),
    React.createElement(
      "a",
      {
        href: "https://klickenya.com/journal",
        style: {
          display: "inline-block",
          backgroundColor: "#f59e0b",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "9999px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
        },
      },
      "Explore the Journal"
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

    const { email } = parsed.data;

    /* Save to Supabase */
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email });

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
          subject: "Welcome to Klickenya Journal",
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
