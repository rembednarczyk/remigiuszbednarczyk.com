import heroRaw from "../components/sections/HeroSection.tsx?raw";

/**
 * The fragment of a section's own source shown behind the view-source glitch.
 *
 * The code is sliced from the component file imported as text at build time
 * (Vite's `?raw`), never hand-copied — a copied snippet drifts away from the
 * component the first time either is edited, and the whole point of the effect
 * is that a visitor is reading the code that actually shipped. The range is
 * marked in the source with a `peek:start` / `peek:end` comment pair, and
 * `extractPeek` throws when the pair is missing the way `iconOf` and
 * `accentOf` throw on a name they do not have: a marker deleted by accident
 * fails the build rather than quietly leaving an empty panel.
 */

interface SourcePeek {
  /** The component file's name, shown as the panel's header. */
  file: string;
  /** The real source between the markers, dedented. */
  code: string;
}

const START = "peek:start";
const END = "peek:end";

function dedent(block: string): string {
  const lines = block.replace(/\s+$/, "").split("\n");
  const bodies = lines.filter((line) => line.trim().length > 0);
  const indent = bodies.length
    ? Math.min(...bodies.map((line) => (/^ */.exec(line)?.[0].length ?? 0)))
    : 0;
  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
}

function extractPeek(raw: string, file: string): string {
  const from = raw.indexOf(START);
  const to = raw.indexOf(END);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(
      `${file} has no ${START}…${END} region, so the view-source glitch has nothing to show behind it`,
    );
  }
  // Between the end of the start marker's line and the start of the end
  // marker's line, so neither marker comment appears in the panel.
  const body = raw.slice(raw.indexOf("\n", from) + 1, raw.lastIndexOf("\n", to));
  return dedent(body);
}

/** The Hero's greeting and name — the recognisable opener, and the first egg. */
export const heroPeek: SourcePeek = {
  file: "HeroSection.tsx",
  code: extractPeek(heroRaw, "HeroSection.tsx"),
};
