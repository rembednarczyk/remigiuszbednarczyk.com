import { describe, expect, it } from "vitest";
import { heroPeek } from "./sourcePeek";
import heroJson from "../content/hero.json?raw";

/**
 * The panel behind the view-source glitch must show the hero's real, current
 * source — the reason it is the content file read through a `?raw` import
 * rather than hand-copied. These assert against the real hero.json, so a
 * change that stopped showing the live data, or let the markup's noise back
 * in, fails here.
 */

describe("the Hero source peek", () => {
  it("names the content file it came from", () => {
    expect(heroPeek.file).toBe("hero.json");
  });

  it("is the content file verbatim — the values the hero renders", () => {
    expect(heroPeek.code).toContain("Remigiusz Bednarczyk");
    // The placeholder is shown unfilled, as the file stores it: the panel is
    // the source, not the rendered page.
    expect(heroPeek.code).toContain("{{yearsOfExperience}}");
    expect(heroPeek.code).toContain(heroJson.trim());
  });

  it("carries the planted greeting for whoever opens it", () => {
    expect(heroPeek.code).toContain("Reading the source?");
    expect(heroPeek.code).toContain("Have a look at the rest of my portfolio.");
  });

  it("shows only the words, none of the markup's scaffolding", () => {
    // The whole point of showing the data file and not the JSX: no Tailwind
    // classes, no print flags, nothing a reader has to look past.
    expect(heroPeek.code).not.toContain("className");
    expect(heroPeek.code).not.toContain("print:hidden");
  });
});
