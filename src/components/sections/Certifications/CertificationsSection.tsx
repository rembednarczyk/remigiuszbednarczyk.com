import { useContent } from "../../../data/content";
import { entryEdit } from "../../../preview/edit";
import { CertificationCard } from "./CertificationCard";

/**
 * The `certifications` band, one of the page's numbered run.
 *
 * Its heading, its number and its anchor are not here: they are in
 * src/content/pageLayout.json, and src/App.tsx wraps this in `PageSection`
 * with them. What is here is the arrangement and nothing else.
 *
 * src/components/PageBodies.tsx is what maps the name to this component.
 */
export function CertificationsSection() {
  const { certificationsData } = useContent();
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* The page draws certificationsSummary.json; certifications.json is the
          printed CV's record. The bughunt found the cards naming the print
          file, which opened the wrong file on a click and lit nothing on a
          highlight — unseen because both files happen to hold three groups. */}
      {certificationsData.map((item, idx) => (
        <CertificationCard key={idx} item={item} edit={entryEdit("certificationsSummary", "groups", idx)} />
      ))}
    </div>
  );
}
