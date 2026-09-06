import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPersonSchema,
  escapeForScript,
  injectPersonSchema,
  renderPersonSchema,
} from "../scripts/structuredData";
import {
  cvData,
  experienceData,
  recognitionData,
} from "../src/data/portfolioFacts";

const root = resolve(__dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

/** The schema as it goes into the built page. */
const injected = () => {
  const filled = injectPersonSchema(html);
  const match = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(filled);
  expect(match, "nothing was injected").not.toBeNull();
  return JSON.parse(match![1]) as ReturnType<typeof buildPersonSchema>;
};

describe("the generated Person schema", () => {
  /**
   * The characterization for replacing the block that used to be typed out
   * in index.html. It was compared field for field against the generator
   * before it was removed, and this snapshot is what it said. A refactor is
   * not the place to change what the site claims about itself, and this is
   * what would report it if one did.
   */
  it("says what the hand-written block said", () => {
    expect(buildPersonSchema()).toMatchSnapshot();
  });

  it("is what actually reaches the page", () => {
    expect(injected()).toEqual(buildPersonSchema());
  });

  it("refuses a page with nowhere to put it", () => {
    // Silently returning the html would ship a page with no structured
    // data at all, which nothing downstream would report.
    expect(() => injectPersonSchema("<html><head></head></html>")).toThrow(
      /application\/ld\+json/,
    );
  });

  it("comes out of the data rather than a copy of it", () => {
    const schema = buildPersonSchema();

    expect(schema.name).toBe(cvData.header.name);
    expect(schema.url).toBe(`https://${cvData.header.website}`);
    expect(schema.sameAs[0]).toBe(`https://${cvData.header.linkedin}`);
    expect(schema.address.addressCountry).toBe(cvData.header.location);
    expect(schema.worksFor.name).toBe(experienceData[0].company);

    recognitionData.forEach((award) =>
      expect(schema.award).toContain(
        `${award.title} (${award.company}, ${award.issued})`,
      ),
    );
  });

  it("names no past employer the career does not mention", () => {
    // Acxiom is a client and lives inside the role text rather than in
    // `company`, so both are read.
    const mentioned = experienceData.flatMap((job) => [job.company, job.role]);

    expect(schemaEmployers().length).toBeGreaterThan(0);
    schemaEmployers().forEach((name) =>
      expect(
        mentioned.some((text) => text.includes(name)),
        `"${name}" is listed as a past employer and appears nowhere in experienceData`,
      ).toBe(true),
    );
  });

  it("renders as valid JSON at the indentation index.html expects", () => {
    const rendered = renderPersonSchema();

    expect(() => JSON.parse(rendered)).not.toThrow();
    expect(rendered.split("\n")[0]).toMatch(/^ {6}\{$/);
    // The rendered block goes between <script> tags: it must carry no raw
    // `<`, or a value holding `</script>` would close the tag early. Today's
    // data has none, so this holds the escape rather than the data.
    expect(rendered).not.toMatch(/</);
  });

  it("escapes the characters that would let a value break out of the script tag", () => {
    // JSON.stringify leaves `<` and `/` alone, so a value holding
    // `</script>` dropped between <script> tags would end the tag and turn
    // the rest of the page into markup. escapeForScript closes that: `<`,
    // `>` and `&` become their \u escapes, which JSON.parse reads back the
    // same. Every value is build-time data today; this keeps it safe if one
    // ever is not.
    const hostile = JSON.stringify({ name: "</script><img src=x onerror=alert(1)>" });
    const escaped = escapeForScript(hostile);

    expect(escaped).not.toMatch(/[<>]/);
    expect(escaped).toContain("\\u003c/script\\u003e");
    expect(JSON.parse(escaped)).toEqual({ name: "</script><img src=x onerror=alert(1)>" });
  });
});

function schemaEmployers(): string[] {
  return buildPersonSchema().alumniOf.map((org) => org.name);
}
