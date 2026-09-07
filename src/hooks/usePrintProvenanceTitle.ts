import { useEffect } from "react";
import { PROVENANCE_TITLE } from "../lib/provenance";

/**
 * Tags the exported CV's PDF metadata with its origin, and only while printing.
 *
 * A browser printing to PDF copies the document's title into the file's Title
 * metadata. So the origin is put there for the duration of the print and taken
 * straight back off: `beforeprint` sets the title, `afterprint` restores
 * whatever it was — the title search engines index on the live page is
 * untouched, and the only document that carries the tagged title is the one
 * coming off the printer.
 *
 * Both print paths are covered because both fire these events: the browser's
 * own print command, and the `window.print()` the QR-code auto-print calls.
 * The metadata is not body text, so an applicant tracking system reading the
 * document's content never meets it and there is nothing here to flag as a
 * hidden mark — which is the whole reason the origin rides the title rather
 * than an invisible line on the page.
 *
 * Restoring in a cleanup as well as on `afterprint`: a print dialog left open
 * when the component unmounts would otherwise strand the tagged title on the
 * live document.
 */
export function usePrintProvenanceTitle(title: string = PROVENANCE_TITLE) {
  useEffect(() => {
    let original: string | null = null;

    const tag = () => {
      // Guard against a second beforeprint before an afterprint, which would
      // save the tagged title as the thing to restore to.
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
