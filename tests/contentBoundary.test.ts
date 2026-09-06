import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as cards from "../src/data/portfolioData";
import * as facts from "../src/data/portfolioFacts";
import { fillPlaceholders } from "../src/data/placeholders";
import { withoutComments } from "../scripts/withoutComments";

/**
 * The split is only worth having if it stays true.
 *
 * Every word the site states now lives in src/content as JSON, and two
 * modules assemble it into the typed shapes the page and the build read:
 * portfolioFacts.ts, which carries no JSX so the Vite config can load it,
 * and portfolioData.tsx, which draws the cards. That arrangement buys one
 * thing: an editor outside this repository can change what the site says
 * by rewriting a JSON file. It
 * buys nothing at all the moment a sentence goes back into the TypeScript,
 * because then the editor shows a page it cannot fully change and nothing
 * says which half is which.
 *
 * Nothing in a type system can notice that. A string literal added to the
 * assembly layer compiles, renders, and passes every check this repository
 * had before this file: the content snapshot records the new sentence as
 * happily as an old one, since it is a characterization of the page and the
 * page did change on purpose.
 *
 * So the property is stated directly. The assembly layer is allowed to do
 * exactly two things to content — fill a placeholder, and join an array of
 * parts into one string — and every word it hands out has to be traceable
 * to a content file through one of them. It invents nothing.
 */

const root = resolve(__dirname, "..");

/** Every source file under a directory, so "unread" means unread by anything. */
function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listSources(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}
const contentDir = resolve(root, "src/content");

const contentFiles = readdirSync(contentDir).filter((entry) => entry.endsWith(".json"));

/** Everything in the content tree, as parsed JSON. */
const content = contentFiles.map(
  (file) => JSON.parse(readFileSync(resolve(contentDir, file), "utf8")) as unknown,
);

function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];

  // A React element or a component, which is drawing rather than content.
  // The card modules hand out both, and the Tailwind classes inside them
  // are presentation the assembly layer is supposed to own — what content
  // names is the icon and the accent, and tests/icons.test.ts holds those.
  // `$$typeof` catches both, since lucide's icons are forwardRef objects
  // and asking whether one is a function gets the wrong answer.
  if (value !== null && typeof value === "object" && "$$typeof" in value) return [];

  if (Array.isArray(value)) {
    // Both the parts and what joining them produces, because that join is
    // the second of the two things the assembly layer is allowed to do:
    // a phone number's href is its parts run together.
    const joined = value.every((item) => typeof item === "string") ? [value.join("")] : [];
    return [...joined, ...value.flatMap(stringsIn)];
  }
  if (value !== null && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

/**
 * What content is allowed to become. The same substitution the module
 * performs, applied here so a filled placeholder is not read as an invented
 * word — and only that substitution, so anything else still is.
 */
const VALUES = { yearsOfExperience: String(facts.yearsOfExperience) };
const offered = new Set(stringsIn(fillPlaceholders(content, VALUES)));

/**
 * Everything the two assembly modules hand to the page and to the build.
 * Both of them, because the split was drawn twice: portfolioFacts.ts is
 * what the build can load, portfolioData.tsx is what needs JSX, and a rule
 * that held for one of them would leave the other free to state sentences
 * — which is exactly where the 79 the second migration moved had been.
 */
const handedOut = stringsIn([...Object.values(facts), ...Object.values(cards)]);

describe("the content tree", () => {
  it("has a file for each thing the site says, and the modules read them all", () => {
    // Matched on `content/<file>` rather than on `../content/<file>`,
    // because the page's own layout is read by src/App.tsx, one level up
    // from the rest, where the specifier is `./content/...`. The stricter
    // pattern called that file an orphan.
    //
    // Every source file, not the two assembly modules: the printed CV's
    // layout is read by the template that draws it, which is where a
    // layout belongs, and a check that knew about only two readers would
    // have called that file an orphan.
    //
    // Comments out first. Thirteen section files name `pageLayout.json` in
    // their doc comments — tests/sectionIdentity.test.ts requires them to —
    // so the bughunt removed its real import from App.tsx and this stayed
    // green on the prose about it; cvLayout.json had the same cover.
    const modules = listSources(resolve(root, "src"))
      .map((file) => withoutComments(readFileSync(file, "utf8")))
      .join("\n");

    const unread = contentFiles.filter((file) => !modules.includes(`content/${file}`));

    expect(
      unread,
      `these are in src/content and neither assembly module imports them, so they ship to nobody and drift unnoticed:\n  ${unread.join("\n  ")}`,
    ).toEqual([]);
    expect(contentFiles.length).toBeGreaterThan(5);
  });

  it("is read as more than a handful of strings, so the check below is not vacuous", () => {
    // Measured: 372 distinct strings offered, 436 handed out. The numbers
    // are not the point — an empty haystack passing every containment
    // check is.
    expect(offered.size).toBeGreaterThan(300);
    expect(handedOut.length).toBeGreaterThan(300);
  });
});

describe("what the assembly layer hands out", () => {
  it("comes from a content file, every word of it", () => {
    const invented = [...new Set(handedOut)].filter((text) => !offered.has(text));

    expect(
      invented,
      `these are stated in an assembly module and in no content file, so an editor rewriting the content cannot change them:\n  ${invented.map((text) => `"${text}"`).join("\n  ")}`,
    ).toEqual([]);
  });
});
