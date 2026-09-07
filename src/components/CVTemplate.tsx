// The header's own icons are not named by content: they label a phone
// number, an address and a location, which are the header's structure
// rather than anything an owner arranges.
import { Mail, Globe, MapPin, Phone } from "lucide-react";
import { CvSection } from "./CvSection";
import { LinkedinIcon } from "./ui/BrandIcon";
import { ContactParts } from "./ui/ContactParts";
import { iconOf } from "../data/icons";
import { bodyOf } from "./CvBodies";
import { cvData } from "../data/portfolioFacts";
import { LINKEDIN_QR } from "../data/linkedinQr";
import { CONTENT_UPDATED, formatIsoDate } from "../data/contentDate";
import { PROVENANCE_FOOTER } from "../lib/provenance";
import cvLayout from "../content/cvLayout.json" with { type: "json" };

export const CVTemplate = () => {
  return (
    <div className="bg-white text-black font-sans max-w-[210mm] mx-auto p-8 text-[11pt] leading-snug">
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 12mm 15mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>
      {/* Header */}
      <header className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-1">
            {cvData.header.name}
          </h1>
          <h2 className="text-xl text-slate-600 font-medium mb-3">
            {cvData.header.title}
          </h2>

          <div className="flex flex-wrap gap-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-1.5">
            <Phone size={14} className="text-slate-400" aria-hidden="true" />
            <a
              href={`tel:${cvData.header.phone.href}`}
              className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-400"
            >
              <ContactParts detail={cvData.header.phone} />
            </a>
          </div>
          <div className="flex items-center gap-1.5 before:content-['•'] before:mx-2 before:text-slate-400">
            <Mail size={14} className="text-slate-400" aria-hidden="true" />
            <button
              type="button"
              className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-400 cursor-pointer bg-transparent border-none p-0 text-inherit font-inherit"
              onClick={() => {
                window.location.href = `mail${"to"}:${cvData.header.email.href}`;
              }}
            >
              <ContactParts detail={cvData.header.email} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 before:content-['•'] before:mx-2 before:text-slate-400">
            <LinkedinIcon size={14} className="text-slate-400" aria-hidden="true" />
            <a href={`https://${cvData.header.linkedin}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-400">
              {cvData.header.linkedin}
            </a>
          </div>
          <div className="flex items-center gap-1.5 before:content-['•'] before:mx-2 before:text-slate-400">
            <Globe size={14} className="text-slate-400" aria-hidden="true" />
            <a href={`https://${cvData.header.website}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-slate-300 hover:decoration-slate-400">
              {cvData.header.website}
            </a>
          </div>
          <div className="flex items-center gap-1.5 before:content-['•'] before:mx-2 before:text-slate-400">
            <MapPin size={14} className="text-slate-400" aria-hidden="true" />
            <span>{cvData.header.location}</span>
          </div>
        </div>
        </div>
        {/*
          The opacity used to sit here, on the whole block, which dropped the
          label below it to 2.96:1 on white. A QR code survives being faded;
          the words under it do not.
        */}
        <div className="flex flex-col items-center shrink-0 ml-6 mt-1">
          <svg
            width={72}
            height={72}
            viewBox={`0 0 ${LINKEDIN_QR.size} ${LINKEDIN_QR.size}`}
            xmlns="http://www.w3.org/2000/svg"
            className="mb-1.5 opacity-75"
            role="img"
            aria-label="QR Code to LinkedIn profile"
          >
            {/* Printed on paper of unknown colour, so the quiet zone is drawn rather than assumed. */}
            <rect width={LINKEDIN_QR.size} height={LINKEDIN_QR.size} fill="#FFFFFF" />
            <path d={LINKEDIN_QR.path} fill="#000000" shapeRendering="crispEdges" />
          </svg>
          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Scan for LinkedIn</span>
          {/* A printed CV outlives the print: the month it was current is the
              one thing a reader of a paper copy cannot look up. */}
          {CONTENT_UPDATED !== undefined && (
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-2">
              As of {formatIsoDate(CONTENT_UPDATED, "month")}
            </span>
          )}
        </div>
      </header>

      {cvLayout.sections.map((section) => {
        const Icon = iconOf(section.icon);
        const Body = bodyOf(section.body);

        return (
          <CvSection key={section.body} icon={Icon} title={section.title}>
            <Body />
          </CvSection>
        );
      })}

      {/*
        The provenance footer. Plain, legible text at an ordinary size — not a
        hidden mark: near-invisible body text is what an applicant tracking
        system flags as keyword stuffing, so the origin is stated openly here
        and carried again, out of the body, in the PDF's Title metadata
        (src/hooks/usePrintProvenanceTitle.ts). A reader swapping the name in
        can see and remove this; the price of a mark that is safe to submit.
      */}
      <footer
        data-provenance="cv"
        className="mt-8 pt-3 border-t border-slate-200 text-[9px] text-slate-500 text-center tracking-wide"
      >
        {PROVENANCE_FOOTER}
      </footer>
    </div>
  );
};
