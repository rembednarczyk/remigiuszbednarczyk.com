import { useEffect } from "react";
import { cvData } from "../data/portfolioFacts";

/**
 * The name the exported CV's PDF carries, and only while printing.
 *
 * A browser printing to PDF copies the document's title into the file's Title
 * metadata and offers it as the suggested filename. The live page's title is
 * built for search engines — the name, a pipe, the full role — which is the
 * wrong thing to hand a recruiter as a CV's filename. So for the print alone
 * the title becomes the CV's own name: the person, their title, "CV". Nothing
 * more — no separators to render oddly in a filename, no domain; where the CV
 * came from is the footer's job, not the filename's.
 *
 * `beforeprint` sets it and `afterprint` restores whatever was there, so the
 * live page keeps the title it is indexed by and only the printed document
 * gets the CV name. Both print paths fire these events: the browser's own
 * print command, and the `window.print()` the QR-code auto-print calls.
 *
 * Restoring in the cleanup as well as on `afterprint`: a print dialog left
 * open when the component unmounts would otherwise strand the CV name on the
 * live document.
 */
export const PRINT_TITLE = `${cvData.header.name} ${cvData.header.title} CV`;

export function usePrintTitle(title: string = PRINT_TITLE) {
  useEffect(() => {
    let original: string | null = null;

    const tag = () => {
      // Guard against a second beforeprint before an afterprint, which would
      // save the CV title as the thing to restore to.
      if (original === null) original = document.title;
      document.title = title;
    };

    const restore = () => {
      if (original !== null) {
        document.title = original;
        original = null;
      }
    };

    window.addEventListener("beforeprint", tag);
    window.addEventListener("afterprint", restore);

    return () => {
      window.removeEventListener("beforeprint", tag);
      window.removeEventListener("afterprint", restore);
      restore();
    };
  }, [title]);
}
