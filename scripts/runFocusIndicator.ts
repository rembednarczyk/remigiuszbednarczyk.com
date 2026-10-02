import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { PNG } from "pngjs";
import { serveDirectory } from "./staticServer.ts";
import {
  ENOUGH_IN_PAGE_COLOUR,
  PAINTS_SOMETHING,
  failures,
  judgeFocus,
  judgeNotObscured,
  type Overlaid,
  type Stop,
} from "./focusIndicator.ts";

/**
 * Tabs the built page and checks that every stop shows where the keyboard is.
 *
 * What this catches that reading the source cannot: a new control added with
 * no focus style of its own. That is not hypothetical — every link on a
 * project card was in that state, eight controls falling back to the
 * browser's own ring, and no test in this repository had anything to say
 * about it.
 *
 * It checks the colour, not just that something changed. The first version
 * did not, and with `focus-ring` stripped from those same links it reported
 * all twenty-eight stops as fine: Chrome draws a ring where the page draws
 * none, so "something painted" is true either way.
 *
 * It compares pixels rather than computed styles, because a computed style
 * lies twice here. `outline-style: auto` reports a colour Chrome does not
 * paint, and a control mid-transition reports the indicator it is still
 * fading in — reading it a frame after Tab called 14 of 29 stops blank.
 */

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const PORT = 5189;

/** Wide enough to contain an indicator drawn outside the control. */
const MARGIN = 8;

/** cyan-400, what `focus-ring` draws, as the screenshot renders it. */
const CYAN = { r: 34, g: 211, b: 238 };

/** Loose enough for antialiasing at the edge of a two-pixel line. */
const CLOSE_ENOUGH = 60;

function isPageCyan(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - CYAN.r) < CLOSE_ENOUGH &&
    Math.abs(g - CYAN.g) < CLOSE_ENOUGH &&
    Math.abs(b - CYAN.b) < CLOSE_ENOUGH
  );
}

/**
 * Where the consent banner is checked. It reflows between these: its buttons
 * sit beside the text at 1280 and the card nearly fills the viewport at 768,
 * which is where the scroll-to-top button used to land on top of Accept.
 */
const BANNER_WIDTHS = [1280, 768];

/**
 * And where its own buttons are checked for anything on top of them.
 *
 * Two widths at one comfortable height proved nothing about a short one.
 * The navigation's mobile menu grows downward until 16px from the foot of
 * the viewport, so on a short screen it covered Accept and Decline whole —
 * measured 100% at the first three below — and a tap on Accept went to a
 * nav button instead: the page scrolled away and no choice was recorded.
 *
 * This is the second time two things pinned to the same corner have found
 * each other here. The first was the scroll-to-top button over Accept at
 * 768px. Neither is wrong alone, which is why only a check of the two
 * together can see it.
 */
const SHORT_VIEWPORTS = [
  { width: 812, height: 375 },
  { width: 740, height: 360 },
  { width: 768, height: 500 },
  // Narrow as well as short. The three above are all 640px wide or more,
  // where the banner lays its buttons out in a row and takes 136 to 168
  // pixels. Below that it stacks them and takes 191 to 236 — most of a short
  // screen — and the menu's reservation, with no floor, computed to its own
  // padding and no rows. Zero of seven items were visible and no gate could
  // see it, because this list stopped at the widths the fix was measured on.
  { width: 568, height: 320 },
  { width: 480, height: 320 },
  { width: 320, height: 320 },
];

/**
 * How many of the mobile menu's rows have to survive being shortened.
 *
 * The sweep asked only whether the banner's own buttons were covered, which
 * is one half of what two things sharing a screen can do to each other. The
 * other half is a menu squeezed into nothing, which is what happened.
 */
const MENU_ROWS_THAT_MUST_SURVIVE = 2;

/** Long enough for a `transition-all` control to finish fading its ring in. */
const SETTLE_MS = 450;

/**
 * How many stops the walks are supposed to find, recorded rather than
 * bounded.
 *
 * A floor is the wrong instrument here. The keyboard sweep was floored at
 * "more than 20" while the page has 28, so a truncation to 21 — seven
 * controls never checked for a focus indicator — reported "21 keyboard
 * stops; 21 show where the keyboard is" and exited 0. The sweep under the
 * banner had no floor at all: its count was accumulated, printed, and never
 * asserted, so a walk that broke on its first stop would have printed "6
 * control checks … 6 clear of it" and passed.
 *
 * Truncation is the failure this whole file is most exposed to. The walk
 * stops at the first focusable element without a probe, and elements mount
 * and unmount as the page scrolls; three separate sweeps of this page were
 * written and three stopped early. What catches that is knowing the number,
 * the same way `EXPECTED_LAYOUT` knows how many sheets the CV runs to.
 *
 * Adding a control to the page changes these, and updating them is the
 * right response — the point is that it has to be a decision rather than
 * something that happens quietly.
 */
