import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFPageProxy, TextItem } from "pdfjs-dist/types/src/display/api.js";
import { serveDirectory } from "./staticServer.ts";
import {
  DRIFT_TOLERANCE,
  EXPECTED_LAYOUT,
  INK_TOLERANCE,
  blankShareOf,
  layoutDrift,
  readsAsACv,
  titleIsNotCvName,
  sheetsWhoseInkIsNotPlausible,
  whatADialogDidToThePrint,
  type PrintedPage,
} from "./printedCv.ts";

/**
 * Prints the site and reads the sheets back.
 *
 * Run through `npm run check:print`, and in CI as its own step, for the
 * same reason as the Lighthouse gate: it needs a browser and it is the
 * only thing that looks at the one artifact nobody sees on a screen.
 */

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const PORT = 5187;

/**
 * Whose CV it should be, read from the structured data the same build
 * wrote into the page rather than typed here. Importing the data module
 * directly is not an option: it reaches a directory import that node's
 * resolver will not follow, and a name copied into this file would be one
 * more place to forget.
 */
function nameTheBuildDeclares(): string {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const person = /"@type"\s*:\s*"Person"[\s\S]*?"name"\s*:\s*"([^"]+)"/.exec(html);

  if (!person) throw new Error("no Person name in the built page's structured data");
  return person[1];
}

/**
 * The exported PDF's Title metadata. The print hook names the document for the
 * person on `beforeprint`, which `page.pdf()` fires the same way the browser's
 * print command does, so the bytes read back here carry the CV's name.
 */
async function titleOf(pdf: Uint8Array): Promise<string | null> {
  const doc = await getDocument({ data: pdf, useSystemFonts: true }).promise;
  const { info } = await doc.getMetadata();
  const title = (info as { Title?: unknown }).Title;
  return typeof title === "string" ? title : null;
}

/**
 * How dark a sheet is once it is pixels, 0 for blank paper and 1 for solid
 * black.
 *
 * Rendered at a quarter scale, which is roughly 150x210 pixels for A4: too
 * coarse to read, which does not matter, and far more than enough to see a
 * panel laid across the page, which is the thing extracted text cannot
 * report.
 *
 * The white fill is the paper. A PDF page declares no background of its own
 * and a fresh canvas is transparent black, which would read as solid ink —
 * except that pdfjs paints white before it draws, so removing this line
 * changes nothing, measured. It stays because that default is pdfjs's to
 * change and this is the line the whole number rests on, and because a
 * measurement should not depend on a default it never states. What holds
 * the number honest is not this line but PLAUSIBLE_INK, which reads the
 * result and refuses a sheet that is blank or solid.
 */
async function inkOn(page: PDFPageProxy): Promise<number> {
  const viewport = page.getViewport({ scale: 0.25 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // @napi-rs/canvas and pdfjs describe the same 2D context through two
  // unrelated sets of types, so the handoff is asserted rather than checked.
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let darkness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    darkness += 1 - luminance / 255;
  }

  return darkness / (data.length / 4);
}

async function sheetsOf(pdf: Uint8Array): Promise<PrintedPage[]> {
  const doc = await getDocument({ data: pdf, useSystemFonts: true }).promise;
  const pages: PrintedPage[] = [];

  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number);
    const height = page.getViewport({ scale: 1 }).height;
    const items = (await page.getTextContent()).items
      // items are TextItem or TextMarkedContent; only the former carries text
      .filter((item): item is TextItem => "str" in item)
      .filter((item) => item.str.trim().length > 0);

    pages.push({
      number,
      height,
      // transform[5] is the text's distance from the foot of the sheet.
      // pdfjs types the matrix as any[], so the number is asserted here
      // rather than spread straight into Math.min.
      lowestText: items.length
        ? Math.min(...items.map((i) => Number(i.transform[5])))
        : height,
      text: items.map((i) => i.str),
      ink: await inkOn(page),
    });
  }

  return pages;
}

