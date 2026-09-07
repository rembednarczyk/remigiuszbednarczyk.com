/**
 * What the printed CV is supposed to look like.
 *
 * The CV is the one thing this site produces that nobody sees on a screen,
 * so nothing but this looks at it.
 *
 * It does not judge the layout. It was written to, and had the argument
 * backwards: it failed any sheet more than a fifth blank at the foot, on
 * the reasoning that a gap means a block too tall to fit moved to the next
 * page whole. That is exactly what happens here, and it is deliberate —
 * sections and job entries carry break-inside-avoid so that an entry is
 * never cut across two sheets, and the owner would rather have the gaps and
 * the sixth sheet than have entries split.
 *
 * So this records the shape that choice produces and reports when it
 * changes. A gap is not a fault; a gap nobody decided on is.
 */

export interface PrintedPage {
  /** 1-based, in reading order. */
  number: number;
  /** Height of the sheet in points, as the PDF declares it. */
  height: number;
  /** Distance from the foot of the sheet to the lowest text on it. */
  lowestText: number;
  /** Every non-empty string on the page, in the order the PDF lists them. */
  text: string[];
  /**
   * How dark the sheet is on average once rasterised: 0 for blank paper, 1
   * for solid black. Text alone puts a few points on it.
   *
   * Extracted text is not the artifact. It is what the artifact says, and a
   * sheet can be ruined without a word of it changing — which is exactly
   * what the dialog defect's other half did. Measured as mean darkness
   * rather than as the share of pixels that are not white, because a share
   * saturates: over a sheet that already carries a tint, laying a black
   * panel across it moves "not white" by nothing at all.
   */
  ink: number;
}

/**
 * The blank share of each sheet, in order, as the chosen layout produces
 * it. Measured from the PDF, not decided: sections kept whole leave these
 * gaps, and this is what they are.
 *
 * The last sheet reads fuller than the others' history because the provenance
 * footer sits at the foot of it — a deliberate line, so the recorded shape
 * moved with it (0.18 to 0.13) rather than the check being widened to hide it.
 */
export const EXPECTED_LAYOUT = [0.38, 0.22, 0.14, 0.58, 0.05, 0.13];

/**
 * How far a sheet may drift before it is worth a look.
 *
 * Wide enough that a Chrome release nudging line breaking by a point or two
 * does not fail a build, narrow enough that a section moving across a page
 * boundary — which shifts a sheet by tens of points — does. Removing
 * break-inside-avoid moves every sheet by 9 to 52 points, and one sheet
 * disappears entirely.
 */
export const DRIFT_TOLERANCE = 0.08;

/** The share of a sheet left empty below the last line of text on it. */
export function blankShareOf(page: PrintedPage): number {
  if (page.height <= 0) return 0;
  return page.lowestText / page.height;
}

export interface LayoutChange {
  sheet: number;
  expected: number;
  measured: number;
}

/**
 * Sheets whose fill no longer matches the recorded layout, and a note if
 * the document changed length.
 */
export function layoutDrift(
  pages: PrintedPage[],
  expected: number[] = EXPECTED_LAYOUT,
  tolerance = DRIFT_TOLERANCE,
): { lengthChanged: boolean; sheets: LayoutChange[] } {
  const sheets = pages
    .map((page) => ({
      sheet: page.number,
      expected: expected[page.number - 1] ?? Number.NaN,
      measured: blankShareOf(page),
    }))
    .filter(
      ({ expected: want, measured }) =>
        Number.isNaN(want) || Math.abs(measured - want) > tolerance,
    );

  return { lengthChanged: pages.length !== expected.length, sheets };
}

/**
 * Whether the extraction found a document at all.
 *
 * Without this, a PDF that came out empty — a failed render, a font the
 * reader cannot decode — passes everything above by having no sheets to
 * disagree about.
 */
export function readsAsACv(pages: PrintedPage[], expectedName: string): boolean {
  const all = pages.flatMap((page) => page.text).join(" ");
  return pages.length > 0 && all.includes(expectedName);
}

/**
 * Whether the exported PDF's Title metadata names the CV's origin.
 *
 * The origin is not hidden in the page — near-invisible body text is what an
 * applicant tracking system flags as fraud, so it rides the PDF's Title
 * instead, set for the print alone. A browser copies the document title into
 * the file's Title metadata and nothing else it is given, so this is where a
 * name-swap-resistant, ATS-safe mark lives. This reads it back: the print gate
 * tags the title through the same `beforeprint` the browser fires, and this
 * refuses a print whose metadata lost the origin — the hook gone, or the title
 * left untagged.
 *
 * A null title is the failure, not an exception: a PDF with no Title metadata
 * at all is exactly the case worth catching.
 */
export function titleMissingProvenance(
  title: string | null | undefined,
  origin: string,
): boolean {
  return title == null || !title.includes(origin);
}

/**
 * How much darker a sheet may get with a dialog open before it is a fault.
 *
 * The two prints come from one page render, so an untouched sheet
 * rasterises identically: measured on all six with the tolerance turned off,
 * and every one agreed to the tenth of a point this reports — 2.9, 3.6, 4.0,
 * 1.9, 2.8, 2.5.
 *
 * So this is not a tolerance for noise; it is the smallest mark worth
 * calling a mark. Half a point of mean darkness is around a sixth of what a
 * sheet of this CV's body text puts on paper. The defect it exists for puts
 * on tens of points.
 */
export const INK_TOLERANCE = 0.005;

