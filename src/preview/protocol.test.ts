import { describe, expect, it } from "vitest";
import {
  editorOrigins,
  isContentMessage,
  isHighlightMessage,
  isScrollMessage,
  looksLikeContent,
  normalizeOrigins,
  originAllowed,
} from "./protocol";
import { STATIC_RAW } from "../data/content";

/**
 * The two decisions the wire makes, tested without a DOM: whose messages are
 * heard, and what counts as content. Both are the preview's security — it
 * renders unsaved content and answers with the page's shape, so a message
 * from a page the owner did not open must be dropped, and a malformed one
 * must not be mistaken for content.
 */

describe("editorOrigins", () => {
  it("is the configured list alone in a production build", () => {
    // The hole the security sweep found: localhost in every build, so any
    // page a developer's machine served on those ports could post content
    // into the live preview.
    expect(editorOrigins("https://editor.example", false)).toEqual(["https://editor.example"]);
    expect(editorOrigins(undefined, false)).toEqual([]);
  });

  it("adds the local origins in a development build, after the configured ones", () => {
    expect(editorOrigins("https://editor.example", true)).toEqual([
      "https://editor.example",
      "http://localhost:3001",
      "http://localhost:5173",
    ]);
  });
});

describe("originAllowed", () => {
  it("allows the editor's dev origin, this being a development build", () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(originAllowed("http://localhost:3001")).toBe(true);
  });

  it("refuses anywhere else", () => {
    expect(originAllowed("https://evil.example")).toBe(false);
    expect(originAllowed("null")).toBe(false);
    expect(originAllowed("")).toBe(false);
  });
});

describe("normalizeOrigins", () => {
  it("reduces each entry to a bare origin, so a trailing slash still matches", () => {
    // The mistake that dropped every edit in silence: the editor's URL pasted
    // with the slash a browser shows. event.origin never has one, so the two
    // never matched. Normalising both sides removes the trap.
    expect(normalizeOrigins("https://x.onrender.com/")).toEqual(["https://x.onrender.com"]);
    expect(normalizeOrigins("https://x.onrender.com/preview")).toEqual(["https://x.onrender.com"]);
  });

  it("splits a comma-separated list and drops the blanks", () => {
    expect(normalizeOrigins("https://a.test, https://b.test ,")).toEqual([
      "https://a.test",
      "https://b.test",
    ]);
  });

  it("drops an unparseable value rather than crashing the wire", () => {
    // This runs for every preview message; a bad env value must not throw.
    expect(normalizeOrigins("not a url")).toEqual([]);
    expect(normalizeOrigins(undefined)).toEqual([]);
  });

  it("drops a value with no scheme, which would otherwise allow the origin null", () => {
    // `new URL("localhost:3001").origin` is the string "null" — the origin a
    // sandboxed frame, a file:// page and a data: page all report. Measured
    // in the bughunt: a pasted host without https:// let all of those in.
    expect(normalizeOrigins("localhost:3001")).toEqual([]);
    expect(normalizeOrigins("editor.onrender.com:443")).toEqual([]);
    expect(normalizeOrigins("https://editor.onrender.com")).toEqual(["https://editor.onrender.com"]);
  });
});

describe("looksLikeContent", () => {
  it("is true for the content envelope, whatever else it holds", () => {
    expect(looksLikeContent({ type: "preview:content" })).toBe(true);
    expect(looksLikeContent({ type: "preview:content", content: {} })).toBe(true);
  });

  it("is false for anything else, so it warns only on a real attempt", () => {
    expect(looksLikeContent({ type: "preview:ready" })).toBe(false);
    expect(looksLikeContent("preview:content")).toBe(false);
    expect(looksLikeContent(null)).toBe(false);
    expect(looksLikeContent(undefined)).toBe(false);
  });
});

describe("isContentMessage", () => {
  it("accepts a well-formed content message", () => {
    expect(isContentMessage({ type: "preview:content", content: STATIC_RAW })).toBe(true);
  });

  it("refuses the wrong envelope", () => {
    expect(isContentMessage({ type: "preview:geometry", content: STATIC_RAW })).toBe(false);
    expect(isContentMessage("preview:content")).toBe(false);
    expect(isContentMessage(null)).toBe(false);
  });

  it("refuses content missing a document the page needs", () => {
    // A page cannot be built from fifteen-minus-one, and half-content that
    // slipped through would throw deep in a section instead of here.
    const missingHero: Record<string, unknown> = { ...STATIC_RAW };
    delete missingHero["hero"];
    expect(isContentMessage({ type: "preview:content", content: missingHero })).toBe(false);
  });
});

describe("isScrollMessage", () => {
  it("accepts a scroll request carrying a section id", () => {
    expect(isScrollMessage({ type: "preview:scrollTo", id: "projects" })).toBe(true);
  });

  it("refuses the wrong envelope or a missing id", () => {
    // A content message is not a scroll, and a scroll with no id names no
    // element — both would otherwise scroll the page nowhere in particular.
    expect(isScrollMessage({ type: "preview:content", id: "projects" })).toBe(false);
    expect(isScrollMessage({ type: "preview:scrollTo" })).toBe(false);
    expect(isScrollMessage({ type: "preview:scrollTo", id: "" })).toBe(false);
    expect(isScrollMessage({ type: "preview:scrollTo", id: 7 })).toBe(false);
    expect(isScrollMessage("preview:scrollTo")).toBe(false);
    expect(isScrollMessage(null)).toBe(false);
  });
});

describe("isHighlightMessage", () => {
  it("accepts an entry, a whole file, and the request to clear", () => {
    expect(isHighlightMessage({ type: "preview:highlight", file: "experience.json", where: "jobs[2]" })).toBe(true);
    expect(isHighlightMessage({ type: "preview:highlight", file: "hero.json", where: null })).toBe(true);
    expect(isHighlightMessage({ type: "preview:highlight", file: null, where: null })).toBe(true);
  });

  it("refuses the wrong envelope or the wrong shape", () => {
    expect(isHighlightMessage({ type: "preview:pick", file: "hero.json", where: null })).toBe(false);
    expect(isHighlightMessage({ type: "preview:highlight" })).toBe(false);
    expect(isHighlightMessage({ type: "preview:highlight", file: 3, where: null })).toBe(false);
    expect(isHighlightMessage({ type: "preview:highlight", file: "hero.json", where: ["jobs"] })).toBe(false);
    expect(isHighlightMessage(null)).toBe(false);
  });
});
