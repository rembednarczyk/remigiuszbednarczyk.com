import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every action a workflow runs is pinned to a commit, and every workflow
 * says what its token may do.
 *
 * A `uses: actions/checkout@v4` runs whatever the `v4` tag points at on the
 * day the job runs — a name its owner, or whoever takes over the account,
 * can move. A forty-character commit is not movable. The security sweep
 * found all four actions pinned by tag, and pinning them once is a fix that
 * lasts until the next `uses:` line is pasted from a README, so this holds
 * it: the pin is a full SHA, the version rides in a trailing comment so a
 * reader still knows what it is, and Dependabot moves both together.
 *
 * The permissions block is the other half. A workflow that names none runs
 * with whatever the repository's default grants its token, which on an
 * older repository is write to everything. Read is what a quality gate
 * needs; the deploy job asks for its own two on top.
 */

const root = resolve(__dirname, "..");
const workflowsDir = resolve(root, ".github/workflows");
const workflows = readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name));

/** Every `uses:` line of a workflow, with the file and line for the message. */
function usesOf(name: string): { where: string; ref: string }[] {
  return readFileSync(resolve(workflowsDir, name), "utf8")
    .split("\n")
    .flatMap((line, index) => {
      const match = /^\s*-?\s*uses:\s*(\S+)(.*)$/.exec(line);
      return match?.[1] === undefined ? [] : [{ where: `${name}:${String(index + 1)}`, ref: `${match[1]}${match[2] ?? ""}` }];
    });
}

describe("the workflows", () => {
  it("exist, so the checks below hold something", () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it.each(workflows)("%s pins every action to a commit, with the version beside it", (name) => {
    const uses = usesOf(name);
    expect(uses.length).toBeGreaterThan(0);

    for (const { where, ref } of uses) {
      // owner/repo@<40 hex> # vX.Y.Z — a local action (./path) has no ref to pin.
      expect(ref, `${where} runs ${ref}, which is not pinned to a commit`).toMatch(
        /^[\w.-]+\/[\w.-]+(?:\/[\w./-]+)?@[0-9a-f]{40}\s+#\s*v\d+(?:\.\d+)*\s*$/,
      );
    }
  });

  it.each(workflows)("%s says what its token may do", (name) => {
    const text = readFileSync(resolve(workflowsDir, name), "utf8");
    expect(text, `${name} has no top-level permissions block`).toMatch(/^permissions:\s*\n(?:\s+\S+:\s*\S+\s*\n)+/m);
  });
});
