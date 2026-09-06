import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHashTarget } from "./useHashTarget";

/**
 * A link somebody shared to one part of this site.
 *
 * On an ordinary page the browser resolves the anchor itself. Here it finds
 * nothing: the document arrives with an empty root, and the sections do not
 * exist until the bundle has run. The visitor landed at the top with no
 * sign that they had asked for somewhere else.
 */

const scrollIntoView = vi.fn();

/** Puts a section in the document and gives it a scrollIntoView to watch. */
function addSection(id: string) {
  const section = document.createElement("section");
  section.id = id;
  section.scrollIntoView = scrollIntoView;
  document.body.appendChild(section);
  return section;
}

/** jsdom will not let location.hash be assigned, so it is redefined. */
function openWith(hash: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hash },
    configurable: true,
  });
}

const realLocation = window.location;

beforeEach(() => {
  document.body.innerHTML = "";
  openWith("");
});

afterEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: realLocation,
    configurable: true,
  });
});

describe("opening the page at a section", () => {
  it("scrolls to the section the address names", () => {
    addSection("experience");
    openWith("#experience");

    renderHook(() => useHashTarget());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("goes to that section rather than whichever one it finds first", () => {
    addSection("about");
    const wanted = addSection("contact");
    const other = vi.fn();
    document.getElementById("about")!.scrollIntoView = other;
    openWith("#contact");

    renderHook(() => useHashTarget());

    expect(wanted.scrollIntoView).toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();
  });

  it("arrives rather than animating there", () => {
    // Smooth is for a movement the reader asked for and can watch. On
    // arrival it is an animation from a place they were never in — and it
    // would race the scroll restoration a reload performs.
    addSection("skills");
    openWith("#skills");

    renderHook(() => useHashTarget());

    expect(scrollIntoView).toHaveBeenCalledWith();
  });

  it("decodes an escaped hash", () => {
    addSection("brand presence");
    openWith("#brand%20presence");

    renderHook(() => useHashTarget());

    expect(scrollIntoView).toHaveBeenCalled();
  });
});

describe("addresses that name nothing", () => {
  it("stays put when the page was opened without a hash", () => {
    addSection("experience");

    renderHook(() => useHashTarget());

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("stays put when the hash names a section this page does not have", () => {
    // Staying at the top is the honest answer to an address that means
    // nothing here; guessing at the nearest match would be worse.
    addSection("experience");
    openWith("#pricing");

    expect(() => renderHook(() => useHashTarget())).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("survives a hash that is only the marker", () => {
    addSection("experience");
    openWith("#");

    expect(() => renderHook(() => useHashTarget())).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("survives a hash that will not decode, rather than crashing the page", () => {
    // A stray `%` — `#%`, `#100%`, a half-written escape — makes
    // decodeURIComponent throw. This runs in the page's mount effect, so an
    // unguarded throw reaches the boundary around the whole app and the
    // fallback reloads the same bad address forever. A hash that will not
    // decode names nothing here, so it stays put like any other.
    addSection("experience");
    for (const bad of ["#%", "#100%", "#%E0%A4%A", "#c++%"]) {
      openWith(bad);
      expect(() => renderHook(() => useHashTarget()), `hash ${bad}`).not.toThrow();
    }
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
