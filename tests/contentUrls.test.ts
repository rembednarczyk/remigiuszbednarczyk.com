import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every address the content names is an https one.
 *
 * A project's link is rendered as the `href` of an anchor, straight from
 * `src/content/keyProjects.json`, and nothing held what that string could
 * be: the editor checks that a field is not blank and not padded, and the
 * site checks that every word reaches a reader. A `javascript:` address
 * is stopped by React, which renders it as a throwing placeholder — measured
 * in the security sweep that added this — but `http:` ships as a mixed-
 * content link, `data:` as a page the browser may or may not open, and a
 * typo as a link to nowhere. The content is edited by a web app that
 * commits to this repository, and that commit runs this gate before the
 * deploy: so the rule sits here, where refusing is cheap, not on the
 * visitor's page.
 *
 * The rule is by key, not by value, for the reason `contentReaches` gives:
 * a list of exemptions by value grows. `url` is the one key that is an
 * address the page follows. `imageUrl` is a path into `public/` and
 * `tests/portrait.test.ts` holds it to that; `website` and `linkedin` in
 * the CV are hosts the template prefixes itself, and adding a scheme there
 * would double it.
 */

const contentDir = resolve(__dirname, "..", "src", "content");

/** Every value under a key named `url`, with where it was found. */
function urlsIn(value: unknown, at: string): { at: string; url: unknown }[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => urlsIn(entry, `${at}[${String(index)}]`));
  }
  if (value === null || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([key, inner]) =>
    key === "url" ? [{ at: `${at}.${key}`, url: inner }] : urlsIn(inner, `${at}.${key}`),
  );
}

const found = readdirSync(contentDir)
  .filter((name) => name.endsWith(".json"))
  .flatMap((name) => urlsIn(JSON.parse(readFileSync(resolve(contentDir, name), "utf8")), name));

describe("the addresses the content names", () => {
  it("exist, so the rule below holds something", () => {
    expect(found.length).toBeGreaterThan(0);
  });

  it.each(found)("$at is an https address that parses", ({ url }) => {
    expect(typeof url).toBe("string");
    expect(url).toMatch(/^https:\/\//);
    expect(() => new URL(url as string)).not.toThrow();
  });
});
