import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MotionProvider } from "../components/MotionProvider";
import { PreviewApp } from "./PreviewApp";
import { cardFor, EDIT_ATTRIBUTE, editValue, entryEdit } from "./edit";
import { type RawContent, STATIC_RAW } from "../data/content";
import { heroData } from "../data/portfolioFacts";

// The canvas background needs APIs jsdom does not provide and renders nothing
// worth asserting on — mocked exactly as App.test.tsx does.
vi.mock("../components/ParticleBackground", () => ({
  ParticleBackground: () => null,
}));

const renderPreview = () => render(<MotionProvider><PreviewApp /></MotionProvider>);

function sendContent(
  name: string,
  options: { origin?: string; source?: Window; raw?: Partial<RawContent> } = {},
): void {
  const { origin = "http://localhost:3001", source, raw = {} } = options;
  const content = { ...STATIC_RAW, ...raw, hero: { ...STATIC_RAW.hero, ...raw.hero, name } };

  const init: MessageEventInit = { data: { type: "preview:content", content }, origin };
  if (source !== undefined) init.source = source;

  act(() => {
    window.dispatchEvent(new MessageEvent("message", init));
  });
}

function sendScroll(id: string, origin = "http://localhost:3001"): void {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { type: "preview:scrollTo", id }, origin }));
  });
}

function sendHighlight(
  file: string | null,
  where: string | null,
  origin = "http://localhost:3001",
): void {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", { data: { type: "preview:highlight", file, where }, origin }),
    );
  });
}

/** An editor at the other end of the window, whose postMessage can be read. */
function connectEditor(): ReturnType<typeof vi.fn> {
  const postMessage = vi.fn();
  sendContent(heroData.name, { source: { postMessage } as unknown as Window });
  return postMessage;
}

/** The picks the editor was sent, and nothing else it was sent. */
function picks(postMessage: ReturnType<typeof vi.fn>): unknown[] {
  return postMessage.mock.calls
    .map((call) => call[0] as { type?: string })
    .filter((message) => message.type === "preview:pick");
}

/** The lists the page maps to cards, with the file and key each is read from. */
const MAPPED: [keyof RawContent, string][] = [
  ["keyProjects", "projects"],
  ["experience", "jobs"],
  ["skills", "categories"],
  ["certificationsSummary", "groups"],
  ["recognition", "awards"],
  ["achievements", "items"],
  ["community", "items"],
  ["brandPresence", "items"],
  ["expertise", "areas"],
];

