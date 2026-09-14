import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MotionProvider } from "../MotionProvider";
import { ScrollProgress } from "./ScrollProgress";

/**
 * The bar is decoration that mirrors the scroll, so the properties worth
 * guarding are the ones whose absence is a real bug: it must be hidden from
 * assistive technology (a progress reading that means nothing spoken aloud),
 * it must not print (a fixed overlay otherwise lands on every sheet of the
 * CV), and it must scale from the left so it fills rather than centres.
 * Rendered inside MotionProvider because `m` needs the LazyMotion features it
 * supplies.
 */
describe("ScrollProgress", () => {
  const renderBar = () =>
    render(
      <MotionProvider>
        <ScrollProgress />
      </MotionProvider>,
    );

  it("is a fixed, left-origin bar decoration that never prints or speaks", () => {
    const { container } = renderBar();
    const bar = container.querySelector<HTMLElement>("div");

    expect(bar).not.toBeNull();
    expect(bar!.getAttribute("aria-hidden")).toBe("true");
    expect(bar!.className).toContain("fixed");
    expect(bar!.className).toContain("top-0");
    expect(bar!.className).toContain("origin-left");
    expect(bar!.className).toContain("print:hidden");
    expect(bar!.className).toContain("pointer-events-none");
  });
});
