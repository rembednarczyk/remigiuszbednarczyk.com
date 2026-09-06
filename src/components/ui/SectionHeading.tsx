interface SectionHeadingProps {
  number: string;
  title: string;
}

export function SectionHeading({ number, title }: SectionHeadingProps) {
  return (
    <h2 className="text-3xl font-bold mb-12 flex items-center gap-3 text-white">
      <span className="text-cyan-400 font-mono text-xl">{number}.</span> {title}
      {/* A span, not a div: an h2's content is phrasing, and a div inside it
          is invalid nesting the browser silently reflows. Decorative, so
          hidden from the accessible name; flex-grow works the same on it. */}
      <span className="h-[1px] bg-white/10 flex-grow ml-4" aria-hidden="true" />
    </h2>
  );
}
