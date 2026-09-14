import React from "react";
import { BrandItem } from "../../../types";

export const BrandCard: React.FC<{ item: BrandItem; edit?: string }> = ({ item, edit }) => {
  return (
    <article
      data-edit={edit}
      className={`bg-white/5 border border-white/10 rounded-lg p-6 hover:-translate-y-1 hover:bg-white/10 active:scale-[0.98] active:bg-white/10 ${item.highlight} transition-all duration-300`}
    >
      <div className="mb-4" aria-hidden="true">
        {item.icon}
      </div>
      <h3 className="text-white font-bold mb-2">{item.title}</h3>
      <p className="text-slate-400 text-sm">{item.desc}</p>
    </article>
  );
};
