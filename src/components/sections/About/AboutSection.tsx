import { useContent } from "../../../data/content";
import { editValue } from "../../../preview/edit";
import { AboutImage } from "./AboutImage";

/**
 * The `about` band, one of the page's numbered run.
 *
 * Its heading, its number and its anchor are not here: they are in
 * src/content/pageLayout.json, and src/App.tsx wraps this in `PageSection`
 * with them. What is here is the arrangement and nothing else.
 *
 * src/components/PageBodies.tsx is what maps the name to this component.
 */
export function AboutSection() {
  const { aboutData } = useContent();
  return (
    <div
      data-edit={editValue("about")}
      className="grid md:grid-cols-2 gap-12 items-center print:grid-cols-1 print:gap-4"
    >
      <div className="space-y-4 text-slate-400 leading-relaxed">
        {aboutData.paragraphs.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
      <AboutImage
        imageUrl={aboutData.imageUrl}
        width={aboutData.imageWidth}
        height={aboutData.imageHeight}
      />
    </div>
  );
}
