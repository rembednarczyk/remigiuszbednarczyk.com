import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceGlitch } from "./SourceGlitch";

/**
 * What matters is the contract the effect rests on: the section still renders,
 * the reveal is driven by an explicit, named button rather than a bare hover
 * (so touch and keyboard reach it), and activating it exposes the code. The
 * glitch itself is CSS and is exercised in the browser, not here.
 */

const sample = (
  <SourceGlitch file="Example.tsx" code={'const answer = 42; // the real source'}>
    <p>rendered section</p>
  </SourceGlitch>
);

describe("SourceGlitch", () => {
  it("renders the section it wraps, with the code already in the DOM", () => {
    const { getByText, container } = render(sample);

    expect(getByText("rendered section")).toBeTruthy();
    expect(container.querySelector(".source-peek__code")?.textContent).toContain(
      "const answer = 42;",
    );
  });

  it("is opened by a labelled button, not a hover — so touch and keyboard reach it", () => {
    const { getByRole } = render(sample);
    const trigger = getByRole("button", { name: /view this section's source — Example\.tsx/i });

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    act(() => {
      fireEvent.click(trigger);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("marks the panel hidden from assistive tech until it is opened", () => {
    const { getByRole, container } = render(sample);
    const panel = container.querySelector(".source-peek__panel");

    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    act(() => {
      fireEvent.click(getByRole("button"));
    });
    expect(panel?.getAttribute("aria-hidden")).toBe("false");
  });
});