// 29 since the TestingLab card's second edition: its report is one more link
// on the page, at every width. 30 since the Hero gained the view-source `</>`
// trigger (SourceGlitch), one more focusable control at every width.
const EXPECTED_KEYBOARD_STOPS = 30;

/**
 * What one sweep under the banner covers, per width: the page's controls
 * plus the banner's own three.
 *
 * Per width, because the page reflows and the tab order is not the same
 * length at both. The first version of this recorded one number for both,
 * derived by arithmetic from the printed total rather than measured, and it
 * was wrong at both widths — which is the mistake this whole file exists to
 * make expensive.
 */
// Each +1 since the Hero's view-source `</>` trigger (SourceGlitch), one more
// control the banner sweep covers at both widths.
const EXPECTED_CONTROLS_UNDER_THE_BANNER: Record<number, number> = {
  1280: 30,
  768: 24,
};

function countMustMatch(what: string, found: number, recorded: number): void {
  if (found === recorded) return;

  throw new Error(
    `${what}: ${found} were found and ${recorded} are recorded. ` +
      (found < recorded
        ? "The walk stopped early — it ends at the first focusable element without a data-probe, which is what happens when something mounts after the probes were stamped. Everything downstream would pass on the part it did reach."
        : "The page has grown controls. If that is wanted, update the recorded number in scripts/runFocusIndicator.ts."),
  );
}

async function tabOrder(page: Page): Promise<string[]> {
  const order: string[] = [];
  const seen = new Set<string>();

  // Start the sequential focus walk at the top of the document. Without
  // this the walk resumed from wherever focus had last been — and after the
  // consent bar was dismissed that element no longer existed, so the first
  // Tab moved nowhere and the sweep found nothing.
  await page.evaluate(() => {
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
  });

  for (let i = 0; i < 200; i += 1) {
    await page.keyboard.press("Tab");
    const id = await page.evaluate(() => {
      const el = document.activeElement;
      return !el || el === document.body ? null : el.getAttribute("data-probe");
    });
    if (!id || seen.has(id)) break;
    seen.add(id);
    order.push(id);
  }

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  return order;
}

async function paintedBy(page: Page, probe: string): Promise<Stop> {
  // The box is measured while the control is focused, because focus is what
  // decides where it is. The skip link is 1x1 at -1,-1 until focused and
  // 189x40 at 16,16 after: a clip taken from its resting box watched a
  // seventeen-pixel square of empty corner and called it blank.
  const box = await page.evaluate(
    ([id, pad]) => {
      const el = document.querySelector<HTMLElement>(`[data-probe="${id}"]`);
      if (!el) return null;
      el.focus();
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      const name = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.tagName
      ).trim().slice(0, 36);
      el.blur();

      if (r.width === 0 || r.height === 0) return { name, x: 0, y: 0, width: 0, height: 0 };
      return {
        name,
        x: Math.max(0, Math.floor(r.left - pad)),
        y: Math.max(0, Math.floor(r.top - pad)),
        width: Math.min(Math.ceil(r.width + pad * 2), innerWidth),
        height: Math.min(Math.ceil(r.height + pad * 2), innerHeight),
      };
    },
    [probe, MARGIN] as [string, number],
  );

  if (!box) return { name: probe, painted: 0, inPageColour: 0, unmeasured: true };
  if (box.width === 0 || box.height === 0) {
    return { name: box.name, painted: 0, inPageColour: 0, unmeasured: true };
  }
  await page.waitForTimeout(200);

  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
  const blurred = await page.screenshot({ clip });
  await page.evaluate(
    (id) => (document.querySelector(`[data-probe="${id}"]`) as HTMLElement).focus(),
    probe,
  );
  await page.waitForTimeout(SETTLE_MS);
  const focused = await page.screenshot({ clip });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.waitForTimeout(150);

  const before = PNG.sync.read(blurred);
  const after = PNG.sync.read(focused);
  if (before.width !== after.width || before.height !== after.height) {
    return { name: box.name, painted: 0, inPageColour: 0, unmeasured: true };
  }

  let painted = 0;
  let inPageColour = 0;
  for (let i = 0; i < before.data.length; i += 4) {
    if (
      Math.abs(before.data[i] - after.data[i]) > 16 ||
      Math.abs(before.data[i + 1] - after.data[i + 1]) > 16 ||
      Math.abs(before.data[i + 2] - after.data[i + 2]) > 16
    ) {
      painted += 1;
      if (isPageCyan(after.data[i], after.data[i + 1], after.data[i + 2])) {
        inPageColour += 1;
      }
    }
  }

  return { name: box.name, painted, inPageColour };
}

