import { act, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { SourceGlitch } from "./SourceGlitch";

/**
 * The contract the effect rests on: the section renders normally, its source
 * stays out of the DOM until the trigger is used (so nothing faded sits in the
 * page for the accessibility scan), and activating the trigger overwrites the
 * section with highlighted source. The glitch itself is CSS, exercised in the
 * browser rather than here.
 */

function Harness() {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <SourceGlitch code={'<p className="x">{heroData.name}</p>'} triggerRef={ref}>
      <div>
        <button ref={ref} type="button">
          greeting
        </button>
        <p>rendered section</p>
      </div>
    </SourceGlitch>
  );
}

describe("SourceGlitch", () => {
  it("renders the wrapped section, with the source held out of the DOM at rest", () => {
    const { getByText, container } = render(<Harness />);

    expect(getByText("rendered section")).toBeTruthy();
    expect(container.querySelector(".source-peek__code")).toBeNull();
    expect(container.querySelector(".source-peek__panel")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("overwrites the section with highlighted source when the trigger is used", () => {
    const { getByText, container } = render(<Harness />);

    act(() => {
      // A keyboard/touch activation (click with detail 0) reveals it; focus
      // alone deliberately does not.
      fireEvent.click(getByText("greeting"));
    });

    const code = container.querySelector(".source-peek__code");
    expect(code).not.toBeNull();
    expect(code!.textContent).toContain("heroData.name");
    // The highlighter ran: at least one token carries a colour class.
    expect(code!.querySelector(".tk-tag, .tk-expr, .tk-str")).not.toBeNull();
    expect(container.querySelector(".source-peek__panel")?.getAttribute("aria-hidden")).toBe("false");
  });

  it("marks the trigger expanded while the source is showing", () => {
    const { getByText } = render(<Harness />);
    const trigger = getByText("greeting");

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    act(() => {
      fireEvent.click(trigger);
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });
});
