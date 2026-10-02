import { describe, expect, it } from "vitest";
import { highlightTsx, type Token } from "./highlightTsx";

/**
 * Display-only highlighting, so the assertions are about which pieces get a
 * colour, not a full grammar. The shapes are the ones the hero fragment
 * actually contains: a tag, an attribute, a string, a comment, and an
 * identifier inside an expression.
 */

const classOf = (tokens: Token[], text: string): string | undefined =>
  tokens.find((t) => t.text === text)?.cls;

describe("highlightTsx", () => {
  it("re-joins to exactly the input, losing nothing", () => {
    const code = `<p className="x">{heroData.name}</p>`;
    expect(highlightTsx(code).map((t) => t.text).join("")).toBe(code);
  });

  it("colours a tag name, an attribute, and a string value", () => {
    const tokens = highlightTsx(`<p className="text-cyan-400">hi</p>`);
    expect(classOf(tokens, "p")).toBe("tk-tag");
    expect(classOf(tokens, "className")).toBe("tk-attr");
    expect(classOf(tokens, '"text-cyan-400"')).toBe("tk-str");
  });

  it("colours identifiers inside an expression but leaves JSX text plain", () => {
    const tokens = highlightTsx(`<h1>{heroData}</h1> Hello`);
    expect(classOf(tokens, "heroData")).toBe("tk-expr");
    // "Hello" is JSX text at brace depth 0 — no colour.
    expect(classOf(tokens, "Hello")).toBeUndefined();
  });

  it("treats a whole comment as one comment token", () => {
    const tokens = highlightTsx(`{/* peek */}\nconst a = 1;`);
    expect(tokens.some((t) => t.cls === "tk-cm" && t.text.includes("peek"))).toBe(true);
    expect(classOf(tokens, "const")).toBe("tk-kw");
  });
});

/**
 * The hero peek shows a JSON file, not JSX, so the highlighter has to read
 * those shapes too: a key is a field name, a `{{placeholder}}` is what the
 * page fills in, and the planted greeting is a comment that should stand out.
 */
describe("highlightTsx on the JSON the hero shows", () => {
  const json = `{\n  "value": "{{yearsOfExperience}}+",\n  "label": "Years Experience"\n}`;

  it("re-joins to exactly the input, losing nothing", () => {
    expect(highlightTsx(json).map((t) => t.text).join("")).toBe(json);
  });

  it("colours a key as a field, not a string value", () => {
    const tokens = highlightTsx(json);
    expect(classOf(tokens, '"value"')).toBe("tk-tag");
    expect(classOf(tokens, '"label"')).toBe("tk-tag");
    expect(classOf(tokens, '"Years Experience"')).toBe("tk-str");
  });

  it("pulls a placeholder out of its string and colours it as an expression", () => {
    const tokens = highlightTsx(json);
    expect(classOf(tokens, "{{yearsOfExperience}}")).toBe("tk-expr");
  });

  it("gives the planted greeting its own colour, apart from ordinary comments", () => {
    const egg = highlightTsx("// Reading the source? good eye.");
    expect(egg[0].cls).toBe("tk-egg");
    const plain = highlightTsx("// just a note");
    expect(plain[0].cls).toBe("tk-cm");
  });
});
