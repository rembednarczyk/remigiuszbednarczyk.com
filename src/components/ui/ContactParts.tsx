import type { CvContact } from "../../types";

/**
 * A contact detail, fragmented where that costs nothing and whole where it
 * does not.
 *
 * `CvContact` keeps a detail as `["hello", "@", "remigiuszbednarczyk", ".",
 * "com"]` rather than as text, and nothing said why. This is why: rendered as
 * separate elements, the address exists in the DOM only as fragments, which a
 * harvester reading text nodes does not join and a person reads as one line.
 *
 * What nothing said either is that it is not free. An accessible name is
 * built by trimming each element's contribution and concatenating them with
 * no separator, so a detail whose parts include a space loses that space.
 * Measured, on the two this repository has:
 *
 *     email, fragmented   joins back to the address unchanged
 *     phone, fragmented   loses the spaces that group its digits
 *     phone, whole        keeps them
 *
 * The assembled address is deliberately not written out here. This comment
 * ships in the sourcemap, a plain URL beside the bundle, and a harvester
 * that fetches it would read a literal address out of the very file that
 * explains why the address must never appear whole — the fourth bughunt
 * found exactly that. The fragments below carry the shape without
 * reassembling into something an email regex matches.
 *
 * So the phone number was being announced to a screen reader as one run of
 * twelve digits, on the printed CV and on the page, and had been since the
 * protection was added. Nobody measured it because nobody had written down
 * that the protection had a price.
 *
 * The rule is therefore read off the data rather than configured: fragment a
 * detail when no part of it is a space, and render it whole when one is. That
 * keeps the protection where it is free — the email, which is what spam
 * harvesting is actually about — and drops it where a person listening pays
 * for it. A `aria-label` would buy both and is refused on purpose: it would
 * put the whole value in an attribute, which is the first place anything
 * scraping a page looks.
 *
 * One component, because the protection had already been lost once by
 * divergence: the printed CV fragmented and `ErrorBoundary` rendered
 * `display.join("")`, on the one screen a visitor sees when something has
 * gone wrong.
 */
export function ContactParts({ detail }: { detail: CvContact }) {
  const wouldCostTheName = detail.display.some((part) => part.trim() === "");

  if (wouldCostTheName) return <>{detail.display.join("")}</>;

  return (
    <>
      {detail.display.map((part, index) => (
        <span key={index}>{part}</span>
      ))}
    </>
  );
}