/**
 * The band a sheet of this CV's ink falls in, and the reason there is one.
 *
 * The comparison above is between two prints, so an instrument that reads
 * the same wrong number twice passes it — for good, and with every sheet's
 * ink printed in the log to say so. A render that never happened reads 0 on
 * every sheet; a canvas with no paper under it reads 1, because a fresh one
 * is transparent black.
 *
 * That second one is not hypothetical for the reason it looks: dropping the
 * white fill from the rasteriser changed nothing, measured, because pdfjs
 * paints a white background before it draws. Which is the argument for
 * having this and not for leaving it out. The number's floor rests on a
 * library default that no line here states, so something has to read the
 * result back and say whether it can be true.
 *
 * Measured on the six sheets: 1.9, 2.5, 2.8, 2.9, 3.6, 4.0 percent. The band
 * is wide enough that redesigning the CV does not fail a build and narrow
 * enough that neither blind reading is inside it.
 */
const PLAUSIBLE_INK = { least: 0.005, most: 0.2 };

/** Sheets whose ink says the rasteriser is not reading the page. */
export function sheetsWhoseInkIsNotPlausible(pages: PrintedPage[]): string[] {
  return pages
    .filter((page) => page.ink < PLAUSIBLE_INK.least || page.ink > PLAUSIBLE_INK.most)
    .map(
      (page) =>
        `sheet ${page.number} rasterised to ${(page.ink * 100).toFixed(1)}% ink, and a sheet of this CV runs ${(PLAUSIBLE_INK.least * 100).toFixed(1)}% to ${(PLAUSIBLE_INK.most * 100).toFixed(0)}%`,
    );
}

/** Every string with the number of times the sheet carries it. */
function countsOf(strings: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const string of strings) counts.set(string, (counts.get(string) ?? 0) + 1);
  return counts;
}

/**
 * Strings one sheet has and the other does not, counted rather than
 * collected into a set: a second copy of a heading already on the page is a
 * change, and a set cannot see it.
 */
function surplusOver(these: string[], those: string[]): string[] {
  const available = countsOf(those);
  const surplus: string[] = [];

  for (const [string, count] of countsOf(these)) {
    for (let i = 0; i < count - (available.get(string) ?? 0); i += 1) surplus.push(string);
  }

  return surplus;
}

/**
 * To a tenth of a point, because the tolerance is half of one. Reporting
 * whole percents against it would print two identical numbers beside a
 * complaint that they differ.
 */
const asPercent = (share: number) => `${(share * 100).toFixed(1)}%`;

const listed = (strings: string[]) =>
  strings
    .slice(0, 4)
    .map((s) => JSON.stringify(s.trim().slice(0, 30)))
    .join(", ");

/**
 * What an open dialog did to the printed CV.
 *
 * The dialog shell portals into `document.body`, which places it outside the
 * wrapper that hides the screen page from the printer. Printed with the
 * privacy policy open, its text came back from all six sheets — a fixed
 * element repeats on every page — and its backdrop left 96% of each sheet
 * dark. Nothing saw it, because the gate printed a freshly loaded page and
 * never opened anything.
 *
 * Stated as a relationship rather than a list of forbidden words: printing
 * with a dialog open must produce the same document as printing without it.
 * A word list would have to be kept in step with the dialog's prose, and the
 * first edit to that prose would quietly empty the check.
 *
 * "The same document" is four claims, and the first version of this made
 * one of them. It compared sets of added strings, in one direction, with no
 * emptiness guard on the second print — so a print that came back textless
 * read as identical, text a dialog *removed* was invisible at equal sheet
 * count, and a repeated string was invisible at any. Worse, the defect it
 * was written for had two halves and it measured the half made of words:
 * moving `print:hidden` from the shell to the panel takes the dialog's text
 * off paper and leaves its backdrop on, which is every sheet covered and
 * not one string changed.
 */
export function whatADialogDidToThePrint(
  withoutDialog: PrintedPage[],
  withDialog: PrintedPage[],
  expectedName: string,
): string[] {
  const problems: string[] = [];

  // Both documents are guarded, and by the same thing. Guarding only the
  // baseline left the comparison passing on whatever the second print
  // turned out to be, which is the failure mode a comparison has.
  if (!readsAsACv(withoutDialog, expectedName)) {
    return [
      `printing without the dialog produced no sheet carrying "${expectedName}", so there is nothing to compare against`,
    ];
  }

  if (!readsAsACv(withDialog, expectedName)) {
    return [
      `printing with the dialog open produced no sheet carrying "${expectedName}" — everything below would pass on an empty document`,
    ];
  }

  if (withDialog.length !== withoutDialog.length) {
    problems.push(
      `it runs to ${withDialog.length} sheets with a dialog open and ${withoutDialog.length} without one`,
    );
  }

  for (let i = 0; i < Math.min(withDialog.length, withoutDialog.length); i += 1) {
    const before = withoutDialog[i];
    const after = withDialog[i];

    const gained = surplusOver(after.text, before.text);
    const lost = surplusOver(before.text, after.text);

    if (gained.length > 0) {
      problems.push(
        `sheet ${i + 1} carries ${gained.length} string${gained.length === 1 ? "" : "s"} that printing without the dialog does not: ${listed(gained)}`,
      );
    }

    if (lost.length > 0) {
      problems.push(
        `sheet ${i + 1} is missing ${lost.length} string${lost.length === 1 ? "" : "s"} that printing without the dialog carries: ${listed(lost)}`,
      );
    }

    if (Math.abs(after.ink - before.ink) > INK_TOLERANCE) {
      problems.push(
        `sheet ${i + 1} is ${asPercent(after.ink)} covered in ink with the dialog open and ${asPercent(before.ink)} without, and not a string of it need have changed`,
      );
    }
  }

  return problems;
}
