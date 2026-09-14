import { m, useReducedMotion, useScroll, useSpring } from "motion/react";

/**
 * A hairline bar across the top edge that fills as the page scrolls.
 *
 * `useScroll` drives it through a MotionValue, so the fill is written to the
 * element every frame and React never re-renders — the reason this is a
 * motion value and not state read from a scroll listener. A light spring
 * turns the fast-wheel jitter into a glide; under a reduced-motion
 * preference the smoothing is dropped and the bar tracks the scroll 1:1,
 * which is the honest answer for a bar that mirrors the visitor's own
 * movement rather than moving on its own.
 *
 * Only transform animates (scaleX from a left origin), so it stays on the
 * GPU. `print:hidden` because it is a fixed overlay — the same rule the
 * dialog shell, the consent bar and the scroll-to-top button each carry, a
 * fixed element otherwise repeating on every printed sheet of the CV.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const smoothed = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  const reduce = useReducedMotion();
  const scaleX = reduce ? scrollYProgress : smoothed;

  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed top-0 inset-x-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-cyan-400 to-purple-500 print:hidden pointer-events-none"
    />
  );
}
