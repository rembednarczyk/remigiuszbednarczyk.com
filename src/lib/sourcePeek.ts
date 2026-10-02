import heroJson from "../content/hero.json?raw";

/**
 * The source shown behind the view-source glitch on the hero.
 *
 * It is the section's real content file — src/content/hero.json — imported as
 * text at build time (Vite's `?raw`), never hand-copied. A copied snippet
 * drifts from the file the first time either is edited; this one cannot,
 * because it *is* the file. The hero renders from exactly these values, down
 * to the `{{yearsOfExperience}}` placeholder the page fills in at render, so a
 * visitor reading the panel is reading what the page is built from.
 *
 * Showing the data file rather than the component's JSX is also what keeps the
 * panel clean: the markup carries Tailwind classes and `print:hidden` flags
 * that are noise to a reader, while the JSON is only the words. No slicing and
 * no markers either — the file is shown whole.
 *
 * The easter egg is prepended here, not stored in the content: JSON has no
 * comment syntax to hold it, and a greeting written for whoever opens the
 * panel is not something the page should render.
 */

interface SourcePeek {
  /** The file the code came from, shown as the panel's header. */
  file: string;
  /** The egg, then the real content file verbatim. */
  code: string;
}

const EASTER_EGG = [
  "// Reading the source? good eye.",
  "// Have a look at the rest of my portfolio.",
].join("\n");

export const heroPeek: SourcePeek = {
  file: "hero.json",
  code: `${EASTER_EGG}\n\n${heroJson.trim()}`,
};
