import {
  cvData,
  experienceData,
  recognitionData,
} from "../src/data/portfolioFacts";

/**
 * The schema.org Person that search engines and crawling models read.
 *
 * It used to be typed out by hand in index.html, next to the same facts
 * kept in the data module, with nothing holding the two together. Nobody
 * reads their own structured data, so a stale employer would have gone on
 * being the answer given to Google for as long as it took somebody to
 * think of checking.
 *
 * Built here instead, from the data the page renders. This file is plain
 * TypeScript with no JSX so the Vite config can load it, which is what the
 * split into portfolioFacts.ts was for.
 */

/** Companies to list as past employers, in the order they should appear. */
const PAST_EMPLOYERS = ["Acxiom", "Simple S.A."];

/**
 * Curated rather than derived. cvData.skills carries the same ground in
 * longer phrases meant for a CV, and the shorter terms here are chosen for
 * how search engines match them. Deriving them would change what the site
 * has been telling crawlers, which is not a side effect a refactor should
 * have.
 */
const KNOWS_ABOUT = [
  "Quality Engineering",
  "Test Management",
  "GxP",
  "CSV Compliance",
  "Software Testing",
  "ISTQB",
  "Agile",
  "Scrum",
  "Test Leadership",
  "Stakeholder Management",
  "SAFe / Agile Delivery",
  "ITIL",
  "AgilePM",
  "Quality Governance at Scale",
  "API Testing",
  "SQL / Data Validation",
  "ETL & Data Pipelines",
  "Frontend Testing",
  "CI/CD Awareness",
  "AI-assisted Testing",
];

/** Named separately from recognitionData, which lists dated awards only. */
const STANDING_RECOGNITION = "Brand Ambassador & Representative (Sii Poland)";

const JOB_TITLE = "Quality Engineering Lead / Test Manager";
const GITHUB_PROFILE = "https://github.com/rembednarczyk";

export interface PersonSchema {
  "@context": string;
  "@type": string;
  name: string;
  jobTitle: string;
  url: string;
  address: { "@type": string; addressCountry: string };
  sameAs: string[];
  worksFor: { "@type": string; name: string };
  alumniOf: { "@type": string; name: string }[];
  knowsAbout: string[];
  award: string[];
}

export function buildPersonSchema(): PersonSchema {
  const organization = (name: string) => ({ "@type": "Organization", name });

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: cvData.header.name,
    jobTitle: JOB_TITLE,
    url: `https://${cvData.header.website}`,
    address: {
      "@type": "PostalAddress",
      addressCountry: cvData.header.location,
    },
    sameAs: [`https://${cvData.header.linkedin}`, GITHUB_PROFILE],
    // experienceData is newest first, so the first entry is the job held now.
    worksFor: organization(experienceData[0].company),
    alumniOf: PAST_EMPLOYERS.map(organization),
    knowsAbout: KNOWS_ABOUT,
    award: [
      ...recognitionData.map(
        (award) => `${award.title} (${award.company}, ${award.issued})`,
      ),
      STANDING_RECOGNITION,
    ],
  };
}

/** Indented to sit inside index.html's script tag without looking pasted in. */
export function renderPersonSchema(): string {
  return escapeForScript(JSON.stringify(buildPersonSchema(), null, 2))
    .split("\n")
    .map((line) => `      ${line}`)
    .join("\n");
}

/**
 * The one escaping a JSON string dropped inside a `<script>` needs: `<`, so a
 * value holding `</script>` cannot close the tag early and turn the rest of
 * the page into markup. `JSON.stringify` does not do it — it leaves `<` and
 * `/` alone. Every value here is build-time data from portfolioFacts today,
 * so nothing reaches it that carries `</script>`; this closes the class
 * rather than trusting that to stay true, at the cost of two characters.
 * `>` and `&` go with it, the trio a JSON-in-HTML escape always travels as.
 */
export function escapeForScript(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/** Matches the JSON-LD block index.html carries, whatever is inside it. */
const JSON_LD = /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/;

/**
 * Fills index.html's JSON-LD block with the generated schema.
 *
 * Throws rather than returning the page untouched. Shipping without
 * structured data, or with whatever stale text the file happened to hold,
 * is worse than a failed build: nobody would notice either.
 */
export function injectPersonSchema(html: string): string {
  if (!JSON_LD.test(html)) {
    throw new Error('index.html has no <script type="application/ld+json"> to fill');
  }

  return html.replace(
    JSON_LD,
    (_match, open: string, close: string) =>
      `${open}\n${renderPersonSchema()}\n    ${close}`,
  );
}
