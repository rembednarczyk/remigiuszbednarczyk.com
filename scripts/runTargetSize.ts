import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { serveDirectory } from "./staticServer.ts";
import {
  ENHANCED,
  judgeTargetSize,
  staleExemptions,
  tooSmall,
  type Target,
} from "./targetSize.ts";

/**
 * Measures pointer targets on the built page against SC 2.5.5.
 *
 * A browser, because this is geometry after layout: a control's tap area is
 * its box plus its padding at the width it is actually rendered at, and no
 * amount of reading Tailwind classes produces that number. It is the same
 * argument the focus gate makes and the same shape of gate.
 *
 * Measurements rather than targets: the page is swept in every state whose
 * controls exist only in that state, and the ones present throughout are
 * measured again in each. Counting them once would mean deciding what
 * counts as the same control across two widths and five states, which is a
 * judgement the count does not need to make to do its job.
 */

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const PORT = 5191;

/**
 * Both ends of the layout.
 *
 * The page reflows: at 1280px the navigation is eight text buttons in a
 * row, at 375px it is one toggle and a dropdown. They are different
 * controls with different sizes, so one width would measure half of them.
 */
const WIDTHS = [1280, 375];

/** What a pointer can activate. */
const INTERACTIVE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]';

/**
 * Measured with the control focused.
 *
 * The skip link is `sr-only` until it is reached, so its box unfocused is
 * 1x1 — measure it there and the gate reports the page's most deliberate
 * piece of accessibility work as its worst failure. Focused it is 189x40,
 * which is a real number about a real control. Every target is focused
 * before it is measured rather than only that one, because a rule with an
 * exception for the case that embarrassed it is not a rule.
 */
async function targetsOn(page: Page, where: string): Promise<Target[]> {
  return page.evaluate(
    ({ selector, atWhere }) => {
      const controls = [...document.querySelectorAll(selector)] as HTMLElement[];

      return controls.flatMap((element) => {
        element.focus();

        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        // Nothing to tap: hidden, collapsed, or a control in a menu that is
        // shut. A closed menu's items are not targets until it opens, and
        // the sweep opens it below.
        if (box.width === 0 || box.height === 0) return [];
        if (style.visibility === "hidden" || style.display === "none") return [];

        const own = (element.textContent ?? "").trim().length;
        const around = (element.parentElement?.textContent ?? "").trim().length;

        return [
          {
            label:
              (element.getAttribute("aria-label") ?? element.textContent ?? "")
                .trim()
                .replace(/\s+/g, " ")
                .slice(0, 40) || `<${element.tagName.toLowerCase()}>`,
            tag: element.tagName.toLowerCase(),
            where: atWhere,
            width: box.width,
            height: box.height,
            // A target "in a sentence or block of text", which SC 2.5.5
            // exempts. Twelve characters of slack so a link that is nearly
            // the whole of its parent does not read as prose around it.
            inline: style.display.startsWith("inline") && around > own + 12,
          },
        ];
      });
    },
    { selector: INTERACTIVE, atWhere: where },
  );
}

/**
 * Clicks a control by its visible text, and says whether it found one.
 *
 * Every state below is reached this way rather than by selector, so a pass
 * that stops working says so instead of measuring an emptier page.
 */
async function click(page: Page, text: RegExp): Promise<boolean> {
  const hit = await page.evaluate((source) => {
    const wanted = new RegExp(source, "i");
    const control = [...document.querySelectorAll("button")].find(
      (button) =>
        wanted.test(button.textContent ?? "") ||
        wanted.test(button.getAttribute("aria-label") ?? ""),
    );
    if (!control) return false;
    control.click();
    return true;
  }, text.source);

  if (hit) await page.waitForTimeout(600);
  return hit;
}

/**
 * The states whose controls do not exist in the page as it loads.
 *
 * This is the defect the focus gate was caught by and the one this gate
 * shipped with: a sweep measures the page it visits, and a control that is
 * not rendered yet is not a passing control, it is an unmeasured one. Both
 * dialogs portal in only while open, so neither close button had ever been
 * measured — and both were 32x32, the way out of a dialog for anyone using
 * a pointer. The scroll-to-top button is worse: it is mounted only once the
 * consent banner has been answered *and* the page is 300px down, so no
 * amount of scrolling on a fresh load reaches it.
 */
