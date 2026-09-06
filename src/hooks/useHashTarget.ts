import { useEffect } from "react";

/**
 * Honours a `#section` in the address the page was opened with.
 *
 * The browser does this by itself on an ordinary page: it finds the element
 * and scrolls to it. Here it finds nothing, because the document arrives
 * with an empty root and the sections do not exist until the bundle has run
 * — so a link somebody shared to a particular part of this site put them at
 * the top of it, with no sign that anything was missed.
 *
 * Only the first load needs this. Once the page is up, the element exists
 * and the browser handles later hash changes on its own.
 */
export function useHashTarget(): void {
  useEffect(() => {
    // A stray or invalid `%` in the hash makes decodeURIComponent throw
    // (`#%`, `#100%`) — and this runs in the page's mount effect, so the
    // throw would reach the boundary that wraps the whole app and replace
    // the page with its fallback, whose only way out is a reload of the
    // same address: a loop. A hash that will not decode names nothing here,
    // which is the case already handled by staying put.
    let id: string;
    try {
      id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    } catch {
      return;
    }
    if (!id) return;

    // A hash naming nothing on this page is left alone rather than guessed
    // at: staying at the top is the honest answer to an address that means
    // nothing here.
    const target = document.getElementById(id);
    if (!target) return;

    // Not smooth. Smooth is for a movement the reader asked for and can
    // watch; on arrival it is an animation from a place they were never in.
    target.scrollIntoView();
  }, []);
}
