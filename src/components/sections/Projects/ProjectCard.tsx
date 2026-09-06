import React from "react";
import { KeyProject, KeyProjectLink } from "../../../types";
import { Tag } from "../../ui/Tag";

const CARD =
  "group relative bg-[#0a1128]/80 backdrop-blur-sm border border-white/10 rounded-xl p-8 hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 flex flex-col";

/**
 * One link as a readable output — its icon and what it is — rather than a
 * bare glyph. Padded to a 44px tap target; the icon keeps its size.
 */
function OutputLink({ link, project }: { link: KeyProjectLink; project: string }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={link.label ? `${link.label} — ${project}` : `Link to ${project}`}
      // min-h-11 is the 44px SC 2.5.5 asks for: the row grows its tap area
      // around the type and the icon, which stay the size they are.
      className="flex items-center gap-3 -mx-2 px-2 py-2 min-h-11 rounded text-slate-300 hover:text-cyan-400 active:text-cyan-400 transition-colors focus-ring"
    >
      <span className="text-slate-500 group-hover/link:text-cyan-400 shrink-0">{link.icon}</span>
      <span className="text-sm leading-snug underline-offset-4 decoration-white/20 hover:underline">
        {link.label}
      </span>
    </a>
  );
}

/** The links in their groups, in the order the groups first appear. */
function groupedLinks(links: KeyProjectLink[]): [string, KeyProjectLink[]][] {
  const groups = new Map<string, KeyProjectLink[]>();
  for (const link of links) {
    const key = link.group ?? "";
    groups.set(key, [...(groups.get(key) ?? []), link]);
  }
  return [...groups.entries()];
}

/**
 * A recurring programme with published outputs, given the whole row: what it
 * is and the role on the left, the outputs by edition on the right. The
 * difference from the other cards is the content's own shape — editions and
 * reports — not an ornament.
 */
function FeaturedCard({ project, edit }: { project: KeyProject; edit?: string | undefined }) {
  const groups = groupedLinks(project.links ?? []);
  const editions = groups.filter(([name]) => name !== "").length;

  return (
    <article
      data-edit={edit}
      className={`${CARD} md:col-span-2 md:grid md:grid-cols-[1.15fr_1fr] md:gap-12`}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-cyan-400">{project.mainIcon}</div>
          {/* Counted from the groups, not typed: one edition is a programme,
              not yet a recurring one, so the line waits for the second.
              slate-400, not 500: at 12px on the card's ground, 500 measures
              3.98:1 and SC 1.4.3 asks 4.5:1 — found by axe the day the
              second edition made the line appear. */}
          {editions > 1 && (
            <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
              Recurring programme · {editions} editions
            </span>
          )}
        </div>
        <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-cyan-400 group-active:text-cyan-400 transition-colors">
          {project.title}
        </h3>
        <p className="text-slate-400 text-base leading-relaxed mb-8 flex-grow">{project.desc}</p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {project.tags.map((tag, tIdx) => (
            <Tag key={tIdx}>{tag}</Tag>
          ))}
        </div>
      </div>

      <div className="mt-8 md:mt-0 md:border-l md:border-white/10 md:pl-10 flex flex-col gap-7">
        {groups.map(([name, links]) => (
          <div key={name} className="relative">
            {name !== "" && (
              <div className="flex items-center gap-3 mb-2">
                <span className="hidden md:block absolute -left-[45px] w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-[#0a1128]" aria-hidden="true" />
                <h4 className="font-mono text-xs uppercase tracking-wider text-cyan-400">{name}</h4>
              </div>
            )}
            <ul className="flex flex-col">
              {links.map((link, lIdx) => (
                <li key={lIdx}>
                  <OutputLink link={link} project={project.title} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </article>
  );
}

export const ProjectCard: React.FC<{ project: KeyProject; edit?: string }> = ({ project, edit }) => {
  if (project.featured) return <FeaturedCard project={project} edit={edit} />;

  // Decided per link, not all-or-nothing: a project that mixes a labelled
  // link with a bare one used to send every link — the labelled ones too —
  // to the icon row, dropping the labels it had. A link with a label is an
  // output below; one without keeps the compact icon row above.
  const links = project.links ?? [];
  const iconLinks = links.filter((link) => link.label === undefined);
  const outputLinks = links.filter((link) => link.label !== undefined);

  return (
    <article data-edit={edit} className={CARD}>
      <div className="flex justify-between items-start mb-6">
        <div className="text-cyan-400">{project.mainIcon}</div>
        {/* Links without a label keep the old icon row: the icons keep their
            size and the padding grows around them, so the tap area reaches
            44x44 (WCAG 2.2 SC 2.5.5). Labelled links render as outputs below. */}
        {iconLinks.length > 0 && (
          <div className="flex">
            {iconLinks.map((link, lIdx) => (
              <a
                key={lIdx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Link to ${project.title}`}
                className="text-slate-400 hover:text-cyan-400 active:text-cyan-400 active:scale-90 transition-all p-3 rounded focus-ring"
              >
                {link.icon}
              </a>
            ))}
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 group-active:text-cyan-400 transition-colors">
        {project.title}
      </h3>
      <p className="text-slate-400 text-base leading-relaxed mb-6 flex-grow">{project.desc}</p>

      {outputLinks.length > 0 && (
        <ul className="flex flex-col mb-6 border-t border-white/10 pt-4">
          {outputLinks.map((link, lIdx) => (
            <li key={lIdx}>
              <OutputLink link={link} project={project.title} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 mt-auto">
        {project.tags.map((tag, tIdx) => (
          <Tag key={tIdx}>{tag}</Tag>
        ))}
      </div>
    </article>
  );
};
