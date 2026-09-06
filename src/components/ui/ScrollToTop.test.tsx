import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScrollToTop } from "./ScrollToTop";

/**
 * The button back to the top of a long page.
 *
 * It is mounted only once the consent banner has been answered, and that
 * answer can come after the visitor has already scrolled deep — the banner
 * sat over the content while they read it. So the button has to decide
 * whether to show from where the page already is, not only from the next
 * scroll event, or it is absent exactly where someone would reach for it.
 */

const setScroll = (y: number) => {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
};

afterEach(() => {
  setScroll(0);
});

describe("the scroll-to-top button", () => {
  it("is absent at the top of the page", () => {
    setScroll(0);
    render(<ScrollToTop />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows on mount when the page is already scrolled past the threshold", () => {
    // Mounted after Accept while the reader is deep in the page: the button
    // is there at once, not only after the next scroll.
    setScroll(800);
    render(<ScrollToTop />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
