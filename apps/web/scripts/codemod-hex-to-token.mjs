// One-shot codemod: replace Tailwind arbitrary-value brand hexes with the
// equivalent named token utility, so they reference var(--color-*) and become
// themeable. ONLY exact brand-token hexes are mapped; every other hex (semantic
// reds/greens/indigos, custom darks) is left untouched. 8-digit (alpha) hexes
// are left untouched. Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// hex (lowercased, no #) -> token name (matches globals.css --color-<token>)
const MAP = {
  "16130c": "dark",
  "fafaf8": "canvas",
  "f4f1ec": "surface",
  "ede9e2": "surface2",
  "e2ddd5": "border",
  "5e5848": "text2",
  "9c9485": "text3",
  "e8a020": "amber",
  "f5c842": "amber2",
  "6b2d8b": "purple",
  "8b4dab": "purple2",
  "4a1f63": "purple-dark",
  "0d7377": "teal",
  "16a34a": "green",
  "ffffff": "white",
};

const files = execSync(
  "grep -rlE '\\-\\[#[0-9A-Fa-f]{6}\\]' apps/web/app apps/web/components",
  { encoding: "utf8" }
).split("\n").filter(Boolean);

let totalFiles = 0, totalRepl = 0;
for (const file of files) {
  let src = readFileSync(file, "utf8");
  let count = 0;
  src = src.replace(/-\[#([0-9A-Fa-f]{6})\]/g, (whole, hex) => {
    const token = MAP[hex.toLowerCase()];
    if (!token) return whole; // non-brand hex: leave untouched
    count++;
    return `-${token}`;
  });
  if (count > 0) {
    writeFileSync(file, src);
    totalFiles++; totalRepl += count;
  }
}
console.log(`codemod: ${totalRepl} replacements across ${totalFiles} files`);