describe("the preview harness", () => {
  it("opens on the build's own content, before any editor speaks", () => {
    renderPreview();
    // The real name, so an unattached preview shows the real page.
    expect(screen.getAllByText(heroData.name).length).toBeGreaterThan(0);
  });

  it("redraws the page from content an allowed origin posts", () => {
    renderPreview();

    sendContent("Live Edited Hero");

    expect(screen.getByText("Live Edited Hero")).toBeInTheDocument();
  });

  it("ignores a message from any other origin", () => {
    renderPreview();

    sendContent("Should Not Appear", { origin: "https://evil.example" });

    expect(screen.queryByText("Should Not Appear")).not.toBeInTheDocument();
    expect(screen.getAllByText(heroData.name).length).toBeGreaterThan(0);
  });

  it("warns, but does not render, on content from an origin it does not trust", () => {
    // The dropped-in-silence failure made visible: an editor whose origin was
    // never configured posts content and the page never moves. It is still
    // dropped — the check is the boundary — but it says why now, naming the
    // origin so an owner can set VITE_PREVIEW_EDITOR_ORIGIN to it.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderPreview();

    sendContent("Should Not Appear", { origin: "https://editor.onrender.test" });

    expect(screen.queryByText("Should Not Appear")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("https://editor.onrender.test"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("VITE_PREVIEW_EDITOR_ORIGIN"));

    warn.mockRestore();
  });

  it("does not warn when an allowed origin posts content", () => {
    // The warning is for a real misconfiguration, not for every message; a
    // trusted origin renders and says nothing.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderPreview();

    sendContent("Shown", { origin: "http://localhost:3001" });

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("answers the editor with the page's section geometry", () => {
    const postMessage = vi.fn();
    const source = { postMessage } as unknown as Window;

    renderPreview();
    sendContent("Geo", { source });

    const geometry = postMessage.mock.calls.find(
      (call) => (call[0] as { type?: string }).type === "preview:geometry",
    );

    expect(geometry).toBeDefined();
    expect(Object.keys((geometry?.[0] as { boxes: object }).boxes).length).toBeGreaterThan(0);
  });

  it("scrolls the page to a section an allowed origin asks for", () => {
    renderPreview();

    // A section the real page renders with this id, the same anchor the site's
    // navigation scrolls to. jsdom does not implement scrollIntoView, so a
    // stand-in on the element is what proves the call was made.
    const skills = document.getElementById("skills");
    expect(skills).not.toBeNull();
    const scrollIntoView = vi.fn();
    if (skills !== null) skills.scrollIntoView = scrollIntoView;

    sendScroll("skills");

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("does not scroll for a section an untrusted origin asks for", () => {
    // The origin check is the same boundary content passes: a page the owner
    // did not open cannot move this one either.
    renderPreview();

    const skills = document.getElementById("skills");
    const scrollIntoView = vi.fn();
    if (skills !== null) skills.scrollIntoView = scrollIntoView;

    sendScroll("skills", "https://evil.example");

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("a click in the preview", () => {
  it.each(MAPPED)("every card drawn from %s.%s says which entry it is", (file, key) => {
    renderPreview();

    const entries = (STATIC_RAW[file] as Record<string, unknown[]>)[key] ?? [];
    expect(entries.length).toBeGreaterThan(0);

    for (let index = 0; index < entries.length; index += 1) {
      expect(cardFor(document, entryEdit(file, key, index))).not.toBeNull();
    }
    // And no card claims an entry the file does not have.
    expect(cardFor(document, entryEdit(file, key, entries.length))).toBeNull();
  });

  it("marks the bands drawn from a whole file with the file", () => {
    renderPreview();

    expect(cardFor(document, editValue("hero"))).not.toBeNull();
    expect(cardFor(document, editValue("thinking"))).not.toBeNull();
    expect(cardFor(document, editValue("about"))).not.toBeNull();
  });

  it("names the certification cards by the file the page draws, not the print record", () => {
    // certifications.json and certificationsSummary.json both hold three
    // groups today, so a count alone cannot tell them apart — the bughunt
    // found the cards naming the print file behind exactly that coincidence.
    // Shortening the summary to one group is what makes the count honest.
    renderPreview();
    const [only] = STATIC_RAW.certificationsSummary.groups;
    if (only === undefined) throw new Error("the summary has no groups to draw");
    sendContent(heroData.name, {
      raw: { certificationsSummary: { ...STATIC_RAW.certificationsSummary, groups: [only] } },
    });

    const cards = [...document.querySelectorAll(`#certifications [${EDIT_ATTRIBUTE}]`)];
    expect(cards.map((card) => card.getAttribute(EDIT_ATTRIBUTE))).toEqual([
      entryEdit("certificationsSummary", "groups", 0),
    ]);
    expect(STATIC_RAW.certifications.groups.length).toBeGreaterThan(1);
  });

  it("names the featured project by its place in the file, not on the page", () => {
    // The band leads with the featured project wherever it is written. The
    // editor opens entries by their place in the file, so the card that
    // leads must say the third project when it is the third project.
    renderPreview();
    const projects = STATIC_RAW.keyProjects.projects.map((project, index) => ({
      ...project,
      featured: index === 2,
    })) as unknown as RawContent["keyProjects"]["projects"];
    sendContent(heroData.name, { raw: { keyProjects: { projects } } });

    const cards = [...document.querySelectorAll(`#projects [${EDIT_ATTRIBUTE}]`)];
    expect(cards[0]?.getAttribute(EDIT_ATTRIBUTE)).toBe(entryEdit("keyProjects", "projects", 2));
    expect(cards.map((card) => card.getAttribute(EDIT_ATTRIBUTE))).toHaveLength(projects.length);
  });

  it("tells the editor which entry a card click is", () => {
    renderPreview();
    const postMessage = connectEditor();

    const card = cardFor(document, entryEdit("experience", "jobs", 2));
    const heading = card?.querySelector("h3");
    expect(heading).not.toBeNull();
    if (heading != null) fireEvent.click(heading);

    expect(picks(postMessage)).toEqual([
      { type: "preview:pick", file: "experience.json", where: "jobs[2]" },
    ]);
    // Only ever to the editor's own origin.
    expect(postMessage).toHaveBeenLastCalledWith(expect.anything(), "http://localhost:3001");
  });

  it("names the band for a click beside its cards", () => {
    renderPreview();
    const postMessage = connectEditor();

    const heading = document.querySelector("#skills h2");
    expect(heading).not.toBeNull();
    if (heading !== null) fireEvent.click(heading);

    expect(picks(postMessage)).toEqual([{ type: "preview:pick", id: "skills" }]);
  });

  it("keeps a link inside a card from walking the mirror away", () => {
    renderPreview();
    connectEditor();

    const link = cardFor(document, entryEdit("keyProjects", "projects", 0))?.querySelector("a[href]");
    expect(link).not.toBeNull();
    const followed = link != null && fireEvent.click(link);

    // fireEvent.click returns false when the default was prevented.
    expect(followed).toBe(false);
  });

  it("does nothing, links included, until an editor has spoken", () => {
    // Opened in its own tab the preview is the page: its links are links.
    renderPreview();

    const link = cardFor(document, entryEdit("keyProjects", "projects", 0))?.querySelector("a[href]");
    const followed = link != null && fireEvent.click(link);

    expect(followed).toBe(true);
  });

  it("lights the entry the editor says it is on, and clears it", () => {
    renderPreview();

    sendHighlight("recognition.json", "awards[1]");
    const lit = document.querySelectorAll("[data-editing]");
    expect(lit).toHaveLength(1);
    expect(lit[0]?.getAttribute(EDIT_ATTRIBUTE)).toBe(entryEdit("recognition", "awards", 1));

    sendHighlight("hero.json", null);
    expect(document.querySelector("[data-editing]")?.getAttribute(EDIT_ATTRIBUTE)).toBe("hero.json");

    sendHighlight(null, null);
    expect(document.querySelector("[data-editing]")).toBeNull();
  });

  it("keeps the light on the entry through a redraw", () => {
    // The page is redrawn on every keystroke; the outline is on the card,
    // and the card is new each time.
    renderPreview();

    sendHighlight("skills.json", "categories[0]");
    sendContent("Redrawn");

    expect(document.querySelector("[data-editing]")?.getAttribute(EDIT_ATTRIBUTE)).toBe(
      entryEdit("skills", "categories", 0),
    );
  });

  it("lights nothing for an untrusted origin", () => {
    renderPreview();

    sendHighlight("recognition.json", "awards[1]", "https://evil.example");

    expect(document.querySelector("[data-editing]")).toBeNull();
  });
});

/** What the editor was told went wrong, in order. */
function errors(postMessage: ReturnType<typeof vi.fn>): string[] {
  return postMessage.mock.calls
    .map((call) => call[0] as { type?: string; message?: string })
    .filter((message) => message.type === "preview:error")
    .map((message) => message.message ?? "");
}

describe("an edit the page cannot draw", () => {
  it("is refused with the band named, and the page stays as it was", () => {
    // The layout used to pass through untouched, so a band name the page has
    // no shape for threw from the render, past the catch, into the root
    // boundary — which unmounted the preview and its listener. Proven in the
    // bughunt with this exact typo.
    renderPreview();
    const postMessage = connectEditor();
    sendContent("Kept");

    sendContent("Typo", { raw: { pageLayout: { sections: [{ body: "heroo" }] } } as Partial<RawContent> });

    expect(errors(postMessage)).toEqual([expect.stringContaining("heroo")]);
    expect(screen.getAllByText("Kept").length).toBeGreaterThan(0);
    expect(screen.queryByText("Typo")).not.toBeInTheDocument();
  });

  it("refuses a band named twice, and a heading with no anchor", () => {
    renderPreview();
    const postMessage = connectEditor();
    const [hero, ...rest] = STATIC_RAW.pageLayout.sections;

    sendContent("Twice", {
      raw: { pageLayout: { sections: [hero, hero, ...rest] } } as Partial<RawContent>,
    });
    sendContent("Unreachable", {
      raw: { pageLayout: { sections: [{ body: "about", title: "About" }] } } as Partial<RawContent>,
    });

    expect(errors(postMessage)).toEqual([
      expect.stringContaining("twice"),
      expect.stringContaining("no id"),
    ]);
  });

  it("reports a value the page trips over while drawing, keeps the last page, and draws the next", () => {
    // Not every bad value is a name buildContent can check: a null where a
    // list should be passes the transform and throws in a component. The
    // boundary inside the preview catches it, says so, and goes back.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      renderPreview();
      const postMessage = connectEditor();
      sendContent("Kept");

      sendContent("Broken", { raw: { hero: { metrics: null } } as unknown as Partial<RawContent> });

      expect(errors(postMessage)).toHaveLength(1);
      expect(screen.getAllByText("Kept").length).toBeGreaterThan(0);

      expect(screen.queryByText("Broken")).not.toBeInTheDocument();

      sendContent("After");
      expect(screen.getAllByText("After").length).toBeGreaterThan(0);
      expect(screen.queryByText("Kept")).not.toBeInTheDocument();
    } finally {
      quiet.mockRestore();
    }
  });
});

describe("the preview as a visit", () => {
  it("asks for no consent and loads no tag, even for an owner who accepted on the site", () => {
    // The preview is the site at its own origin, so the owner's stored yes
    // applied to it: the bughunt measured the tag loading and a page view
    // for /preview on every editing session.
    window.history.pushState({}, "", "/preview");
    localStorage.setItem("cookie-consent", "granted");
    try {
      renderPreview();

      expect(document.getElementById("ga-tag")).toBeNull();
      expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
    } finally {
      localStorage.removeItem("cookie-consent");
      window.history.pushState({}, "", "/");
    }
  });
});
