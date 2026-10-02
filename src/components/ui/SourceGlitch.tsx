import { Fragment, ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { highlightTsx } from "../../lib/highlightTsx";

/**
 * Reveals the real code behind a section by overwriting the section in place
 * with a glitch, for as long as the trigger is hovered or focused.
 *
 * The trigger is not a separate button: a caller passes `triggerRef` pointing
 * at an element it already renders — on the hero, the "Hello World" greeting —
 * and this wires hover, focus, tap and keyboard onto it. Hovering the greeting
 * shatters the whole section into its source; leaving the area (or pressing
 * Escape) plays the shatter in reverse and restores the view. The panel is
 * transparent and fills the section's own box while its live content fades
 * out beneath it, so the view appears to turn into its source in place — no
 * window, no border, the page's own ground showing through.
 *
 * The source is the section's real content file, imported as text in
 * lib/sourcePeek and coloured by lib/highlightTsx — not hand-copied, not a
 * decorative mock. Motion is CSS (`source-glitch-*` in index.css), transform
 * and opacity and clip-path only; the reduced-motion rule there makes it a
 * plain crossfade and this never schedules the discovery hint under it. The
 * panel is `print:hidden`, and the section's content prints as it always did.
 */

type Phase = "idle" | "open" | "closing";

interface SourceGlitchProps {
  /** The component source to reveal — from lib/sourcePeek, not written here. */
  code: string;
  /** The element that reveals it: a caller's own greeting, heading, etc. */
  triggerRef: RefObject<HTMLElement | null>;
  /** The rendered section this overwrites while open. */
  children: ReactNode;
}

const CLOSE_MS = 440;
const HINT_EVERY_MS = 7000;

export function SourceGlitch({ code, triggerRef, children }: SourceGlitchProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [found, setFound] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const tokens = useMemo(() => highlightTsx(code), [code]);

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
    setPhase((current) => (current === "idle" ? current : "closing"));
    closeTimer.current = window.setTimeout(() => setPhase("idle"), CLOSE_MS);
  }, [reduce]);

  // Wire the caller's own element as the trigger: hover and focus peek, tap
  // and Enter toggle, Escape closes. Hover is gated to a mouse so a tap does
  // not both toggle (click) and open (synthetic enter).
  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const toggle = () => (phaseRef.current === "idle" ? open() : close());
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") open();
    };
    const onKey = (e: KeyboardEvent) => {
      // Enter and Space come through as a native-button click (below); only
      // Escape needs handling here. Focus deliberately does NOT open: a
      // keyboard visitor tabbing past the greeting should not have the panel
      // pop open and cover the controls after it — they activate on purpose.
      if (e.key === "Escape") close();
    };
    const onClick = (e: PointerEvent) => {
      // Keyboard activation (detail 0) and touch/pen toggle; a mouse peeks on
      // hover, so a mouse click is left to do nothing rather than toggle shut.
      if (e.detail === 0 || e.pointerType === "touch" || e.pointerType === "pen") toggle();
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("keydown", onKey);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("click", onClick);
    };
  }, [triggerRef, open, close]);

  // Keep the trigger's expanded-state announcement in step with the panel.
  useEffect(() => {
    triggerRef.current?.setAttribute("aria-expanded", String(phase !== "idle"));
  }, [triggerRef, phase]);

  // Discovery hint: a subtle glitch on the trigger every few seconds, stopped
  // for good once the visitor opens it, never scheduled under reduced motion.
  useEffect(() => {
    if (reduce || found) return;
    const timer = window.setInterval(() => {
      const el = triggerRef.current;
      if (!el || document.hidden) return;
      el.classList.remove("is-hinting");
      void el.offsetWidth;
      el.classList.add("is-hinting");
    }, HINT_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [triggerRef, reduce, found]);

  // Tapping the revealed code dismisses it — the way a touch visitor closes it,
  // since the covered greeting can no longer be tapped. Attached here rather
  // than as a JSX handler so the panel stays a non-interactive container.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onClick = () => close();
    panel.addEventListener("click", onClick);
    return () => panel.removeEventListener("click", onClick);
  }, [close]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const isOpen = phase !== "idle";

  return (
    <div
      ref={wrapRef}
      className="source-peek"
      data-phase={phase}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") close();
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget)) close();
      }}
    >
      <div className="source-peek__content">{children}</div>
      <div ref={panelRef} className="source-peek__panel print:hidden" aria-hidden={!isOpen}>
        {isOpen && (
          <pre className="source-peek__code">
            {tokens.map((token, index) =>
              token.cls ? (
                <span key={index} className={token.cls}>
                  {token.text}
                </span>
              ) : (
                <Fragment key={index}>{token.text}</Fragment>
              ),
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
