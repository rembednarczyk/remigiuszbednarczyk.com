import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { withoutComments } from "../scripts/withoutComments";

/**
 * Ways of Working, Part 2: never quote a version, a count, or a status from
 * prose. package.json is prose until something reads it.
 *
 * This repository has already paid for the absence of these. @storybook/test
 * stayed at ^8.6.15 through the upgrade to Storybook 10, and its peer range
 * pinned storybook to ^8.6.15, so `npm install` failed outright with
 * ERESOLVE. Only `npm ci` worked, because it replays the lockfile without
 * resolving peers, and CI runs `npm ci`. The repository therefore looked
 * healthy from every angle while no one could add a dependency to it.
 *
 * Nothing in the suite could have reported that, and neither could lint,
 * tsc or the build.
 */

const root = resolve(__dirname, "..");

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(resolve(root, "package.json"), "utf8"),
) as PackageManifest;

const declared = { ...manifest.dependencies, ...manifest.devDependencies };

interface InstalledManifest {
  version: string;
  peerDependencies?: Record<string, string>;
}

function installed(name: string): InstalledManifest | null {
  try {
    return JSON.parse(
      readFileSync(resolve(root, "node_modules", name, "package.json"), "utf8"),
    ) as InstalledManifest;
  } catch {
    return null;
  }
}

/**
 * The majors a range admits.
 *
 * Deliberately narrow: it understands the two forms the Storybook packages
 * actually publish, a caret comparator and a list of them joined by `||`,
 * and throws on anything else. A parser that quietly returned "no opinion"
 * for a form it did not recognise would turn this check off by accident, on
 * exactly the day someone published a range worth reading.
 */
function admittedMajors(range: string): Set<string> {
  return new Set(
    range.split("||").map((part) => {
      const match = /^\s*\^?(\d+)\.\d+\.\d+(-[\w.]+)?\s*$/.exec(part);
      if (!match) {
        throw new Error(`unrecognised peer range "${part.trim()}" in "${range}"`);
      }
      return match[1];
    }),
  );
}

describe("admittedMajors", () => {
  it("reads a caret comparator", () => {
    expect([...admittedMajors("^10.5.10")]).toEqual(["10"]);
  });

  it("reads an alternation, prereleases included", () => {
    expect([...admittedMajors("^0.0.0-0 || ^10.0.0 || ^10.6.0-0")]).toEqual(["0", "10"]);
  });

  it("refuses a range it does not understand rather than admitting everything", () => {
    // The failure mode this avoids: a silent "no majors" would make every
    // package look acceptable and turn the check below off.
    expect(() => admittedMajors(">=8 <11")).toThrow(/unrecognised peer range/);
  });
});

describe("the Storybook packages", () => {
  /**
   * Declared version numbers are not the rule worth checking: the
   * test-runner ships 0.x and Chromatic's addon ships 5.x, and both accept
   * Storybook 10. What matters is whether each package's peer range admits
   * the core that is installed, since that is what npm resolves against.
   */
  it("all accept the installed Storybook core", () => {
    const core = installed("storybook");
    expect(core, "storybook is not installed").not.toBeNull();
    const coreMajor = core!.version.split(".")[0];

    const checked: string[] = [];
    const strays: string[] = [];

    for (const name of Object.keys(declared)) {
      const peer = installed(name)?.peerDependencies?.["storybook"];
      if (peer === undefined) continue;

      checked.push(name);
      if (!admittedMajors(peer).has(coreMajor)) {
        strays.push(`${name} wants storybook ${peer}`);
      }
    }

    // Without this the loop could inspect nothing and pass on an empty list.
    expect(checked.length).toBeGreaterThan(3);

    expect(
      strays,
      `Storybook ${coreMajor} is installed, and these refuse it, which is what makes "npm install" stop:\n  ${strays.join("\n  ")}`,
    ).toEqual([]);
  });
});

