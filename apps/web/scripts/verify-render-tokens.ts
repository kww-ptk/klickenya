import { renderLandingHtml } from "../lib/storefront/renderTokens";

const ctx = { menuSlug: "tandoori-menu", menuSections: null, accentHex: "#0055FF", siteUrl: "https://klickenya.com" };

let ok = true;
const out = renderLandingHtml("<h1>Hi</h1>{{BOOKING}}{{MENU}}", ctx);
if (!out.includes("/embed/reservations/tandoori-menu?accent=0055FF")) { ok = false; console.error("FAIL booking:", out); }
if (!out.includes("kk-menu--empty")) { ok = false; console.error("FAIL empty menu:", out); }
const full = renderLandingHtml("<!doctype html><html><head><style>.x{}</style></head><body><main>Hi</main></body></html>", ctx);
if (!full.includes("<main>Hi</main>") || full.includes("<body")) { ok = false; console.error("FAIL extract:", full); }
const noMenu = renderLandingHtml("{{BOOKING}}", { ...ctx, menuSlug: null });
if (noMenu.trim() !== "") { ok = false; console.error("FAIL no-menu booking:", noMenu); }
if (!ok) process.exit(1);
console.log("PASS renderTokens");
