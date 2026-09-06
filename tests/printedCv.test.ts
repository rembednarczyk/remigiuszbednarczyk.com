import { describe, expect, it } from "vitest";
import {
  DRIFT_TOLERANCE,
  EXPECTED_LAYOUT,
  blankShareOf,
  layoutDrift,
  readsAsACv,
  sheetsWhoseInkIsNotPlausible,
  titleMissingProvenance,
  type PrintedPage,
} from "../scripts/printedCv";

/**
 * The printing itself needs a browser and runs as its own CI step. What is
 * held here is the part that decides whether the printed layout still
 * matches the one that was chosen.
 *
 * This check used to fail any sheet more than a fifth blank, which had the
 * argument backwards: the gaps are the price of keeping a job entry off two
 * sheets, and that price was chosen deliberately. It records the shape
 * instead, and reports when it moves.
 */

const sheet = (number: number, blankShare: number, text = ["Bednarczyk"]): PrintedPage => ({
  number,
  height: 842,
  lowestText: blankShare * 842,
  text,
  // What these checks look at is geometry; ink is the dialog comparison's,
  // and is held in tests/dialogOnPaper.test.ts. Measured on the real CV,
  // where a sheet runs 1.9 to 4.0 points of mean darkness.
  ink: 0.04,
});

/** The recorded layout, reproduced exactly. */
const asRecorded = () => EXPECTED_LAYOUT.map((share, i) => sheet(i + 1, share));

describe("how full a sheet is", () => {
  it("measures the blank strip below the last line", () => {
    expect(blankShareOf({ ...sheet(1, 0), lowestText: 84.2 })).toBeCloseTo(0.1, 2);
  });

  it("calls a page with text at the very bottom full", () => {
    expect(blankShareOf({ ...sheet(1, 0), lowestText: 0 })).toBe(0);
  });

  it("does not divide by a height it was not given", () => {
    expect(blankShareOf({ ...sheet(1, 0.5), height: 0 })).toBe(0);
  });
});

describe("comparing a printed document to the recorded layout", () => {
  it("says nothing about the layout it recorded", () => {
    const drift = layoutDrift(asRecorded());

    expect(drift.lengthChanged).toBe(false);
    expect(drift.sheets).toEqual([]);
  });

  it("ignores a sheet that moved by less than the tolerance", () => {
    // A Chrome release nudging line breaking must not fail a build.
    const pages = asRecorded();
    pages[2] = sheet(3, EXPECTED_LAYOUT[2] + DRIFT_TOLERANCE / 2);

    expect(layoutDrift(pages).sheets).toEqual([]);
  });

  it("reports a sheet that moved by more, in both directions", () => {
    const fuller = asRecorded();
    fuller[0] = sheet(1, EXPECTED_LAYOUT[0] - DRIFT_TOLERANCE - 0.01);
    expect(layoutDrift(fuller).sheets.map((s) => s.sheet)).toEqual([1]);

    const emptier = asRecorded();
    emptier[0] = sheet(1, EXPECTED_LAYOUT[0] + DRIFT_TOLERANCE + 0.01);
    expect(layoutDrift(emptier).sheets.map((s) => s.sheet)).toEqual([1]);
  });

  it("notices the document changing length", () => {
    // Taking break-inside-avoid off the sections drops it to five sheets,
    // which is the change this exists to report.
    const shorter = asRecorded().slice(0, 5);

    expect(layoutDrift(shorter).lengthChanged).toBe(true);
  });

  it("reports a sheet nothing was recorded for", () => {
    const longer = [...asRecorded(), sheet(7, 0.4)];
    const drift = layoutDrift(longer);

    expect(drift.lengthChanged).toBe(true);
    expect(drift.sheets.map((s) => s.sheet)).toEqual([7]);
  });

  it("reports every sheet that moved, not just the first", () => {
    const pages = asRecorded();
    pages[0] = sheet(1, 0.1);
    pages[3] = sheet(4, 0.1);

    expect(layoutDrift(pages).sheets.map((s) => s.sheet)).toEqual([1, 4]);
  });

  it("carries both numbers, so a failure says what changed and to what", () => {
    const pages = asRecorded();
    pages[0] = sheet(1, 0.1);
    const [change] = layoutDrift(pages).sheets;

    expect(change.expected).toBe(EXPECTED_LAYOUT[0]);
    expect(change.measured).toBeCloseTo(0.1, 2);
  });

  it("keeps a tolerance smaller than the change it exists to catch", () => {
    // Removing break-inside-avoid moved sheets by 9 to 52 points. A
    // tolerance at or above that would admit the very change it watches for.
    expect(DRIFT_TOLERANCE).toBeLessThan(0.09);
    expect(DRIFT_TOLERANCE).toBeGreaterThan(0.02);
  });
});

describe("whether the extraction found anything at all", () => {
  it("accepts a document that carries the name", () => {
    expect(readsAsACv([sheet(1, 0.1, ["Remigiusz", "Bednarczyk"])], "Bednarczyk")).toBe(true);
  });

  it("refuses an empty document", () => {
    // Without this, a PDF that came back with no text has no sheets to
    // disagree about and passes everything above.
    expect(readsAsACv([], "Bednarczyk")).toBe(false);
  });

  it("refuses a document that is somebody else's", () => {
    expect(readsAsACv([sheet(1, 0.1, ["Lorem ipsum"])], "Bednarczyk")).toBe(false);
  });
});

describe("whether the exported PDF's Title names the origin", () => {
  const origin = "remigiuszbednarczyk.com";

  it("accepts a title that carries the origin", () => {
    expect(titleMissingProvenance(`Remigiusz Bednarczyk — CV — ${origin}`, origin)).toBe(false);
  });

  it("reports a title that does not", () => {
    // The live page's own title names the person and the role but not the
    // origin, so the untagged print — the beforeprint hook gone — fails here.
    expect(
      titleMissingProvenance("Remigiusz Bednarczyk | Quality Engineering Lead", origin),
    ).toBe(true);
  });

  it("treats a PDF with no Title metadata at all as the failure it is", () => {
    expect(titleMissingProvenance(null, origin)).toBe(true);
    expect(titleMissingProvenance(undefined, origin)).toBe(true);
  });
});

/**
 * The dialog check holds one print against the other, which is exactly why
 * it cannot report a rasteriser that has stopped reading the page: the same
 * wrong number on both sides is agreement. Both ways of getting it wrong are
 * one line, and neither changes a word of extracted text.
 */
describe("whether the rasteriser read the sheet at all", () => {
  const inked = (ink: number): PrintedPage => ({ ...sheet(1, 0.1), ink });

  it("accepts the ink a sheet of this CV actually carries", () => {
    // The six, measured: 1.9, 2.5, 2.8, 2.9, 3.6, 4.0 percent.
    expect(
      sheetsWhoseInkIsNotPlausible([0.019, 0.025, 0.028, 0.029, 0.036, 0.04].map(inked)),
    ).toEqual([]);
  });

  it("refuses a sheet that came back blank, which is a render that did nothing", () => {
    expect(sheetsWhoseInkIsNotPlausible([inked(0)])).toHaveLength(1);
  });

  it("refuses a sheet that came back solid, which is a canvas nobody put paper on", () => {
    // A fresh canvas is transparent black, so a sheet drawn on one reads 1
    // — in both documents, which is agreement. Today pdfjs paints white
    // before it draws and the rasteriser's own fill is redundant, measured;
    // that is a default it can change, and this is what would notice.
    const [problem] = sheetsWhoseInkIsNotPlausible([inked(1)]);

    expect(problem).toContain("100.0% ink");
  });
});