async function main() {
  if (!existsSync(join(dist, "index.html"))) {
    throw new Error("dist/index.html is missing. Run `npm run build` first.");
  }

  const stop = await serveDirectory(dist, PORT);
  const browser = await chromium.launch();

  let pdf: Uint8Array;
  let withDialogOpen: Uint8Array;
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
    // The page decides what prints; the CV template is what survives
    // print:hidden. Rendering to PDF is what paginates it.
    pdf = new Uint8Array(await page.pdf({ format: "A4", printBackground: true }));

    // And again with a dialog open, which is a state a visitor can print
    // from: the browser's own print command is exactly what the print
    // stylesheet exists for, and it does not care that a dialog is up. The
    // shell portals into document.body, outside the wrapper that hides the
    // screen page, so this is the one overlay that can reach paper.
    const opened = await page.evaluate(() => {
      const link = [...document.querySelectorAll("button")].find((b) =>
        /privacy policy/i.test(b.textContent ?? ""),
      );
      if (!link) return false;
      link.click();
      return true;
    });
    if (!opened) {
      throw new Error(
        "no control opened the privacy dialog, so the print below proves nothing about a dialog it never opened",
      );
    }
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(600);

    withDialogOpen = new Uint8Array(
      await page.pdf({ format: "A4", printBackground: true }),
    );
  } finally {
    await browser.close();
    stop();
  }

  // Read the metadata from a copy first: pdfjs detaches the buffer it is
  // handed, so sheetsOf below would leave nothing for titleOf to reopen.
  const title = await titleOf(pdf.slice());
  const pages = await sheetsOf(pdf);
  const withDialog = await sheetsOf(withDialogOpen);

  console.log(`the printed CV runs to ${pages.length} sheets`);
  for (const page of pages) {
    const share = blankShareOf(page);
    const want = EXPECTED_LAYOUT[page.number - 1];
    const note = want === undefined ? " (no recorded value)" : ` (recorded ${Math.round(want * 100)}%)`;
    console.log(
      `  sheet ${page.number}: ${Math.round(share * 100)}% blank at the foot${note}, ${Math.round(page.ink * 100)}% ink`,
    );
  }

  const problems: string[] = [];
  const name = nameTheBuildDeclares();

  if (!readsAsACv(pages, name)) {
    problems.push(
      `no text came back from the PDF, or it does not carry "${name}" — everything below would pass on an empty document`,
    );
  }

  if (titleIsNotCvName(title, name)) {
    problems.push(
      `the exported CV's PDF Title is not the CV's name: the Title is ${JSON.stringify(title)}, and it should hold ` +
        `"${name}" and the word "CV". The document is named for the person on print by the beforeprint hook in ` +
        `src/hooks/usePrintTitle.ts, which page.pdf() fires the same way the browser's print command does; if this ` +
        `fails, the hook is not running and the file carries the indexed page title instead.`,
    );
  } else {
    console.log(`the exported CV's PDF Title is the CV's name: ${JSON.stringify(title)}`);
  }

  // And that the rasteriser read the page, which the comparison below cannot
  // tell: it holds one print against the other, so an instrument returning
  // the same wrong number for both satisfies it forever.
  //
  // Thrown here rather than added to `problems`, and before anything else
  // runs, because everything below reports a page that changed and this
  // reports an instrument that stopped reading. Collected with the rest, it
  // printed six blind sheets under a heading about break-inside-avoid,
  // which sends whoever reads it to the wrong file.
  const blind = sheetsWhoseInkIsNotPlausible(pages);

  if (blind.length > 0) {
    throw new Error(
      `The rasteriser is not reading the printed sheets:\n  ${blind.join("\n  ")}\n\n` +
        `Nothing above this line is wrong with the CV. inkOn in this file renders each sheet ` +
        `and averages its darkness, and the dialog check compares that number between two prints ` +
        `— so an instrument returning the same wrong number for both agrees with itself forever. ` +
        `That is what this refuses.`,
    );
  }

  const drift = layoutDrift(pages);

  if (drift.lengthChanged) {
    problems.push(
      `it runs to ${pages.length} sheets, and the recorded layout has ${EXPECTED_LAYOUT.length}`,
    );
  }

  for (const sheet of drift.sheets) {
    problems.push(
      Number.isNaN(sheet.expected)
        ? `sheet ${sheet.sheet} is new, and nothing is recorded for it`
        : `sheet ${sheet.sheet} is ${Math.round(sheet.measured * 100)}% blank at the foot, and ${Math.round(sheet.expected * 100)}% was recorded`,
    );
  }

  const leaked = whatADialogDidToThePrint(pages, withDialog, name);

  console.log(
    leaked.length === 0
      ? `printing with the privacy dialog open produces the same document: same sheets, same strings, and no sheet more than ${(INK_TOLERANCE * 100).toFixed(1)}% different in ink`
      : "printing with the privacy dialog open does NOT produce the same document",
  );

  if (leaked.length > 0) {
    throw new Error(
      `An open dialog reaches the printed CV:\n  ${leaked.join("\n  ")}\n\n` +
        `The dialog shell portals into document.body, which puts it outside the print:hidden ` +
        `wrapper in App.tsx, so it needs the rule on itself the way the consent banner and the ` +
        `scroll-to-top button already carry it — on the shell, which is what the backdrop is ` +
        `inside, and not only on the panel. A fixed element repeats on every printed page.`,
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `The printed CV no longer lays out the way it was recorded:\n  ${problems.join("\n  ")}\n\n` +
        `Sections and job entries carry break-inside-avoid so that an entry is never split across two ` +
        `sheets, and the gaps are what that costs. If this change is wanted, update EXPECTED_LAYOUT in ` +
        `scripts/printedCv.ts; the tolerance is ${Math.round(DRIFT_TOLERANCE * 100)} points, which a ` +
        `section crossing a page boundary comfortably exceeds.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
