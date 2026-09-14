import {
  SkillCategory,
  Certification,
  Expertise,
  CommunityItem,
  KeyProject,
  BrandItem,
} from "../types";
import { ACCENTS, ACCENT_HIGHLIGHTS, accentOf, accentHighlightOf, iconOf } from "./icons";
import brandPresenceContent from "../content/brandPresence.json" with { type: "json" };
import certificationsSummaryContent from "../content/certificationsSummary.json" with { type: "json" };
import communityContent from "../content/community.json" with { type: "json" };
import expertiseContent from "../content/expertise.json" with { type: "json" };
import keyProjectsContent from "../content/keyProjects.json" with { type: "json" };
import skillsContent from "../content/skills.json" with { type: "json" };

/**
 * The cards, and only how they look.
 *
 * What each card says is in src/content, next to everything else the site
 * says. What is here is the part that has to be JSX: the icon a card shows,
 * at the size that card draws it and in the accent its entry asked for.
 *
 * The split this module used to describe — facts in portfolioFacts.ts, "the
 * presentation that belongs to a single card" here — was drawn in the wrong
 * place for the wrong reason. It was drawn around what the *build* could
 * load, so 79 sentences stayed on this side of it purely because each was
 * written next to an `<Icon />`, and no editor outside this repository
 * could reach them. The line is drawn around what a person edits now: the
 * words are content, the icon is a name in that content, and the size and
 * the accent are decided here, once per card type, where a designer would
 * look for them.
 *
 * The comment this replaces claimed everything in portfolioFacts.ts was
 * re-exported here so a component could import the whole set from one
 * module. Nothing was: there is no re-export and there never was, and the
 * eight components that read facts all import them directly. A comment is
 * not held to the code by anything, which is why the guards in this
 * repository are checks and not prose.
 */

/** Every card type's own drawing, in one place rather than per entry. */
const SIZES = { expertise: 24, project: 32, projectLink: 20, brand: 32, certification: 24 };
const BRAND_ICON = "mb-4 group-hover:scale-110 transition-transform duration-300";

/** The raw content the cards are built from — one JSON document per key. */
export interface PresentationRaw {
  expertise: typeof expertiseContent;
  skills: typeof skillsContent;
  community: typeof communityContent;
  keyProjects: typeof keyProjectsContent;
  brandPresence: typeof brandPresenceContent;
  certificationsSummary: typeof certificationsSummaryContent;
}

/** The cards' presentation, in one shape. */
interface Presentation {
  expertiseData: Expertise[];
  skillsData: SkillCategory[];
  communityData: CommunityItem[];
  keyProjectsData: KeyProject[];
  brandPresenceData: BrandItem[];
  certificationsData: Certification[];
}

/**
 * The cards, built from raw content rather than straight from the imports,
 * for the same reason `buildFacts` is: the preview runs this exact transform
 * on edited content, so a chosen icon or accent is drawn the way it will
 * deploy. One implementation, two callers.
 */
export function buildPresentation(raw: PresentationRaw): Presentation {
  return {
    // The one card type whose accent does not vary. Measured: all six of
    // these icons are cyan, so it is a decision about the section rather than
    // data about an entry, and content does not carry a colour it never
    // chooses.
    expertiseData: raw.expertise.areas.map((area) => {
      const Icon = iconOf(area.icon);
      return {
        title: area.title,
        desc: area.desc,
        icon: <Icon size={SIZES.expertise} className={ACCENTS.cyan} />,
        // The accent does not vary here, so neither does the press highlight.
        highlight: ACCENT_HIGHLIGHTS.cyan,
      };
    }),

    skillsData: raw.skills.categories.map((category) => {
      const Icon = iconOf(category.icon);
      return {
        name: category.name,
        icon: <Icon className={accentOf(category.accent)} />,
        skills: category.skills,
        highlight: accentHighlightOf(category.accent),
      };
    }),

    communityData: raw.community.items.map((item) => ({
      text: item.text,
      icon: iconOf(item.icon),
    })),

    keyProjectsData: raw.keyProjects.projects.map((project) => {
      const Icon = iconOf(project.icon);
      return {
        title: project.title,
        desc: project.desc,
        tags: project.tags,
        mainIcon: <Icon size={SIZES.project} />,
        ...("featured" in project && project.featured ? { featured: true } : {}),
        ...("links" in project
          ? {
              links: project.links.map((link) => {
                const LinkIcon = iconOf(link.icon);
                return {
                  url: link.url,
                  icon: <LinkIcon size={SIZES.projectLink} />,
                  ...("label" in link ? { label: link.label } : {}),
                  ...("group" in link ? { group: link.group } : {}),
                };
              }),
            }
          : {}),
      };
    }),

    brandPresenceData: raw.brandPresence.items.map((item) => {
      const Icon = iconOf(item.icon);
      return {
        title: item.title,
        desc: item.desc,
        icon: <Icon size={SIZES.brand} className={`${accentOf(item.accent)} ${BRAND_ICON}`} />,
        highlight: accentHighlightOf(item.accent),
      };
    }),

    // The screen list and `fullCertificationsList` are deliberately not the
    // same, and should not be merged. The print CV carries the full official
    // certificate names and the complete training history; this is the
    // shorter summary the page shows. The two content files are named for the
    // difference — `certifications.json` is the print record,
    // `certificationsSummary.json` is what the page shows. An earlier review
    // read it as drift and proposed unifying them; it is a choice.
    certificationsData: raw.certificationsSummary.groups.map((group) => {
      const Icon = iconOf(group.icon);
      return {
        title: group.title,
        items: group.items,
        icon: <Icon size={SIZES.certification} className={accentOf(group.accent)} />,
        highlight: accentHighlightOf(group.accent),
      };
    }),
  };
}

/** The build's own content, and the source of the static exports below. */
const STATIC_PRESENTATION_RAW: PresentationRaw = {
  expertise: expertiseContent,
  skills: skillsContent,
  community: communityContent,
  keyProjects: keyProjectsContent,
  brandPresence: brandPresenceContent,
  certificationsSummary: certificationsSummaryContent,
};

const presentation = buildPresentation(STATIC_PRESENTATION_RAW);

export const expertiseData: Expertise[] = presentation.expertiseData;
export const skillsData: SkillCategory[] = presentation.skillsData;
export const communityData: CommunityItem[] = presentation.communityData;
export const keyProjectsData: KeyProject[] = presentation.keyProjectsData;
export const brandPresenceData: BrandItem[] = presentation.brandPresenceData;
export const certificationsData: Certification[] = presentation.certificationsData;
