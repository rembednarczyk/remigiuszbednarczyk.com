import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import pageLayout from "../src/content/pageLayout.json" with { type: "json" };
import { PAGE_BODY_NAMES } from "../src/data/vocabulary";

/**
 * A section component says which band it is, and is held to it.
 *
 * `ExpertiseSection.tsx` used to tell a reader its heading, its number, its
 * anchor and its shape in one file. Those four moved to
 * `src/content/pageLayout.json` so somebody outside this repository could
 * arrange them, and what was left behind is a bare grid that says nothing
 * about where it appears. AI_INSTRUCTIONS carries the reading map for the
 * whole path; this is the pointer at the other end of it, in the file
 * somebody actually opened.
 *
 * It is checked rather than written and left, and the reason is one file
 * away. `portfolioData.tsx` carried a comment saying everything in
 * `portfolioFacts.ts` was re-exported through it so a component could
 * import the whole set from one module. Nothing was. There was no
 * re-export and there never had been, and the sentence had been read past
 * by everyone for as long as it existed — a comment is held to the code by
 * nothing at all.
 *
 * So each comment names its band in backticks and this holds that name to
 * the registry and the layout. What it deliberately does **not** let a
 * comment repeat is the heading: that is content, an owner may rewrite it
 * from the editor, and a comment quoting it would be stale the first time
 * they did.
 */

const root = resolve(__dirname, "..");
const registry = readFileSync(resolve(root, "src/components/PageBodies.tsx"), "utf8");

/**
 * Where the registry imports a component from, by reading its import lines
 * rather than matching a pattern shaped like one.
 *
 * A regular expression for an import statement necessarily contains the
 * literal `from` followed by a quote, and `tests/dependencies.test.ts`
 * scans source for exactly that to find undeclared packages. Written the
 * obvious way, this file claimed to import a package called `\.\` — the
 * third string in this session to be read as an import it was not, and the
 * check was right every time.
 */
function importedFrom(component: string): string {
  const line = registry
    .split("\n")
    .find((text) => text.startsWith("import { ") && text.includes(`{ ${component} }`));

  if (line === undefined) return "?";

  const quoted = line.slice(line.indexOf('"') + 1, line.lastIndexOf('"'));

  return quoted.replace(/^\.\//, "");
}

/** Each band's name, the component drawing it, and where that file is. */
const bands = [...registry.matchAll(/^ {2}(\w+): (\w+),$/gm)].map(([, band, component]) => ({
  band: String(band),
  component: String(component),
  file: `src/components/${importedFrom(String(component))}.tsx`,
}));

const names = bands.map(({ band }) => band);

/** The doc comment immediately above the component's declaration. */
function docCommentOf({ component, file }: { component: string; file: string }): string {
  const source = readFileSync(resolve(root, file), "utf8");
  const found = new RegExp(`(/\\*\\*[\\s\\S]*?\\*/)\\s*export function ${component}\\(`).exec(
    source,
  );

  return found === null ? "" : found[1];
}

describe("the section components", () => {
  it("are all found, with the file each lives in", () => {
    // Everything below reads this list. Parsed out of the registry rather
    // than typed here, so a fourteenth band is covered without anyone
    // remembering to add it — and a parse that quietly found nothing would
    // make every check below pass over an empty list. The count is the
    // vocabulary's, not a literal: the bughunt found `13` written here
    // under a comment promising the fourteenth would need no one to
    // remember, which is what a literal is for.
    expect(PAGE_BODY_NAMES.length).toBeGreaterThan(10);
    expect([...names].sort()).toEqual([...PAGE_BODY_NAMES].sort());
    expect(bands.every(({ file }) => file.endsWith("Section.tsx"))).toBe(true);
    expect(names).toEqual([...new Set(names)]);
  });

  it("each carry a doc comment", () => {
    const silent = bands.filter((band) => docCommentOf(band) === "").map(({ file }) => file);

    expect(
      silent,
      `these draw a band of the page and say nothing about which:\n  ${silent.join("\n  ")}`,
    ).toEqual([]);
  });

  it("each name the band the registry maps to them", () => {
    const wrong = bands
      .filter((band) => !docCommentOf(band).includes(`\`${band.band}\``))
      .map(({ file, band }) => `${file} does not name \`${band}\``);

    expect(
      wrong,
      `a component that names no band, or a band it is not:\n  ${wrong.join("\n  ")}`,
    ).toEqual([]);
  });

  it("name no other band, so a copied comment is caught", () => {
    // The way thirteen near-identical comments go wrong: one is pasted from
    // its neighbour and the name is left behind. It reads perfectly.
    const confused = bands.flatMap((entry) => {
      const comment = docCommentOf(entry);

      return names
        .filter((other) => other !== entry.band && comment.includes(`\`${other}\``))
        .map((other) => `${entry.file} is the ${entry.band} band and names \`${other}\``);
    });

    expect(confused, `\n  ${confused.join("\n  ")}`).toEqual([]);
  });
});

describe("what each comment claims about its band", () => {
  const numbered = new Set(
    pageLayout.sections.flatMap((section) => ("title" in section ? [section.body] : [])),
  );

  it("finds both kinds, so neither case below is vacuous", () => {
    // Both kinds present is the guard; how many of each is the layout's
    // to decide. Written as `10` and `3`, a fourteenth band turned this
    // red with nothing wrong — the count had to be edited by hand, which
    // the comment above the registry promised nobody would have to.
    expect(numbered.size).toBeGreaterThan(0);
    expect(bands.length - numbered.size).toBeGreaterThan(0);
    expect([...numbered].every((band) => names.includes(band))).toBe(true);
  });

  it("matches whether the layout gives it a heading", () => {
    // The one claim a comment makes that could be wrong without anybody
    // noticing: three of the thirteen render their own element and take no
    // heading, and the difference is invisible from inside the file.
    const mismatched = bands
      .map((band) => ({ ...band, comment: docCommentOf(band) }))
      .filter(({ band, comment }) =>
        numbered.has(band)
          ? !comment.includes("numbered run") || comment.includes("renders its own element")
          : !comment.includes("renders its own element"),
      )
      .map(
        ({ file, band }) =>
          `${file} is ${numbered.has(band) ? "" : "not "}numbered and its comment says otherwise`,
      );

    expect(mismatched, `\n  ${mismatched.join("\n  ")}`).toEqual([]);
  });

  it("points at the two files that decide the rest", () => {
    const unhelpful = bands
      .map((band) => ({ ...band, comment: docCommentOf(band) }))
      .filter(
        ({ comment }) =>
          !comment.includes("src/content/pageLayout.json") ||
          !comment.includes("src/components/PageBodies.tsx"),
      )
      .map(({ file }) => file);

    expect(
      unhelpful,
      `these orient a reader without saying where to look next:\n  ${unhelpful.join("\n  ")}`,
    ).toEqual([]);
  });
});