async function inEachHiddenState(
  page: Page,
  width: number,
  collect: (where: string) => Promise<void>,
): Promise<void> {
  for (const [name, open] of [
    ["contact dialog", /say hello/],
    ["privacy dialog", /read the privacy policy/],
  ] as const) {
    if (!(await click(page, open))) {
      throw new Error(`nothing opened the ${name}, so its controls were never measured`);
    }
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await collect(`${width}px, ${name}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Answering the banner is what mounts the scroll-to-top button at all.
  if (!(await click(page, /accept/))) {
    throw new Error("nothing answered the consent banner, so scroll-to-top never mounted");
  }

  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(700);

  const showing = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((button) =>
      /scroll to top/i.test(button.getAttribute("aria-label") ?? ""),
    ),
  );

  if (!showing) {
    throw new Error(
      "the scroll-to-top button did not appear 800px down with the banner answered, " +
        "so the sweep below proves nothing about a control it never found",
    );
  }

  await collect(`${width}px, scrolled`);
}

/** Opens the mobile navigation, whose items exist only while it is open. */
async function openTheMenu(page: Page): Promise<boolean> {
  const opened = await page.evaluate(() => {
    const toggle = [...document.querySelectorAll("button")].find((button) =>
      /toggle mobile menu/i.test(button.getAttribute("aria-label") ?? ""),
    );
    if (!toggle) return false;
    toggle.click();
    return true;
  });

  if (opened) await page.waitForTimeout(400);
  return opened;
}

async function main() {
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("dist/index.html is missing. Run `npm run build` first.");
  }

  const stop = await serveDirectory(dist, PORT);
  const browser = await chromium.launch();
  const measured: Target[] = [];

  try {
    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });

      // Everything below the fold reveals on scroll, and a section that has
      // not revealed has no controls to measure. The first version of the
      // focus gate lost seven stops to exactly this.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1200);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);

      measured.push(...(await targetsOn(page, `${width}px`)));

      if (width < 640) {
        const opened = await openTheMenu(page);
        if (!opened) {
          throw new Error(
            "no control opened the mobile menu, so its items were never measured",
          );
        }
        measured.push(...(await targetsOn(page, `${width}px, menu open`)));
        await click(page, /toggle mobile menu/);
      }

      await inEachHiddenState(page, width, async (where) => {
        measured.push(...(await targetsOn(page, where)));
      });

      await page.close();
    }
  } finally {
    await browser.close();
    stop();
  }

  const verdicts = judgeTargetSize(measured);
  const failures = tooSmall(verdicts);
  const stale = staleExemptions(measured);

  console.log(
    `${verdicts.length} measurements of pointer targets across ${WIDTHS.join("px and ")}px ` +
      `and the states that only exist once something is opened, answered or scrolled to; ` +
      `${verdicts.length - failures.length} are at least ${ENHANCED}x${ENHANCED}`,
  );

  // Exact, not a floor: `<` passes whenever the count reaches the recorded
  // number, so a sweep that stopped early in one state while the page grew a
  // control in another nets the total and the truncation hides — the very
  // "reported the truncated count as success" failure the comment below and
  // the focus gate's countMustMatch both exist to stop. The sibling gate
  // (runFocusIndicator.ts) matches in both directions; this now does too.
  if (verdicts.length !== EXPECTED_TARGETS) {
    throw new Error(
      `${verdicts.length} measurements were taken and ${EXPECTED_TARGETS} were recorded. ` +
        (verdicts.length < EXPECTED_TARGETS
          ? `The sweep stopped early or the page lost controls; both are worth knowing, and neither shows up as a failure below.`
          : `The page has grown controls. If that is wanted, update EXPECTED_TARGETS in scripts/runTargetSize.ts.`),
    );
  }

  if (stale.length > 0) {
    throw new Error(
      `DELIBERATELY_SMALL names targets the page no longer has:\n  ${stale.join("\n  ")}\n\n` +
        `An exemption list that can only be added to is a list that grows.`,
    );
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} targets are smaller than SC 2.5.5 asks for:\n  ` +
        failures
          .map((f) => `${f.where}  ${JSON.stringify(f.label)}: ${f.problem}`)
          .join("\n  ") +
        `\n\nThe usual fix is padding rather than size: a control keeps the type and the icon ` +
        `it has and grows its tap area around them, which changes nothing on screen. This page ` +
        `holds itself to AAA on focus (SC 2.4.12), so the consistent bar for a thumb is ` +
        `SC 2.5.5 at ${ENHANCED}x${ENHANCED} and not the AA minimum of 24x24.`,
    );
  }
}

/**
 * How many measurements the sweep takes, recorded rather than floored.
 *
 * A floor is the wrong instrument for a sweep that can stop early: the
 * focus gate was floored at "more than 20" while the page had 28, so a
 * truncation to 21 reported success. Measured, per the widths above.
 */
const EXPECTED_TARGETS = 241;

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
