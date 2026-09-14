import React from "react";
import { SkillCategory } from "../../../types";

export const SkillCategoryCard: React.FC<{ category: SkillCategory; edit?: string }> = ({
  category,
  edit,
}) => {
  return (
    <article
      data-edit={edit}
      className={`bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 active:scale-95 active:bg-white/10 ${category.highlight} transition-all duration-300`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div aria-hidden="true">{category.icon}</div>
        <h3 className="font-semibold text-white">{category.name}</h3>
      </div>
      <ul className="space-y-2">
        {category.skills.map((skill, sIdx) => (
          <li
            key={sIdx}
            className="text-slate-400 text-sm flex items-center gap-2"
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"
              aria-hidden="true"
            ></span>
            {skill}
          </li>
        ))}
      </ul>
    </article>
  );
}
