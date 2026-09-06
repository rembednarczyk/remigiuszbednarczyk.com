import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import viteConfig from "../vite.config";
import { ACCENTS, ICONS } from "../src/data/icons";
import {
  ACCENT_NAMES,
  AWARD_TONES,
  CV_BODY_NAMES,
  ICON_NAMES,
  OFFERED_ACCENTS,
  OFFERED_AWARD_TONES,
  OFFERED_ICONS,
  PAGE_BODY_NAMES,
  VOCABULARY,
} from "../src/data/vocabulary";

/**
 * What the editor is told it may choose, and what this site will actually
 * accept.
 *
 * The content editor is a separate program in a separate repository. It
 * cannot compile this one, so the names it offers come over HTTP from
 * `/vocabulary.json`, written at build from `src/data/vocabulary.ts`. That
 * is one list served, not a second list maintained — the failure this
 * repository already has a ratchet for, since `declaredDomain` exists
 * because one address lived in eight places and a move took some of them.
 *
 * Most of the agreement is the compiler's. Each registry is written
 * `satisfies Record<Name, …>`, checked in both directions: measured, a
 * missing key is TS1360 and an extra one TS2353. What is left for a test is
 * everything the compiler cannot see —
 *
 *   - that the plugin writing the file is still registered, since removing
 *     it breaks nothing else and the editor would go on offering whatever
 *     the last deploy served;
 *   - that the served shape is the one an editor reads, key by key;
 *   - that a name on offer is a name some content file actually uses, which
 *     is where a list quietly grows.
 */

const root = resolve(__dirname, "..");

describe("the vocabulary the build serves", () => {
  it("is written by a plugin the config still registers", async () => {
    // Every other check here reads the module. The plugin is the only part
    // that puts it where the editor can fetch it, and nothing else in the
    // suite would notice it gone: the site does not read this file.
    //
    // Resolved rather than read as text, and that is not fussiness — the
    // text version of this check was written first and mutation caught it
    // as a tautology. `expect(config).toContain("vocabularyPlugin()")`
    // matches the function's own declaration, so unregistering it from the
    // plugins array left the assertion green. The QR card's check had
    // already learned this; the same answer applies.
    const resolved = await viteConfig({ command: "build", mode: "production" });
    const plugins = (resolved.plugins ?? [])
      .flat()
      .map((plugin) => (plugin as { name?: string } | null)?.name);

    expect(plugins).toContain("serve-vocabulary");
    // The sibling that writes into the same directory, so a flattening that
    // quietly found nothing cannot pass the line above by accident.
    expect(plugins).toContain("draw-print-qr-card");
  });

  it("carries every list an editor has to offer", () => {
    expect(Object.keys(VOCABULARY).sort()).toEqual([
      "accents",
      "awardTones",
      "cvBodies",
      "icons",
      "pageBodies",
    ]);

    for (const [name, list] of Object.entries(VOCABULARY)) {
      expect(list.length, `${name} is empty, so the editor would offer nothing`).toBeGreaterThan(2);
    }
  });

  it("is the file that reaches the editor, if a build is here to read", () => {
    // Skipped rather than failed without a build, the way the bundle check
    // in contactParts is: npm test runs before npm run build. Which meant,
    // the bughunt found, that in CI this had never run at all. So
    // check:quality runs it again after the build as `test:built`, and
    // there, with EXPECT_BUILD set, a missing build is a failure — a step
    // that stands down silently is the thing it was added to stop.
    const file = resolve(root, "dist/vocabulary.json");
    if (!existsSync(file)) {
      if (process.env["EXPECT_BUILD"] !== undefined) {
        throw new Error("test:built ran and there is no dist/vocabulary.json to hold to the module");
      }
      return;
    }

    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(VOCABULARY);
  });
});

describe("what the site will accept", () => {
  it("is the icon list, and the registry cannot be a superset or a subset", () => {
    // The compiler already refuses both, so this is the guard on that guard:
    // if the `satisfies` were weakened to Record<string, …> the registry
    // could drift and nothing else would say so.
    expect(Object.keys(ICONS).sort()).toEqual([...ICON_NAMES].sort());
  });

  it("is the accent list, likewise", () => {
    expect(Object.keys(ACCENTS).sort()).toEqual([...ACCENT_NAMES].sort());
  });
});

/** Every value content gives under a named key, wherever it is nested. */
function valuesUnder(key: string, value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => valuesUnder(key, item));
  if (value === null || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([name, item]) =>
    name === key && typeof item === "string" ? [item] : valuesUnder(key, item),
  );
}

const contentDir = resolve(root, "src/content");
const content = readdirSync(contentDir)
  .filter((entry) => entry.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(resolve(contentDir, file), "utf8")) as unknown);

const used = (key: string) => new Set(content.flatMap((file) => valuesUnder(key, file)));

describe("a name on offer that nothing uses", () => {
  /**
   * The direction a list grows in. Adding a name is one line and costs an
   * icon in the bundle or a shape nobody draws; the editor then offers a
   * choice that leads nowhere. `tests/icons.test.ts` says the same thing
   * about the registry — this says it about what the editor is handed,
   * which is the copy an owner sees.
   */
  it.each([
    ["CV bodies", CV_BODY_NAMES, "body"],
    ["page bodies", PAGE_BODY_NAMES, "body"],
  ])("does not survive in %s", (_label, names, key) => {
    const taken = used(key);
    const spare = names.filter((name) => !taken.has(name));

    expect(
      spare,
      `the editor would offer these and no content file uses any of them:\n  ${spare.join("\n  ")}`,
    ).toEqual([]);
  });

  it.each([
    ["icons", ICON_NAMES, "icon", OFFERED_ICONS],
    ["accents", ACCENT_NAMES, "accent", OFFERED_ACCENTS],
    ["award tones", AWARD_TONES, "tone", OFFERED_AWARD_TONES],
  ])("survives in %s only as the offer, which is exactly what nothing uses", (_label, names, key, offered) => {
    // The lists a card is coloured or marked from have a licence to be
    // wider than content: an owner adding a card wants a choice, not the
    // names the cards already wear. The licence is the offer, and it is
    // held both ways — a spare name has to be on it, and a name on it has
    // to be spare, so the offer cannot grow by accident or go stale once a
    // card takes a name. A shape has no offer: a shape is code, and one
    // nobody draws is unreachable code.
    const taken = used(key);
    const spare = names.filter((name) => !taken.has(name)).sort();

    expect(spare).toEqual([...offered].sort());
  });

  it("reads content that actually names things, so the above is not vacuous", () => {
    expect(used("icon").size).toBeGreaterThan(10);
    expect(used("body").size).toBeGreaterThan(10);
  });
});
