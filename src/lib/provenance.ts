import { cvData } from "../data/portfolioFacts";

/**
 * Where the printed CV says it came from, and why it says so twice without
 * ever hiding a word.
 *
 * The CV is the one thing this site hands a stranger to keep: a PDF that
 * leaves the site and travels on its own. The theft worth guarding against is
 * not of the file but of the career in it — someone lifts the record, swaps
 * the name at the top for their own, and passes the experience off as theirs.
 *
 * The first instinct was to hide a mark where a name-swapper would not look:
 * white text in the print's layer, invisible on the sheet. That was built,
 * measured, and then pulled out, because it is exactly the pattern an
 * applicant tracking system flags as fraud. Invisible or near-invisible body
 * text — white on white, a one-pixel font, anything positioned off the page —
 * is the signature of keyword stuffing, and an ATS that finds it can quietly
 * drop the CV or blacklist the sender. A safeguard that gets the document
 * auto-rejected is worse than no safeguard, so nothing here hides text in the
 * page's body.
 *
 * What is left are two channels that carry the origin without a hidden word:
 *
 *   - The PDF's Title metadata. A browser printing to PDF copies the page's
 *     `<title>` into the document's Title, and nothing else it is given —
 *     measured: `<meta>` author, subject and keywords are dropped. Title is
 *     not body text, so an ATS reading the document's content never meets it,
 *     and editing the visible page does not touch it. It is the overlookable
 *     layer: it survives a name-swap and reads back from the file's
 *     properties, though a determined thief can strip it with a metadata
 *     editor.
 *
 *   - A plain, legible footer line on the page. Ordinary dark text at an
 *     ordinary size — an ATS reads it as the professional detail it looks
 *     like, and there is nothing about it to flag. A name-swapper can see and
 *     delete it, which is the price of it being safe to submit; a careless one
 *     may leave it.
 *
 * Both are derived from the facts the CV already renders — the origin is the
 * site's own `website`, the name is the CV's — so the day either changes, both
 * follow rather than going stale.
 */

/** The origin both channels assert: the site this CV was generated from. */
export const PROVENANCE_ORIGIN: string = cvData.header.website;

/**
 * The title the exported PDF should carry in its metadata. Names the person
 * and the origin, so reading the file's properties answers both whose CV it
 * is and where it came from. Set on the document only while printing, so the
 * live page keeps the title search engines index.
 */
export const PROVENANCE_TITLE = `${cvData.header.name} — CV — ${PROVENANCE_ORIGIN}`;

/** The visible footer line: plain, legible, and true whatever the reader does. */
export const PROVENANCE_FOOTER = `Generated from ${PROVENANCE_ORIGIN}`;