describe("the uuid override", () => {
  /**
   * uuid below 11.1.1 misses a buffer bounds check (GHSA-w5hq-g745-h8pq).
   * It reaches this tree four levels down from @storybook/test-runner,
   * through jest-junit, nyc and istanbul-lib-processinfo, and npm's own
   * suggested remedy is to downgrade the test-runner by a major version,
   * which trades one problem for a worse one. An override lifts uuid
   * instead and leaves the test-runner alone.
   *
   * Asserted against the installed tree rather than the declaration: an
   * override that npm did not honour would still read correctly in
   * package.json.
   */
  it("actually lifts the installed uuid past the advisory", () => {
    const uuid = installed("uuid");
    expect(uuid, "uuid is not installed").not.toBeNull();

    const [major, minor, patch] = uuid!.version.split(".").map(Number);
    expect(
      major > 11 || (major === 11 && (minor > 1 || (minor === 1 && patch >= 1))),
      `uuid ${uuid!.version} is below 11.1.1`,
    ).toBe(true);
  });

  it("is declared, so the lift survives a fresh resolve", () => {
    const overrides = (JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    ) as { overrides?: Record<string, string> }).overrides;

    expect(overrides?.["uuid"]).toBeDefined();
  });
});

describe("the CI install step", () => {
  /**
   * --legacy-peer-deps is why none of this surfaced for a whole major
   * version. It tells npm to install the tree despite an unsatisfiable
   * peer, so the one place that would have reported the conflict was told
   * not to. Reinstating it would switch the check above off from outside
   * the test suite, where nothing else is watching.
   */
  it("installs without telling npm to ignore peer conflicts", () => {
    // Comments are dropped first: the reason this rule exists is written
    // next to the step it guards, and it names the flag.
    const steps = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");

    expect(steps).toContain("npm ci");
    expect(steps).not.toContain("--legacy-peer-deps");
    expect(steps).not.toContain("--force");
  });
});

const SOURCE_ROOTS = ["src", ".storybook", "tests", "scripts"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return listSourceFiles(full);
    return SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext)) ? [full] : [];
  });
}

/**
 * The tool configs at the root — `eslint.config.js`, `vite.config.ts`,
 * `vitest.config.ts` — import packages too, and the one this check was
 * written for lives in the first of them. They were never read: the roots
 * above are directories, and the extensions were TypeScript's. The bughunt
 * put `@eslint/js` back into the state that motivated the check, undeclared
 * and resolving through `eslint`, and lint, build and this test stayed green.
 */
function listRootConfigs(): string[] {
  return readdirSync(root)
    .filter((entry) => /\.config\.(ts|js|mjs)$/.test(entry))
    .map((entry) => join(root, entry));
}

/** "motion/react" belongs to "motion"; "@storybook/react-vite" is its own name. */
function packageOf(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function importedPackages(file: string): string[] {
  const source = withoutComments(readFileSync(file, "utf8"));
  const specifiers = [
    ...source.matchAll(/from\s+["']([^"']+)["']/g),
    ...source.matchAll(/import\s+["']([^"']+)["']/g),
    ...source.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
  ].map((m) => m[1]);

  return specifiers
    .filter((s) => !s.startsWith(".") && !s.startsWith("@/") && !s.startsWith("node:"))
    .map(packageOf);
}

describe("every package the source imports", () => {
  /**
   * An import that resolves only because something else happened to install
   * the package works until that something else stops depending on it, and
   * then breaks with no change to this repository at all. eslint.config.js
   * imported @eslint/js this way before it was declared.
   */
  it("is declared in package.json", () => {
    const undeclaredBy = new Map<string, string[]>();

    const files = [
      ...SOURCE_ROOTS.flatMap((dir) => listSourceFiles(resolve(root, dir))),
      ...listRootConfigs(),
    ];
    expect(files.some((file) => file.endsWith("eslint.config.js"))).toBe(true);

    for (const file of files) {
      for (const name of importedPackages(file)) {
        if (name in declared) continue;
        const where = relative(root, file).replace(/\\/g, "/");
        undeclaredBy.set(name, [...(undeclaredBy.get(name) ?? []), where]);
      }
    }

    const strays = [...undeclaredBy].map(
      ([name, files]) => `${name} (imported by ${files.join(", ")})`,
    );

    expect(
      strays,
      `these resolve only through another package's dependencies:\n  ${strays.join("\n  ")}`,
    ).toEqual([]);
  });

  it("finds imports at all, so the check above is not vacuous", () => {
    const found = new Set(
      SOURCE_ROOTS.flatMap((dir) =>
        listSourceFiles(resolve(root, dir)).flatMap(importedPackages),
      ),
    );

    expect(found.has("react")).toBe(true);
    expect(found.has("storybook")).toBe(true);
    expect(found.size).toBeGreaterThan(5);
  });
});
