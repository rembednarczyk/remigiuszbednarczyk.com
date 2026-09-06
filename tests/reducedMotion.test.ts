import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A visitor who asks for less motion is answered by the whole page, not only
 * the parts motion/react drives.
 *
 * motion/react honours the preference through MotionProvider, and the
 * particle canvas checks it in JS — but a plain Tailwind `animate-*` utility
 * is a CSS keyframe animation neither governs, and the second bughunt found
 * a chevron bouncing forever under the preference and a menu sliding in. The
 * defence is a single global block that neutralises animation and transition
 * under the preference; this holds it in place, and holds the one exception
 * — the spinner, which is progress feedback the preference still wants
 * turning — so a blanket reset that silently stopped it would be caught.
 */

const css = readFileSync(resolve(__dirname, "..", "src", "index.css"), "utf8");

/** The body of the `@media (prefers-reduced-motion: reduce)` block. */
function reducedMotionBlock(source: string): string {
  const start = source.search(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  if (start === -1) return "";

  // From the opening brace of the at-rule, walk braces to its matching close.
  let depth = 0;
  let body = "";
  for (let i = source.indexOf("{", start); i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
    body += ch;
  }
  return body;
}

describe("the reduced-motion guard", () => {
  const block = reducedMotionBlock(css);

  it("exists at all", () => {
    expect(block, "src/index.css has no prefers-reduced-motion block").not.toBe("");
  });

  it("neutralises animation, so a decorative Tailwind animate-* cannot run on", () => {
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });

  it("keeps the spinner turning, since it is progress feedback and not decoration", () => {
    // The one animation the preference still wants: without this the blanket
    // reset above would freeze the loading spinner too.
    expect(block).toMatch(/\.animate-spin\s*\{[^}]*animation-iteration-count:\s*infinite\s*!important/);
  });
});
