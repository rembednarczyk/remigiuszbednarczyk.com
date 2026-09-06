import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "./SectionHeading";

/**
 * The numbered heading that opens each band.
 *
 * Its accessible name is the number and the title; the rule beside it is
 * decoration. That rule was a div inside the h2 — flow content inside a
 * heading, which is invalid nesting the browser silently reflows — so it is
 * a span hidden from the name now, and this holds both: the name is right,
 * and the heading carries no element that does not belong in one.
 */

describe("the section heading", () => {
  it("names itself by its number and title, the rule hidden", () => {
    render(<SectionHeading number="03" title="Experience" />);

    expect(screen.getByRole("heading", { level: 2, name: "03. Experience" })).toBeInTheDocument();
  });

  it("puts no flow element inside the heading", () => {
    const { container } = render(<SectionHeading number="03" title="Experience" />);
    const heading = container.querySelector("h2");

    expect(heading).not.toBeNull();
    // An h2's content model is phrasing; a div is flow content and does not
    // belong in it. The decorative rule is a span.
    expect(heading?.querySelector("div")).toBeNull();
  });
});
