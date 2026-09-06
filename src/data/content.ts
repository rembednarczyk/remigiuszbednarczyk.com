import { createContext, useContext } from "react";
import { PAGE_BODY_NAMES } from "./vocabulary";
import {
  achievementsData,
  aboutData,
  buildFacts,
  cvData,
  experienceData,
  fullCertificationsList,
  heroData,
  recognitionData,
  thinkingQuote,
  yearsOfExperience,
  type FactsRaw,
} from "./portfolioFacts";
import {
  brandPresenceData,
  buildPresentation,
  certificationsData,
  communityData,
  expertiseData,
  keyProjectsData,
  skillsData,
  type PresentationRaw,
} from "./portfolioData";
import aboutContent from "../content/about.json" with { type: "json" };
import achievementsContent from "../content/achievements.json" with { type: "json" };
import brandPresenceContent from "../content/brandPresence.json" with { type: "json" };
import certificationsContent from "../content/certifications.json" with { type: "json" };
import certificationsSummaryContent from "../content/certificationsSummary.json" with { type: "json" };
import communityContent from "../content/community.json" with { type: "json" };
import cvContent from "../content/cv.json" with { type: "json" };
import experienceContent from "../content/experience.json" with { type: "json" };
import expertiseContent from "../content/expertise.json" with { type: "json" };
import heroContent from "../content/hero.json" with { type: "json" };
import keyProjectsContent from "../content/keyProjects.json" with { type: "json" };
import pageLayoutContent from "../content/pageLayout.json" with { type: "json" };
import recognitionContent from "../content/recognition.json" with { type: "json" };
import skillsContent from "../content/skills.json" with { type: "json" };
import thinkingContent from "../content/thinking.json" with { type: "json" };

/**
 * The one place a component reaches for what the site says.
 *
 * Until now every section imported its own slice of the data layer directly,
 * captured once when the module loaded. That is exactly right for the site
 * as it ships — the content is baked into the build — and exactly wrong for a
 * live preview, where the words have to be able to change under a page that
 * is already on screen. A component cannot re-import a static binding; it can
 * read a context.
 *
 * So the sections read here instead, and the default value is the very same
 * static content they used to import. Rendered normally, with no provider
 * above them, nothing changes — the default is the build, proven equal to
 * the old exports in `content.test.ts`. The seam this opens is one override:
 * the preview mounts a provider whose value was built from edited content
 * rather than the baked-in files, and the same components draw it. (Slice 06
 * of the editor's preview plan.)
 *
 * The presentation slices carry JSX (an icon is a component), so this module
 * is not loadable from a Vite config; the build's JSON-LD reads
 * `portfolioFacts` directly, which stays free of JSX for that reason.
 */
export const STATIC_CONTENT = {
  heroData,
  aboutData,
  thinkingQuote,
  achievementsData,
  recognitionData,
  experienceData,
  cvData,
  fullCertificationsList,
  yearsOfExperience,
  expertiseData,
  skillsData,
  communityData,
  keyProjectsData,
  brandPresenceData,
  certificationsData,
  pageLayout: pageLayoutContent,
};

/** Everything a page needs to draw itself, from one value. */
export type SiteContent = typeof STATIC_CONTENT;

/** The raw content a whole page is built from — the sixteen JSON documents. */
export type RawContent = FactsRaw & PresentationRaw & { pageLayout: typeof pageLayoutContent };

/**
 * The build's own raw content — the sixteen JSON documents, assembled here
 * rather than exported from the assembly modules, which are held to inventing
 * no word an editor cannot reach (`tests/contentBoundary.test.ts`) and so may
 * not hand out raw content with its placeholders still in it.
 */
export const STATIC_RAW: RawContent = {
  hero: heroContent,
  about: aboutContent,
  thinking: thinkingContent,
  achievements: achievementsContent,
  recognition: recognitionContent,
  experience: experienceContent,
  cv: cvContent,
  certifications: certificationsContent,
  expertise: expertiseContent,
  skills: skillsContent,
  community: communityContent,
  keyProjects: keyProjectsContent,
  brandPresence: brandPresenceContent,
  certificationsSummary: certificationsSummaryContent,
  pageLayout: pageLayoutContent,
};

/**
 * A whole page's content, built from raw. This is the seam: the site never
 * calls it (its `STATIC_CONTENT` above is the build's, assembled once), and
 * the preview calls it on every edit, running the site's own transforms —
 * `buildFacts`, `buildPresentation` — on what the owner is typing. Proven in
 * `content.test.tsx` to reproduce `STATIC_CONTENT` from `STATIC_RAW`, so the
 * preview and the deploy cannot disagree about how content becomes a page.
 */
export function buildContent(raw: RawContent): SiteContent {
  return {
    ...buildFacts(raw),
    ...buildPresentation(raw),
    yearsOfExperience,
    pageLayout: checkedLayout(raw.pageLayout),
  };
}

/**
 * The page layout, refused here rather than in the render.
 *
 * `buildFacts` and `buildPresentation` throw on a name the page cannot draw
 * — an icon, a tone — and the preview catches that throw and reports it to
 * the editor. The layout used to pass through untouched, so a band name the
 * page has no shape for threw from `pageBodyOf` in the render instead:
 * outside that catch, into the root error boundary, which unmounted the
 * preview and its listener, so the typo could not be corrected without a
 * reload. The bughunt proved it with `{ body: "heroo" }`. Now every band is
 * checked where the throw is caught, and the message says which.
 */
function checkedLayout(layout: RawContent["pageLayout"]): RawContent["pageLayout"] {
  const sections: unknown = (layout as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) throw new Error("the page layout has no list of sections");

  const seen = new Set<string>();
  sections.forEach((section: unknown, index) => {
    const body = (section as { body?: unknown } | null)?.body;
    if (typeof body !== "string" || !(PAGE_BODY_NAMES as readonly string[]).includes(body)) {
      throw new Error(
        `section ${String(index + 1)} of the page layout asks for a ${String(body)} band, ` +
          `and the ones that exist are ${PAGE_BODY_NAMES.join(", ")}`,
      );
    }
    if (seen.has(body)) throw new Error(`the page layout names the ${body} band twice`);
    seen.add(body);

    const titled = section as { title?: unknown; id?: unknown };
    if ("title" in titled && typeof titled.id !== "string") {
      throw new Error(`the ${body} band has a heading but no id for the navigation to reach`);
    }
  });

  return layout;
}

// The default is the build's own content, so a section rendered with no
// provider — every current test and story — draws exactly what it drew before.
const ContentContext = createContext<SiteContent>(STATIC_CONTENT);

export const ContentProvider = ContentContext.Provider;

export function useContent(): SiteContent {
  return useContext(ContentContext);
}
