import { Expertise } from "../../../types";
import { IconCard } from "../../ui/IconCard";

export function ExpertiseCard({ item, edit }: { item: Expertise; edit?: string | undefined }) {
  return (
    <IconCard icon={item.icon} title={item.title} edit={edit} highlight={item.highlight}>
      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
    </IconCard>
  );
}
