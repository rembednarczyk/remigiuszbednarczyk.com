import { Certification } from "../../../types";
import { IconCard } from "../../ui/IconCard";

export function CertificationCard({ item, edit }: { item: Certification; edit?: string | undefined }) {
  return (
    <IconCard icon={item.icon} title={item.title} edit={edit} highlight={item.highlight}>
      <ul className="space-y-2">
        {item.items.map((line, i) => (
          <li key={i} className="text-slate-400 text-sm flex items-start gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 shrink-0 mt-1.5"
              aria-hidden="true"
            ></span>
            {line}
          </li>
        ))}
      </ul>
    </IconCard>
  );
}
