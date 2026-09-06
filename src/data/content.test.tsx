import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildContent,
  ContentProvider,
  STATIC_CONTENT,
  STATIC_RAW,
  useContent,
  type RawContent,
  type SiteContent,
} from "./content";
import { heroData } from "./portfolioFacts";

/**
 * The seam that makes a live preview possible, tested at both of its ends.
 *
 * A section now reads its content from a context instead of importing it. The
 * two things that has to be true: with no provider — every page, story and
 * test that exists today — the context hands back the build's own content, so
 * nothing rendered changes; and a provider can hand back something else, which
 * is the one override the preview relies on. Break either and this goes red.
 */

function Probe() {
  const { heroData: hero } = useContent();
  return <span>{hero.name}</span>;
}

describe("the content seam", () => {
  it("defaults to the build's own content, so a page with no provider is unchanged", () => {
    // The default context value is the very object the sections used to
    // import — same identity, not merely an equal copy.
    expect(STATIC_CONTENT.heroData).toBe(heroData);

    render(<Probe />);

    expect(screen.getByText(heroData.name)).toBeInTheDocument();
  });

  it("lets a provider override what a component reads — the whole point", () => {
    const doctored: SiteContent = {
      ...STATIC_CONTENT,
      heroData: { ...heroData, name: "Someone Else Entirely" },
    };

    render(
      <ContentProvider value={doctored}>
        <Probe />
      </ContentProvider>,
    );

    expect(screen.getByText("Someone Else Entirely")).toBeInTheDocument();
    expect(screen.queryByText(heroData.name)).not.toBeInTheDocument();
  });
});

describe("buildContent, the transform the preview runs", () => {
  it("reproduces the build's own content from the build's own raw", () => {
    // The proof that the preview and the deploy cannot disagree: the same
    // function, fed the JSON the build baked in, returns what the site ships.
    // Break a transform and this parts from STATIC_CONTENT.
    expect(buildContent(STATIC_RAW)).toEqual(STATIC_CONTENT);
  });

  it("runs the transform on what it is given, not the baked-in copy", () => {
    const built = buildContent({
      ...STATIC_RAW,
      hero: { ...STATIC_RAW.hero, name: "Edited Live" },
    });

    expect(built.heroData.name).toBe("Edited Live");
    // Untouched documents still come through as they were.
    expect(built.thinkingQuote).toBe(STATIC_CONTENT.thinkingQuote);
  });

  it("refuses a page layout the page cannot draw, where the preview catches it", () => {
    // A band with no shape used to throw from the render, past the preview's
    // catch, into the root boundary — the bughunt proved it unmounted the
    // preview. So the layout is checked here, with the transforms.
    const layout = (sections: unknown) =>
      buildContent({ ...STATIC_RAW, pageLayout: { sections } as RawContent["pageLayout"] });

    expect(() => layout([{ body: "heroo" }])).toThrow(/heroo band/);
    expect(() => layout([{ body: "hero" }, { body: "hero" }])).toThrow(/hero band twice/);
    expect(() => layout([{ body: "about", title: "About" }])).toThrow(/no id/);
    expect(() => layout("not a list")).toThrow(/no list of sections/);
    expect(() => layout(STATIC_RAW.pageLayout.sections)).not.toThrow();
  });
});
