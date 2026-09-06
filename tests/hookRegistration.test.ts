import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A hook that is not registered runs never, and two documents said it ran.
 *
 * `no-shell-edits.sh` was written, tested twenty-one ways, mutation-tested
 * six ways and merged — and never registered in `.claude/settings.json`,
 * because writing a `PreToolUse` entry edits the agent's own permission
 * surface and the permission classifier refuses it. That refusal is right.
 * What was wrong is what the repository then said about it: the README had
 * it "running before every shell command" and CLAUDE.md had it "enforcing
 * both rules", while every heredoc and `git checkout <path>` went through
 * untouched and twenty-one tests reported them refused.
 *
 * The tests could not catch it. They run the script directly, which is the
 * right way to test a hook and says nothing about whether anything invokes
 * it. Its own guard-the-guard — "is executable, or it never runs and every
 * case below passes vacuously" — names the exact risk and then checks the
 * wrong half of it.
 *
 * So this holds three things together: what is on disk, what the
 * configuration invokes, and what the documents claim. Ways of Working Part
 * 5, "be honest where only discipline holds": an unregistered hook is a
 * rule held by discipline, and the documents have to say so.
 */

const root = resolve(__dirname, "..");
const hooksDir = resolve(root, ".claude/hooks");

const settings: {
  hooks?: Record<string, { hooks?: { command?: string }[] }[]>;
} = JSON.parse(readFileSync(resolve(root, ".claude/settings.json"), "utf8"));

const scripts = readdirSync(hooksDir).filter((file) => file.endsWith(".sh"));

/** Every command the configuration will run, flattened out of its events. */
const commands = Object.values(settings.hooks ?? {})
  .flat()
  .flatMap((group) => (group.hooks ?? []).map((hook) => hook.command ?? ""));

const isRegistered = (script: string) => commands.some((c) => c.includes(script));

/**
 * Hooks the repository keeps and deliberately does not register, each with
 * the reason. It may shrink and may not grow: an entry here is a guard that
 * is not guarding, so it is a debt, not a design.
 */
const NOT_REGISTERED: Record<string, string> = {
  "no-shell-edits.sh":
    "registered, run in anger, and switched off by the owner after it refused ordinary work four times in two hours — a branch made in a compound command, a commit message with an apostrophe, a scratchpad path held in a shell variable, and a grep whose pattern contained a `>` inside quotes. Three were fixed; the fourth made the pattern plain, since each was the same defect: the script parses shell text with regular expressions and the shell does not. The rule it enforces still stands in CLAUDE.md and is held by attention, which the documents say rather than imply.",
};

/** The documents that describe the hooks to the next contributor. */
const DOCUMENTS = ["README.md", "CLAUDE.md"];

describe("the hooks on disk and the configuration that invokes them", () => {
  it("finds hooks and registered commands, so nothing below passes vacuously", () => {
    expect(scripts.length).toBeGreaterThan(1);
    expect(commands.length).toBeGreaterThan(0);
  });

  it("registers every hook, or names it as deliberately unregistered", () => {
    const silent = scripts.filter(
      (script) => !isRegistered(script) && !(script in NOT_REGISTERED),
    );

    expect(
      silent,
      `these exist in .claude/hooks and nothing in .claude/settings.json invokes them, so they never run:\n  ${silent.join("\n  ")}`,
    ).toEqual([]);
  });

  it("keeps no entry for a hook that is registered after all", () => {
    // The same hygiene the wiring and section-wrapper exemption lists get.
    // A stale entry here would let the documents go on saying a hook is
    // inert after someone had wired it up.
    const stale = Object.keys(NOT_REGISTERED).filter(isRegistered);

    expect(
      stale,
      `these are listed as unregistered and .claude/settings.json invokes them — remove them from NOT_REGISTERED and correct the documents that call them inert`,
    ).toEqual([]);
  });
});

describe("what the documents say about a hook that does not run", () => {
  it.each(Object.keys(NOT_REGISTERED))(
    "says plainly that %s is not registered",
    (script) => {
      // Said near the name, not merely somewhere in the same document: the
      // bughunt rewrote the caveat to say the hook runs, and the check
      // stayed green on another sentence's "not registered" a page away.
      // Near is within a few paragraphs of any mention of the script.
      const NEAR = 1200;
      const quiet = DOCUMENTS.filter((file) => {
        const text = readFileSync(resolve(root, file), "utf8");
        const mentions = [...text.matchAll(new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))];
        return !mentions.some((mention) =>
          /not registered/i.test(text.slice(Math.max(0, mention.index - NEAR), mention.index + NEAR)),
        );
      });

      expect(
        quiet,
        `${script} never runs, and these describe it without saying so:\n  ${quiet.join("\n  ")}`,
      ).toEqual([]);
    },
  );

  it("tells the reader how to make it run", () => {
    // A caveat that says "this is off" and not "here is the switch" leaves
    // the next person to work out the shape of a settings file from scratch.
    const readme = readFileSync(resolve(root, "README.md"), "utf8");

    expect(readme).toContain("PreToolUse");
  });
});
