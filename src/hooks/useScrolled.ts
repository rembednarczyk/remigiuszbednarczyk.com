import { useEffect, useState } from "react";

/**
 * Whether the page has scrolled past `after` pixels from the top.
 *
 * The header reads it to deepen once the visitor leaves the hero. The current
 * position is read at the first render rather than waited for — the same
 * choice ScrollToTop makes — so a component that mounts after the page has
 * already moved starts in the right state instead of flipping on the next
 * scroll. The listener is passive and coalesced to one read per frame with
 * requestAnimationFrame, so spinning the wheel does not queue a setState per
 * scroll event.
 */
export function useScrolled(after = 24): boolean {
  const [scrolled, setScrolled] = useState(() => window.scrollY > after);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > after);
        frame = 0;
      });
    };

    // Read once on mount too: `after` can change, and the page may already
    // be scrolled past the new threshold before the next scroll event fires.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [after]);

  return scrolled;
}
