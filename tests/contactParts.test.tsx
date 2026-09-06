import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactParts } from "../src/components/ui/ContactParts";
import { cvData } from "../src/data/portfolioFacts";
import { withoutComments } from "../scripts/withoutComments";

/**
 * The contact details are kept as parts on purpose, and the purpose was
 * written nowhere.
 *
 * `CvContact` holds an address as `["hello", "@", …]` so that rendering it
 * leaves no text node carrying the whole of it. Nothing said so and nothing
 * checked it, which cost twice: `ErrorBoundary` rendered `display.join("")`
 * and put the address back together on the one screen a visitor sees when
 * something has broken, and the phone number — whose parts include spaces —
 * was announced to a screen reader as one run of twelve digits, because an
 * accessible name trims each element's contribution before concatenating.
 *
 * Both are fixed by one component that reads the trade off the data. What
 * follows holds the three claims that makes.
 */

const root = resolve(__dirname, "..");

describe("a contact detail rendered for a page", () => {
  it("leaves no text node carrying the whole address", () => {
    // The protection, stated as the property rather than as the markup: a
    // harvester walking text nodes finds fragments and joins nothing.
    render(
      <a href="#test">
        <ContactParts detail={cvData.header.email} />
      </a>,
    );

    const whole = cvData.header.email.display.join("");
    const nodes = [...document.querySelectorAll("span")].map((node) => node.textContent);

    expect(nodes.length).toBeGreaterThan(3);
    expect(nodes).not.toContain(whole);
  });

  it("still announces that address exactly", () => {
    // Fragmenting the email costs nothing, because no part of it is a space.
    render(
      <a href="#test">
        <ContactParts detail={cvData.header.email} />
      </a>,
    );

    // Asked through the role query, which computes the accessible name the
    // way a browser does. Reaching for dom-accessibility-api directly would
    // add a dependency this repository has not declared, for a computation
    // testing-library already performs.
    expect(
      screen.getByRole("link", { name: cvData.header.email.display.join("") }),
    ).toBeInTheDocument();
  });

  it("announces the phone number with its grouping, which fragmenting loses", () => {
    // Measured: fragmented it reads "+48530333243". A number heard as one
    // run of digits is worse for the person listening than a harvester
    // finding it is bad for the person receiving, so this one renders whole.
    render(
      <a href="#test">
        <ContactParts detail={cvData.header.phone} />
      </a>,
    );

    const spaced = cvData.header.phone.display.join("");

    expect(spaced).toMatch(/\s/);
    expect(screen.getByRole("link", { name: spaced })).toBeInTheDocument();
  });

  it("decides from the data rather than from a flag", () => {
    // The rule is "fragment when it costs nothing", which is a property of
    // the parts. A flag would let the two details drift apart again, which
    // is how the protection was lost the first time.
    render(
      <a href="#test">
        <ContactParts detail={{ display: ["a", "b"], href: "x" }} />
      </a>,
    );

    expect(document.querySelectorAll("span")).toHaveLength(2);
  });
});

/** Every source file, so the reach below is the whole app. */
function listSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listSources(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("who is allowed to render one", () => {
  it("is that component and nothing else", () => {
    // The class this replaced: two components rendering the same fact, one
    // keeping the protection and one not, with nothing saying which was
    // right. The same answer as PageSection, Modal and CvSection got.
    const owner = "src/components/ui/ContactParts.tsx";

    const others = listSources(resolve(root, "src"))
      .map((file) => relative(root, file).replace(/\\/g, "/"))
      .filter((file) => file !== owner)
      .filter((file) => !/\.(test|stories)\.tsx?$/.test(file))
      .filter((file) => /\.display\b/.test(withoutComments(readFileSync(resolve(root, file), "utf8"))));

    expect(
      others,
      `these read a contact detail's parts themselves instead of rendering ContactParts:\n  ${others.join("\n  ")}`,
    ).toEqual([]);
  });
});

describe("what ships to a visitor", () => {
  const bundle = () => {
    const assets = resolve(root, "dist/assets");
    if (!existsSync(assets)) return null;
    return readdirSync(assets)
      .filter((file) => file.endsWith(".js"))
      .map((file) => readFileSync(resolve(assets, file), "utf8"))
      .join("\n");
  };

  it("carries the address in pieces, if a build is here to read", () => {
    // Skipped rather than failed without a build: `npm test` runs before
    // `npm run build` in check:quality, and a check that demands the build
    // would fail for the wrong reason on a clean clone. The browser gates
    // are where a built artifact is a precondition — and so, since the
    // bughunt found this had never once run in CI, is `test:built`, which
    // check:quality runs after the build with EXPECT_BUILD set: there a
    // missing bundle is a failure, not a pass.
    const shipped = bundle();
    if (shipped === null) {
      if (process.env["EXPECT_BUILD"] !== undefined) {
        throw new Error("test:built ran and there is no dist/assets to read the bundle from");
      }
      return;
    }

    expect(shipped).not.toContain(cvData.header.email.display.join(""));
  });

  it("carries the address in pieces in the sourcemap too, if a build is here", () => {
    // The bundle fragments the address, but `sourcemap: true` ships the
    // original source beside it as a plain `.js.map` URL — and the fourth
    // bughunt found the assembled address written out in a source comment,
    // reassembled in that map, a trivial fetch for a harvester. The map is
    // where the fragmentation was quietly undone, so the map is held too.
    const assets = resolve(root, "dist/assets");
    if (!existsSync(assets)) {
      if (process.env["EXPECT_BUILD"] !== undefined) {
        throw new Error("test:built ran and there is no dist/assets to read the sourcemap from");
      }
      return;
    }

    const maps = readdirSync(assets)
      .filter((file) => file.endsWith(".js.map"))
      .map((file) => readFileSync(resolve(assets, file), "utf8"))
      .join("\n");

    expect(maps).not.toContain(cvData.header.email.display.join(""));
  });
});
