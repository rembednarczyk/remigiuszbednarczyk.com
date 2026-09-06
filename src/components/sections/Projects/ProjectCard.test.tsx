import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectCard } from "./ProjectCard";
import { leadWithFeatured } from "./order";
import type { KeyProject, KeyProjectLink } from "../../../types";

/**
 * The two shapes the initiatives band did not have room for: a link that
 * says what it is, and a programme with outputs per edition. Both are
 * tested for what a reader (or a screen reader) can tell apart, since that
 * is what the old card lost — every icon on it announced the same name.
 */

const glyph = (text: string) => <span aria-hidden="true">{text}</span>;

const project = (over: Partial<KeyProject> = {}): KeyProject => ({
  title: "Sii TestingLab Jury",
  desc: "A recurring programme.",
  tags: ["Code Review"],
  mainIcon: glyph("i"),
  ...over,
});

const link = (label: string, group?: string): KeyProjectLink => ({
  url: `https://x.test/${label.toLowerCase().replace(/\s+/g, "-")}`,
  icon: glyph("·"),
  label,
  ...(group === undefined ? {} : { group }),
});

describe("a card's links", () => {
  it("renders a labelled link as an output that names itself", () => {
    render(<ProjectCard project={project({ links: [link("Report: AI Edition")] })} />);

    // The accessible name carries the output and the card, so two links on
    // one card are no longer announced identically.
    const output = screen.getByRole("link", { name: /Report: AI Edition — Sii TestingLab Jury/ });
    expect(output).toHaveAttribute("href", "https://x.test/report:-ai-edition");
    expect(output).toHaveTextContent("Report: AI Edition");
  });

  it("keeps the icon row for a link with no label", () => {
    // Older entries render exactly as before: a glyph named after the card.
    render(<ProjectCard project={project({ links: [{ url: "https://x.test", icon: glyph("g") }] })} />);

    expect(screen.getByRole("link", { name: "Link to Sii TestingLab Jury" })).toHaveTextContent("g");
  });

  it("keeps the labels when a card mixes a labelled link with a bare one", () => {
    // The decision used to be all-or-nothing: one unlabelled link sent every
    // link — the labelled ones too — to the icon row, and the labels it had
    // vanished. Each link is decided on its own now: the labelled one is an
    // output that names itself, the bare one stays a glyph.
    render(
      <ProjectCard
        project={project({
          links: [link("Report: AI Edition"), { url: "https://x.test/repo", icon: glyph("g") }],
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Report: AI Edition — Sii TestingLab Jury/ }),
    ).toHaveTextContent("Report: AI Edition");
    expect(screen.getByRole("link", { name: "Link to Sii TestingLab Jury" })).toHaveTextContent("g");
  });
});

describe("a featured programme", () => {
  const featured = project({
    featured: true,
    links: [
      link("Report", "AI Edition · 2024"),
      link("Study", "AI Edition · 2024"),
      link("Report II", "Edition 2 · 2025"),
    ],
  });

  it("lays its outputs out by edition, each edition once, in order", () => {
    render(<ProjectCard project={featured} />);

    const editions = screen.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent);
    expect(editions).toEqual(["AI Edition · 2024", "Edition 2 · 2025"]);
  });

  it("counts its editions from the groups rather than a typed number", () => {
    render(<ProjectCard project={featured} />);

    expect(screen.getByText(/recurring programme · 2 editions/i)).toBeInTheDocument();
  });

  it("says nothing about editions while there is only one", () => {
    const first = { ...featured, links: (featured.links ?? []).slice(0, 2) };
    render(<ProjectCard project={first} />);

    // The description may well say "recurring programme"; the line under
    // test is the counted one.
    expect(screen.queryByText(/recurring programme · \d+ editions/i)).not.toBeInTheDocument();
  });

  it("takes the whole row", () => {
    const { container } = render(<ProjectCard project={featured} />);

    expect(container.querySelector("article")?.className).toContain("md:col-span-2");
  });
});

describe("the band's order", () => {
  it("leads with the featured programme and keeps the rest as written", () => {
    const order = leadWithFeatured([
      { title: "a" },
      { title: "b", featured: true },
      { title: "c" },
    ]).map((entry) => entry.project.title);

    expect(order).toEqual(["b", "a", "c"]);
  });
});
