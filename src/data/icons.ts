import {
  Award,
  BadgeCheck,
  BookOpen,
  Bot,
  BrainCircuit,
  BrainCog,
  Briefcase,
  Bug,
  Building2,
  Calendar,
  ClipboardCheck,
  Code,
  CodeXml,
  Compass,
  Cpu,
  Database,
  FileCheck,
  FlaskConical,
  Gauge,
  GitBranch,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  IdCard,
  Image,
  Layers,
  Lightbulb,
  Medal,
  Megaphone,
  Mic,
  MonitorCog,
  Network,
  Newspaper,
  Presentation,
  Rocket,
  Rss,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Terminal,
  TestTube,
  TreePalm,
  Trophy,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import type { ElementType } from "react";
import type { AccentName, IconName } from "./vocabulary";

/**
 * The icons content is allowed to name, and the accents it is allowed to
 * ask for.
 *
 * A card's icon is as much part of its entry as its title — that is why the
 * two used to sit together in one .tsx file, with the icon written as JSX.
 * The cost was that the whole of it, 79 sentences, was unreachable to
 * anything that could not evaluate JSX, which is every editor that is not
 * this repository.
 *
 * So content names an icon and this resolves the name. Which names exist is
 * not decided here: `src/data/vocabulary.ts` holds them, because the editor
 * has to read them and cannot compile TypeScript. `satisfies Record<IconName,
 * …>` holds this registry to that list in both directions — measured, a
 * missing entry is TS1360 and an extra one TS2353 — so the two cannot
 * disagree without the build saying so, and neither is a copy of the other.
 * `tests/icons.test.ts` fails on a name no content file uses, so the list
 * shrinks when a card stops needing one.
 *
 * Both lookups throw on a name they do not have. JSON reaches no type
 * system, and the alternative to throwing is a card that renders with a
 * hole where its icon was, or with no colour, on a page nobody re-reads
 * after an edit. It earned that on its first run: the project card imported
 * `Code2`, which is a deprecated alias whose canonical name is `CodeXml`,
 * so the two names for one icon disagreed the moment the icon became a
 * string. Registered under the canonical name, since an alias is what a
 * major version removes.
 */
export const ICONS = {
  Award,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  BrainCog,
  Calendar,
  Code,
  CodeXml,
  Cpu,
  Database,
  Globe,
  Heart,
  IdCard,
  Image,
  Layers,
  Lightbulb,
  Megaphone,
  MonitorCog,
  Rss,
  ShieldCheck,
  Terminal,
  TreePalm,
  Users,
  UsersRound,
  // On offer to the editor, not yet worn by a card: OFFERED_ICONS in
  // vocabulary.ts, and tests/icons.test.ts allows exactly these.
  Bot,
  Briefcase,
  Bug,
  Building2,
  ClipboardCheck,
  Compass,
  FileCheck,
  FlaskConical,
  Gauge,
  GitBranch,
  GraduationCap,
  Handshake,
  Medal,
  Mic,
  Network,
  Newspaper,
  Presentation,
  Rocket,
  Sparkles,
  Star,
  Target,
  TestTube,
  Trophy,
  Workflow,
} satisfies Record<IconName, ElementType>;

export function iconOf(name: string): ElementType {
  const icon = (ICONS as Record<string, ElementType>)[name];

  if (icon === undefined) {
    throw new Error(
      `content asks for the ${name} icon, and the ones on offer are ${Object.keys(ICONS).join(", ")}`,
    );
  }

  return icon;
}

/**
 * The four accents a card's icon can take, as Tailwind classes.
 *
 * Named in content rather than written there, for the reason `AwardTone`
 * already records: a class string in the data is presentation in the data,
 * and it puts the palette out of reach of anything that is not a component.
 * Four rather than one because the skills, brand and certification cards
 * each cycle through them, and cycling by array index would silently
 * re-colour every card after any entry a person inserts.
 */
export const ACCENTS = {
  cyan: "text-cyan-400",
  purple: "text-purple-400",
  emerald: "text-emerald-400",
  orange: "text-orange-400",
  // On offer to the editor, not yet worn by a card: OFFERED_ACCENTS in
  // vocabulary.ts. The 400 shade, like the four above, and each measured
  // against the card's ground by tests/accentContrast.test.ts.
  rose: "text-rose-400",
  amber: "text-amber-400",
  lime: "text-lime-400",
  blue: "text-blue-400",
} as const satisfies Record<AccentName, string>;

export type AccentTone = keyof typeof ACCENTS;

export function accentOf(tone: string): string {
  const accent = (ACCENTS as Record<string, string>)[tone];

  if (accent === undefined) {
    throw new Error(
      `content asks for a ${tone} accent, and there are only ${Object.keys(ACCENTS).join(", ")}`,
    );
  }

  return accent;
}

/**
 * The border a card lifts to on hover and press, in the same accent its icon
 * wears — so a card highlights the colour it is coloured, rather than the one
 * cyan the cards were all frozen to when the icons gained their own accents.
 *
 * Written out per tone rather than composed as `border-${tone}-400/50`,
 * because Tailwind only emits the classes it can see spelled in the source —
 * the same reason `AwardTone`'s colours and `ACCENTS` above are literal
 * strings and not built from the name. One entry per accent, so a card that
 * takes a new tone is coloured on press the day it does, not after someone
 * remembers to widen this.
 */
export const ACCENT_HIGHLIGHTS = {
  cyan: "hover:border-cyan-400/50 active:border-cyan-400/50",
  purple: "hover:border-purple-400/50 active:border-purple-400/50",
  emerald: "hover:border-emerald-400/50 active:border-emerald-400/50",
  orange: "hover:border-orange-400/50 active:border-orange-400/50",
  rose: "hover:border-rose-400/50 active:border-rose-400/50",
  amber: "hover:border-amber-400/50 active:border-amber-400/50",
  lime: "hover:border-lime-400/50 active:border-lime-400/50",
  blue: "hover:border-blue-400/50 active:border-blue-400/50",
} as const satisfies Record<AccentName, string>;

export function accentHighlightOf(tone: string): string {
  const highlight = (ACCENT_HIGHLIGHTS as Record<string, string>)[tone];

  if (highlight === undefined) {
    throw new Error(
      `content asks for a ${tone} accent, and there are only ${Object.keys(ACCENT_HIGHLIGHTS).join(", ")}`,
    );
  }

  return highlight;
}
