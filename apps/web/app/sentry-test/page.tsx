"use client";
// TEMPORARY — delete this file after Sentry verification is complete

import * as Sentry from "@sentry/nextjs";

export default function SentryTestPage() {
  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Sentry Test</h1>

      <button
        onClick={() => {
          throw new Error("Sentry button-thrown error — " + new Date().toISOString());
        }}
        style={{ padding: "12px 20px", marginRight: 12, background: "#f59e0b", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
      >
        Throw client error
      </button>

      <button
        onClick={() => {
          Sentry.captureException(new Error("Sentry explicit captureException — " + new Date().toISOString()));
          alert("Sent via Sentry.captureException — check Sentry Issues page in 30s");
        }}
        style={{ padding: "12px 20px", background: "#10b981", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}
      >
        Send via captureException
      </button>
    </main>
  );
}
