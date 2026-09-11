import { cvData } from "../data/portfolioFacts";

/**
 * Where the printed CV says it came from — a plain, visible line, and nothing
 * hidden.
 *
 * The CV is the one thing this site hands a stranger to keep: a PDF that
 * leaves the site and travels on its own. The theft worth guarding against is
 * not of the file but of the career in it — someone lifts the record, swaps
 * the name at the top for their own, and passes the experience off as theirs.
 *
 * The first instinct was to hide a mark where a name-swapper would not look:
 * white text in the print's layer, invisible on the sheet. That was built,
 * measured, and pulled out, because near-invisible body text — white on white,
 * a one-pixel font, anything off the page — is exactly the keyword-stuffing
 * signature an applicant tracking system flags, and a mark that gets the CV
 * auto-rejected is worse than none. So nothing here hides text in the body.
 *
 * A second channel put the origin in the PDF's Title metadata, out of the
 * body, where an ATS reading the content never met it. That was pulled out
 * too, for a plainer reason: the Title is the document's own name — what a
 * recruiter sees as the file's title and its suggested filename — and a CV
 * reads better named for the person than for a domain. The title is the CV's
 * own name now (`src/hooks/usePrintTitle.ts`), and the origin rides the one
 * remaining channel:
 *
 *   - A plain footer line on the page. Ordinary dark text at an ordinary size
 *     that an ATS reads as the professional detail it looks like. A name-
 *     swapper can see and delete it — the price of a mark that is safe to
 *     submit — but a careless one may leave it.
 *
 * Derived from the CV's own `website`, so a rename cannot strand it.
 */

/** The origin the footer asserts: the site this CV was generated from. */
export const PROVENANCE_ORIGIN: string = cvData.header.website;

/** The visible footer line: plain, legible, and true whatever the reader does. */
export const PROVENANCE_FOOTER = `Generated from ${PROVENANCE_ORIGIN}`;
