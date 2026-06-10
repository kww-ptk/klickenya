import { partnerThemeCss } from "../lib/partner/theme";
import type { Partner } from "../lib/partner/types";

const full: Partner = {
  _id: "x", name: "Test", slug: "test", domains: ["test.com"],
  logo: null, favicon: null, poweredByKlickenya: true,
  colorPrimary: "#0055FF", colorAccent: "#FF0066", colorDark: "#111111",
  fontDisplay: "Poppins", fontBody: "Inter", fontUrl: null,
  enabledModules: ["restaurant"], allowedListingTypes: ["stay"],
};

const expected =
  `:root{--color-amber:#0055FF;--color-purple:#FF0066;--color-dark:#111111;` +
  `--color-text:#111111;--font-display:"Poppins", sans-serif;--font-body:"Inter", sans-serif;}`;

let ok = true;
const got = partnerThemeCss(full);
if (got !== expected) { ok = false; console.error("FAIL full\n got:  " + got + "\n want: " + expected); }
if (partnerThemeCss(null) !== "") { ok = false; console.error("FAIL: null partner should yield ''"); }

const partial = { ...full, colorAccent: null, colorDark: null, fontDisplay: null, fontBody: null };
if (partnerThemeCss(partial) !== ":root{--color-amber:#0055FF;}") {
  ok = false; console.error("FAIL partial: " + partnerThemeCss(partial));
}
const evil = { ...partial, colorPrimary: "red;}</style><script>x" };
if (partnerThemeCss(evil).includes("<") || partnerThemeCss(evil).includes("}</")) {
  ok = false; console.error("FAIL sanitize: " + partnerThemeCss(evil));
}

if (!ok) process.exit(1);
console.log("PASS partnerThemeCss");
