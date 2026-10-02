import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Wraps a section and lets a visitor peek at the real code behind it, revealed
 * with a deliberate glitch that settles to still, readable source.
 *
 * The trigger is an explicit `</>` button, not a hover on the whole section:
 * hover alone has no touch equivalent and fires while someone is only reading.
 * So a click, tap or Enter pins the panel open (and pins it shut again); on a
 * mouse, hovering the button is a quick peek that restores on leave. The code
 * is the component's own source, sliced from a `?raw` import in lib/sourcePeek
 * — see there for why it is not hand-copied.
 *
 * Motion lives in index.css as `source-glitch-*` keyframes: the open shatters
 * in over ~640ms and settles; the close plays it in reverse, a touch quicker,
 * so open and close read as one effect rather than a snap. A subtle hint
 * glitches the trigger every few seconds to say it is there, and stops for
 * good once the visitor opens anything. Under a reduced-motion preference the
 * global rule in index.css makes every glitch instant, the hint is never
 * scheduled, and the close skips its reverse pass — a plain crossfade.
 *
 * The trigger and the panel are `print:hidden`, like every other overlay; the
 * section's own content prints as it always did.
 */

type Phase = "idle" | "open" | "closing";

interface SourceGlitchProps {
  /** The component file's name, shown in the panel header. */
  file: string;
  /** The real source to reveal — from lib/sourcePeek, not written by hand. */
  code: string;
  /** The rendered section this peeks behind. */
  children: ReactNode;
}

const CLOSE_MS = 440;
const HINT_EVERY_MS = 7000;

export function SourceGlitch({ file, code, children }: SourceGlitchProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [pinned, setPinned] = useState(false);
  const [found, setFound] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number>(0);

  const open = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    setFound(true);
    setPhase("open");
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    if (reduce) {
      setPhase("idle");
      return;
    }
    // Keep the panel up for the reverse glitch, then clear it.
    setPhase((current) => (current === "idle" ? current : "closing"));
    closeTimer.current = window.setTimeout(() => setPhase("idle"), CLOSE_MS);
  }, [reduce]);

  const toggle = () => {
    if (pinned) {
      setPinned(false);
      close();
    } else {
      setPinned(true);
      open();
    }
  };

  // The discovery hint: a subtle glitch on the trigger every few seconds,
  // never scheduled under reduced motion and stopped for good once the
  // visitor has opened the panel. It no-ops while the tab is hidden.
  useEffect(() => {
    if (reduce || found) return;
    const timer = window.setInterval(() => {
      const el = triggerRef.current;
      if (!el || document.hidden) return;
      el.classList.remove("is-hinting");
      void el.offsetWidth; // restart the one-shot animation
      el.classList.add("is-hinting");
    }, HINT_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [reduce, found]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const isOpen = phase !== "idle";

  return (
    <div className="source-peek" data-phase={phase}>
      {children}
      <button
        ref={triggerRef}
        type="button"
        className="source-peek__trigger focus-ring print:hidden"
        aria-expanded={isOpen}
        aria-label={`View this section's source — ${file}`}
        onClick={toggle}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse" && !pinned) open();
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && !pinned) close();
        }}
      >
        &lt;/&gt; source
      </button>
      <div className="source-peek__panel print:hidden" aria-hidden={!isOpen}>
        <div className="source-peek__file">⌁ {file}</div>
        <pre className="source-peek__code">{code}</pre>
      </div>
    </div>
  );
}
