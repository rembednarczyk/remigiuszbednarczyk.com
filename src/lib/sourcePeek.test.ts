import { describe, expect, it } from "vitest";
import { heroPeek } from "./sourcePeek";

/**
 * The panel behind the view-source glitch must show the component's real,
 * current source — the whole reason it is sliced from a `?raw` import rather
 * than hand-copied. These assert the extraction on the real HeroSection file,
 * so a change that moved or dropped the marked region, or left the markers
 * showing, fails here.
 */

describe("the Hero source peek", () => {
  it("names the file it came from", () => {
    expect(heroPeek.file).toBe("HeroSection.tsx");
  });

  it("carries the real greeting and the name binding, straight from the source", () => {
    expect(heroPeek.code).toContain("Hello World, my name is");
    expect(heroPeek.code).toContain("{heroData.name}");
  });

  it("strips the region markers, so the panel shows code and not scaffolding", () => {
    expect(heroPeek.code).not.toContain("peek:start");
    expect(heroPeek.code).not.toContain("peek:end");
  });

  it("is dedented to its own left margin, not the file's indentation", () => {
    // The fragment lives several levels deep in the component; shown as-is it
    // would open with a wall of leading spaces. The first line starts flush.
    expect(heroPeek.code.startsWith(" ")).toBe(false);
    expect(heroPeek.code.length).toBeGreaterThan(40);
  });
});
