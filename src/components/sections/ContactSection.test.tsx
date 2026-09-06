import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * The contact band is not one of the numbered run, but its teaser wears the
 * number after it — the informal next step past the numbered bands. That
 * number was typed by hand (`11.`), the one section number the rest of the
 * page had been freed of, and it would drift the moment a titled band was
 * added or removed.
 *
 * Today the layout's numbered run happens to reach ten, so a hand-typed
 * `11.` and a derived one read the same — which is exactly why this test
 * gives the component a layout of a *different* length: only a number read
 * off the layout follows it, and a literal is caught.
 */

vi.mock("../../content/pageLayout.json", () => ({
  default: {
    sections: [
      { body: "hero" },
      { body: "a", id: "a", title: "A" },
      { body: "b", id: "b", title: "B" },
      { body: "c", id: "c", title: "C" },
      { body: "contact" },
    ],
  },
}));

const { ContactSection } = await import("./ContactSection");

describe("the contact teaser's number", () => {
  it("is one past the numbered run of the layout it is given, not a fixed literal", () => {
    // Three titled bands here, so the teaser is the fourth step — 04, not
    // the 11 the real layout would show. A hand-typed number cannot do this.
    render(<ContactSection />);

    expect(screen.getByText(/^04\. What/)).toBeInTheDocument();
    expect(screen.queryByText(/^11\./)).not.toBeInTheDocument();
  });
});