/**
 * Walks the tab order while the consent banner is showing, and reports what
 * the banner does to each control it is not part of.
 *
 * This has to run before the banner is dismissed, and it has to combine
 * geometry with a hit test: a control can sit behind the card and still
 * paint over it. Measuring geometry alone called the scroll-to-top button
 * obscured when it was the one doing the obscuring.
 */
async function underTheBanner(page: Page): Promise<Overlaid[]> {
  const order = await tabOrder(page);
  const controls: Overlaid[] = [];

  for (const probe of order) {
    const row = await page.evaluate((id) => {
      const el = document.querySelector<HTMLElement>(`[data-probe="${id}"]`);
      const region = document.querySelector('[aria-label="Cookie consent"]');
      const card = region?.firstElementChild;
      if (!el || !region || !card) return null;
      // The banner's own controls are meant to be in front of everything.
      if (region.contains(el)) return null;

      el.focus();
      const a = el.getBoundingClientRect();
      const name = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.tagName
      ).trim().slice(0, 34);
      if (a.width === 0 || a.height === 0) {
        return { name, coveredByCard: 0, clickReaches: true, blockedBy: "" };
      }

      const b = card.getBoundingClientRect();
      const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

      const cx = a.left + a.width / 2;
      const cy = a.top + a.height / 2;
      const onScreen = cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
      const top = onScreen ? document.elementFromPoint(cx, cy) : null;
      const reaches = !onScreen || !!(top && (el === top || el.contains(top)));

      // Inside the part the two share, which is the only place the question
      // "is it behind the banner" has an answer. The centre is no use: a
      // control whose middle clears the card can still have its lower half
      // behind it, and the scroll-to-top button lies entirely inside the
      // band's box while painting over it.
      let inFrontWhereCovered: boolean | undefined;
      if (w > 0 && h > 0) {
        const ox = Math.max(a.left, b.left) + w / 2;
        const oy = Math.max(a.top, b.top) + h / 2;
        const overThere = document.elementFromPoint(ox, oy);
        inFrontWhereCovered = !!(
          overThere && (el === overThere || el.contains(overThere))
        );
      }

      return {
        name,
        coveredByCard: (w * h) / (a.width * a.height),
        clickReaches: reaches,
        blockedBy: reaches || !top
          ? ""
          : region.contains(top)
            ? "the consent banner"
            : top.tagName.toLowerCase(),
        inFrontWhereCovered,
      };
    }, probe);

    if (row) controls.push(row);
  }

  const ownControls = await bannerOwnControls(page);

  // The walk above focused every stop it visited; leave nothing focused
  // behind it, or the next viewport starts from a scrolled position.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());

  return [...controls, ...ownControls];
}

/**
 * The banner's own buttons, which are meant to be in front of everything.
 *
 * Sampled across rather than at the centre: the scroll-to-top button covered
 * the right third of Accept while leaving its middle clickable, so a
 * centre-only test called it fine.
 *
 * Separate from the sweep above because it needs no tab walk, which makes it
 * cheap enough to run in several viewports and in more than one state of the
 * page — with the navigation's mobile menu open, for one.
 */
async function bannerOwnControls(page: Page): Promise<Overlaid[]> {
  return page.evaluate(() => {
    const region = document.querySelector('[aria-label="Cookie consent"]');
    if (!region) return [];

    return [...region.querySelectorAll("button, a")].map((el) => {
      const a = el.getBoundingClientRect();
      const name = (el.getAttribute("aria-label") || el.textContent || el.tagName)
        .trim()
        .slice(0, 34);

      for (const across of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const x = a.left + a.width * across;
        const y = a.top + a.height / 2;
        const top = document.elementFromPoint(x, y);
        if (!top || !(el === top || el.contains(top))) {
          return {
            name,
            coveredByCard: 0,
            clickReaches: false,
            blockedBy: top
              ? top.getAttribute("aria-label") || top.tagName.toLowerCase()
              : "nothing",
            partOfTheBanner: true,
            failedAt: across,
          };
        }
      }

      return {
        name,
        coveredByCard: 0,
        clickReaches: true,
        blockedBy: "",
        partOfTheBanner: true,
      };
    });
  });
}

