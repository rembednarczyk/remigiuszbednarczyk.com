import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isTestLike, listSourceFiles } from "../scripts/importGraph";
import { withoutComments } from "../scripts/withoutComments";

/**
 * Two dialogs wrote out the same shell: the portal into document.body, the
 * AnimatePresence, the backdrop that closes on a click, four animation
 * props, `role`, `aria-modal`, `aria-labelledby`, and an eleven-class panel
 * differing in one word — how wide it is.
 *
 * The keyboard and focus behaviour was already shared in useModalA11y, and
 * that is the half where a mistake is obvious. The markup around it is the
 * half where a mistake is silent: a dialog that forgets `aria-modal`, or
 * labels itself with an id that does not exist, still opens and still looks
 * right. Both of those are one careless copy away, and copying is how the
 * second dialog came to exist.
 */

const root = resolve(__dirname, "..");
const relativeToRoot = (file: string) => relative(root, file).replace(/\\/g, "/");

const SHELL = "src/components/ui/Modal.tsx";

const production = listSourceFiles(resolve(root, "src")).filter(
  (file) => !isTestLike(file) && !file.endsWith(".stories.tsx"),
);

describe("the dialogs share one shell", () => {
  it("finds the files it is checking, so none of this passes vacuously", () => {
    expect(production.length).toBeGreaterThan(20);
  });

  it("declares role=dialog in one place", () => {
    const declaring = production
      .map(relativeToRoot)
      .filter(
        (file) =>
          file !== SHELL &&
          /role="dialog"/.test(readFileSync(resolve(root, file), "utf8")),
      );

    expect(
      declaring,
      `these build their own dialog instead of using Modal:\n  ${declaring.join("\n  ")}`,
    ).toEqual([]);
  });

  it("keeps the parts a copy would silently drop", () => {
    // Comments out first: the shell's own doc comment names useModalA11y,
    // and the bughunt deleted the call and its import and left this green
    // on the prose. What is held is the call.
    const shell = withoutComments(readFileSync(resolve(root, SHELL), "utf8"));

    expect(shell).toContain('role="dialog"');
    // Tells assistive technology the rest of the page is inert. A dialog
    // without it reads as part of the page behind.
    expect(shell).toContain('aria-modal="true"');
    // Escape, the focus trap, and focus returned to the trigger.
    expect(shell).toContain("useModalA11y(");
    // The backdrop is one of the three ways out, and the only one with no
    // visible affordance to remind anyone it exists.
    expect(shell).toMatch(/onClick=\{onClose\}[\s\S]*?aria-hidden="true"/);
  });

  it("generates the title id rather than trusting two strings to match", () => {
    // They were "contact-modal-title" and "privacy-modal-title", written
    // twice each: once on the heading and once in aria-labelledby. A dialog
    // whose label points at nothing still opens and still looks right.
    const shell = readFileSync(resolve(root, SHELL), "utf8");

    expect(shell).toContain("useId");
    expect(shell).toContain("aria-labelledby={titleId}");
    expect(shell).toContain("id={titleId}");

    const hardCoded = production
      .map(relativeToRoot)
      .filter((file) =>
        /aria-labelledby="/.test(readFileSync(resolve(root, file), "utf8")),
      );

    expect(hardCoded).toEqual([]);
  });
});
