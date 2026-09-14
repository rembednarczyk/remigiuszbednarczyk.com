import { ReactNode } from "react";
import { ACCENT_HIGHLIGHTS } from "../../data/icons";

/**
 * A card headed by an icon tile and a title, with the caller's content below.
 *
 * The certifications and the areas of expertise wrote this out twice: the same
 * article, the same twelve-by-twelve tile, the same heading, the same five
 * hover and active classes. The bodies genuinely differ — a list of
 * credentials against a paragraph of prose — so the body stays with the
 * caller and only the shell lives here.
 *
 * The two copies had already drifted: the expertise heading carried `mb-2`
 * where the certification heading carried `mb-4`. `mb-4` is what the other
 * card headings in the repository use (projects, awards), so the shell keeps
 * that and the expertise cards gain 8px under their titles.
 */

export interface IconCardProps {
  /** Already an element — these icons come from the data as `<Award />`. */
  icon: ReactNode;
  title: string;
  children: ReactNode;
  /** Where this card is edited, for the live preview — see src/preview/edit.ts. */
  edit?: string | undefined;
  /**
   * The hover/press border, in the icon's accent. Cyan by default because the
   * expertise cards are all cyan; the certification cards, whose accent
   * varies by group, pass their own so the card highlights the colour it
   * wears rather than the one cyan they were frozen to.
   */
  highlight?: string;
}

export function IconCard({
  icon,
  title,
  children,
  edit,
  highlight = ACCENT_HIGHLIGHTS.cyan,
}: IconCardProps) {
  return (
    <article
      data-edit={edit}
      className={`group bg-[#0a1128]/80 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:-translate-y-1 active:scale-95 ${highlight} transition-all duration-300`}
    >
      <div
        className="w-12 h-12 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-4 group-hover:scale-110 group-active:scale-110 transition-transform duration-300"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-400 group-active:text-cyan-400 transition-colors">
        {title}
      </h3>
      {children}
    </article>
  );
}
