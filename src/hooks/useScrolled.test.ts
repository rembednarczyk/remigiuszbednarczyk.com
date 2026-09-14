import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useScrolled } from "./useScrolled";

/**
 * The header's condense trigger. What matters is the two behaviours the
 * header depends on: it must be right at mount (a reload below the fold opens
 * already-deepened, not flipping on the first scroll), and it must flip when
 * the page crosses the threshold.
 */

function setScrollY(y: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true });
}

afterEach(() => setScrollY(0));

describe("useScrolled", () => {
  it("reads the current position at mount, not on the next scroll", () => {
    setScrollY(200);
    const { result } = renderHook(() => useScrolled(24));
    expect(result.current).toBe(true);
  });

  it("is false at the top of the page", () => {
    setScrollY(0);
    const { result } = renderHook(() => useScrolled(24));
    expect(result.current).toBe(false);
  });

  it("flips true once the page passes the threshold", async () => {
    setScrollY(0);
    const { result } = renderHook(() => useScrolled(24));
    expect(result.current).toBe(false);

    setScrollY(100);
    window.dispatchEvent(new Event("scroll"));
    // The read is coalesced into a requestAnimationFrame, so poll for it.
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("flips back to false above the threshold", async () => {
    setScrollY(300);
    const { result } = renderHook(() => useScrolled(24));
    expect(result.current).toBe(true);

    setScrollY(0);
    window.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(result.current).toBe(false));
  });
});