async function main() {
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("dist/index.html is missing. Run `npm run build` first.");
  }

  const stop = await serveDirectory(dist, PORT);
  const browser = await chromium.launch();

  let stops: Stop[];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });

    // Walk the page so everything revealed on scroll is present and settled.
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 600) {
      await page.evaluate((v) => scrollTo(0, v), y);
      await page.waitForTimeout(70);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);

    const label = () =>
      page.evaluate(() =>
        document.querySelectorAll("*").forEach((el, i) => el.setAttribute("data-probe", String(i))),
      );

    // The consent bar's own controls first, while it is showing. It is the
    // one part of the page that disappears for good once answered, so a
    // sweep that starts by dismissing it never looks at three buttons.
    await label();
    const inTheBar = await page.evaluate(() =>
      [...(document.querySelector('[aria-label="Cookie consent"]')?.querySelectorAll("button, a") ?? [])]
        .map((el) => el.getAttribute("data-probe") ?? ""),
    );
    if (inTheBar.length < 3) {
      throw new Error(
        `the consent bar should offer three controls and ${inTheBar.length} were found — it did not render, and the sweep below dismisses it`,
      );
    }

    stops = [];
    for (const probe of inTheBar) stops.push(await paintedBy(page, probe));

    // What the banner does to everything else, while it is still up, at two
    // widths. The banner reflows and so does the page: the scroll-to-top
    // button cleared it entirely at 1280 and took a third of Accept at 768,
    // so one width would have proved nothing about the other.
    const shadowed: { width: number; name: string; problem: string }[] = [];
    let checked = 0;

    for (const width of BANNER_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(400);
      await label();

      const overlaid = await underTheBanner(page);
      countMustMatch(
        `controls under the banner at ${width}px`,
        overlaid.length,
        EXPECTED_CONTROLS_UNDER_THE_BANNER[width] ?? -1,
      );
      checked += overlaid.length;
      shadowed.push(
        ...failures(judgeNotObscured(overlaid)).map((v) => ({
          width,
          name: v.name,
          problem: v.problem,
        })),
      );
    }

    // The banner's own buttons again, on short viewports and with the
    // navigation's mobile menu open. That menu grows downward until it is
    // 16px from the foot of the screen, so on a short one it landed on the
    // banner's card: Accept and Decline were covered whole, and a tap on
    // Accept reached a nav button, scrolling the page away without
    // recording a choice.
    for (const viewport of SHORT_VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(400);

      const opened = await page.evaluate(() => {
        const toggle = [...document.querySelectorAll("nav button")].find(
          (b) => (b as HTMLElement).offsetParent !== null && b.querySelector("svg") && !b.textContent?.trim(),
        );
        if (!toggle) return false;
        (toggle as HTMLElement).click();
        return true;
      });
      if (!opened) {
        throw new Error(
          `no mobile menu toggle was found at ${viewport.width}x${viewport.height} — the sweep below proves nothing about a menu it never opened`,
        );
      }
      await page.waitForTimeout(400);

      // The menu has to survive the space it just gave up.
      const rows = await page.evaluate(() => {
        const menu = [...document.querySelectorAll("nav div")].find(
          (d) =>
            d.className.includes("lg:hidden") && d.className.includes("absolute"),
        );
        if (!menu) return -1;
        const box = menu.getBoundingClientRect();
        return [...menu.querySelectorAll("button")].filter((item) => {
          const r = item.getBoundingClientRect();
          return r.height > 0 && r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
        }).length;
      });

      if (rows < MENU_ROWS_THAT_MUST_SURVIVE) {
        throw new Error(
          `at ${viewport.width}x${viewport.height} the mobile menu shows ${rows === -1 ? "no menu at all" : `${rows} of its rows`} — reserving the banner's height left it too short to use. The reservation needs a floor; an empty menu is worse than the overlap it avoids.`,
        );
      }

      const own = await bannerOwnControls(page);
      if (own.length < 3) {
        throw new Error(
          `the consent bar should offer three controls at ${viewport.width}x${viewport.height} and ${own.length} were found`,
        );
      }
      checked += own.length;
      shadowed.push(
        ...failures(judgeNotObscured(own)).map((v) => ({
          width: viewport.width,
          name: `${v.name} (mobile menu open, ${viewport.height}px tall)`,
          problem: v.problem,
        })),
      );

      await page.evaluate(() => {
        const toggle = [...document.querySelectorAll("nav button")].find(
          (b) => (b as HTMLElement).offsetParent !== null && b.querySelector("svg") && !b.textContent?.trim(),
        );
        (toggle as HTMLElement | undefined)?.click();
      });
      await page.waitForTimeout(250);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(300);

    console.log(
      `${checked} control checks against the consent banner across ${BANNER_WIDTHS.join("px and ")}px, and on ${SHORT_VIEWPORTS.length} short viewports with the mobile menu open; ${checked - shadowed.length} clear of it`,
    );

    if (shadowed.length > 0) {
      throw new Error(
        `The consent banner is in the way of controls behind it:\n  ${shadowed
          .map((v) => `at ${v.width}px, ${v.name}: ${v.problem}`)
          .join("\n  ")}\n\n` +
          `The banner's band is pointer-events-none and only its card takes clicks, ` +
          `useSpaceForFixedBar reserves the height it covers so nothing is scrolled under it, ` +
          `the scroll-to-top button stands down while the banner is up, and the ` +
          `navigation's mobile menu subtracts --fixed-bar-space from its height so it ` +
          `stops above the banner rather than growing onto it.`,
      );
    }

    // Then the rest, with the bar out of the way. It covers the foot of the
    // page, including controls the browser scrolls a visitor to.
    //
    // Answer it and reload rather than carrying on: the walk above focused
    // every control and left the page scrolled somewhere, and the button
    // that appears only after 300px of scrolling then entered the tab order
    // and unmounted again before it could be measured. The choice is in
    // localStorage, so the reload comes back with the banner already
    // answered and the page at the top.
    await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .find((b) => b.textContent?.trim() === "Accept")
        ?.click(),
    );
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const reloaded = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < reloaded; y += 600) {
      await page.evaluate((v) => scrollTo(0, v), y);
      await page.waitForTimeout(70);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    await label();

    const order = await tabOrder(page);
    // `stops` already holds the consent bar's three, walked before it was
    // dismissed, so the two halves together are what the page offers.
    countMustMatch("keyboard stops", stops.length + order.length, EXPECTED_KEYBOARD_STOPS);

    for (const probe of order) stops.push(await paintedBy(page, probe));

    // And the one control the walk cannot reach, because at the top of the
    // page it does not exist.
    //
    // The scroll-to-top button mounts only past 300px of scrolling, after a
    // 100ms debounce, and the walk starts from the top. The note above says
    // the button "entered the tab order and unmounted again before it could
    // be measured" — and the answer taken then was to reload to a state
    // where it is absent, which made the sweep stable by leaving a control
    // out of it. Measured: strip focus-ring from that button, leaving it
    // with no indicator at all, and this gate printed "28 keyboard stops;
    // 28 show where the keyboard is" and exited 0, while the README said it
    // checks every stop.
    //
    // So it gets its own pass, in the state a visitor meets it in.
    await page.evaluate(() => scrollTo(0, 800));
    await page.waitForTimeout(600);
    await label();

    const upward = await page.evaluate(
      () =>
        [...document.querySelectorAll("button")]
          .find((b) => (b.getAttribute("aria-label") ?? "") === "Scroll to top")
          ?.getAttribute("data-probe") ?? "",
    );

    if (!upward) {
      throw new Error(
        "the scroll-to-top button was not on the page after scrolling, so its focus indicator went unmeasured — which is how it went unmeasured for the whole of this gate's life",
      );
    }

    stops.push(await paintedBy(page, upward));
  } finally {
    await browser.close();
    stop();
  }

  const verdicts = judgeFocus(stops);
  const broken = failures(verdicts);

  console.log(`${stops.length} keyboard stops; ${verdicts.length - broken.length} show where the keyboard is`);

  if (broken.length > 0) {
    throw new Error(
      `Some controls do not show keyboard focus:\n  ${broken
        .map((v) => `${v.name}: ${v.problem}`)
        .join("\n  ")}\n\n` +
        `Every interactive element should carry \`focus-ring\` (or \`focus-ring-always\` for a ` +
        `text field), defined in src/index.css. An indicator paints well over ${PAINTS_SOMETHING} ` +
        `pixels — the smallest on this page paints 287 — of which at least ${ENOUGH_IN_PAGE_COLOUR} ` +
        `must be the page's cyan. A control with no style of its own still paints, because Chrome ` +
        `draws its own ring; the colour is what tells the two apart.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
