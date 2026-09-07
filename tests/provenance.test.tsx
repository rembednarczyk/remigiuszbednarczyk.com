import { render, renderHook } from "@testing-library/react";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { CVTemplate } from "../src/components/CVTemplate";
import { usePrintProvenanceTitle } from "../src/hooks/usePrintProvenanceTitle";
import {
  PROVENANCE_FOOTER,
  PROVENANCE_ORIGIN,
  PROVENANCE_TITLE,
} from "../src/lib/provenance";
import { cvData } from "../src/data/portfolioFacts";

/**
 * The printed CV names where it came from, on two ATS-safe channels and with
 * nothing hidden. The origin it guards was first carried as invisible white
 * text; that was pulled out because near-invisible body text is exactly what
 * an applicant tracking system flags as keyword stuffing, and a safeguard that
 * gets the CV auto-rejected is worse than none. So it rides a plain visible
 * footer and the PDF's Title metadata instead — held here, with the "nothing
 * hidden" property guarded directly so the white-text version cannot creep
 * back.
 */

describe("what the provenance strings assert", () => {
  it("are derived from the CV's own facts, so a rename cannot strand them", () => {
    expect(PROVENANCE_ORIGIN).toBe(cvData.header.website);
    expect(PROVENANCE_TITLE).toContain(cvData.header.website);
    expect(PROVENANCE_TITLE).toContain(cvData.header.name);
    expect(PROVENANCE_FOOTER).toContain(cvData.header.website);
  });
});

describe("the printed CV's visible footer", () => {
  const cv = () => render(<CVTemplate />);

  it("states the origin in plain view", () => {
    const footer = cv().container.querySelector<HTMLElement>("[data-provenance]");

    expect(footer).not.toBeNull();
    expect(footer!.textContent).toBe(PROVENANCE_FOOTER);
  });

  it("hides no text the way an ATS reads as fraud", () => {
    // The regression guard, stated as the property that got the white-text
    // version pulled: nothing in the printed CV is white, sub-visible in size,
    // or clipped to nothing. A mutation reintroducing a hidden mark turns this
    // red. jsdom computes no layout, so this reads the inline styles the
    // template sets rather than a rendered box — which is where the fraud
    // signatures would be written.
    const { container } = cv();
    const offenders = [...container.querySelectorAll<HTMLElement>("*")].filter((el) => {
      const s = el.style;
      const white = ["rgb(255, 255, 255)", "#fff", "#ffffff", "white"].includes(
        s.color.toLowerCase(),
      );
      const tiny = /^(0|0\.\d+|1)px$/.test(s.fontSize);
      const clipped = s.overflow === "hidden" && /^(0|1)px$/.test(s.height);
      return white || tiny || clipped;
    });

    expect(
      offenders.map((el) => el.outerHTML.slice(0, 80)),
      "these carry a signature an ATS flags as hidden text",
    ).toEqual([]);
  });
});

describe("the print-time PDF title", () => {
  it("tags the document only while printing, and restores it after", () => {
    document.title = "Live Page Title";
    renderHook(() => usePrintProvenanceTitle());

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    // What the exported PDF's Title metadata is copied from.
    expect(document.title).toBe(PROVENANCE_TITLE);

    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    // The live page keeps the title search engines index.
    expect(document.title).toBe("Live Page Title");
  });

  it("restores the live title when it unmounts mid-print", () => {
    // A print dialog left open when the component unmounts must not strand the
    // tagged title on the live document.
    document.title = "Live Page Title";
    const { unmount } = renderHook(() => usePrintProvenanceTitle());

    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(document.title).toBe(PROVENANCE_TITLE);

    act(() => {
      unmount();
    });
    expect(document.title).toBe("Live Page Title");
  });
});
