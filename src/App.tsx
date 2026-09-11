import { MotionProvider } from "./components/MotionProvider";
import { PageSection } from "./components/ui/PageSection";
import { pageBodyOf } from "./components/PageBodies";
import { numbered } from "./lib/pageLayout";
import { useContent } from "./data/content";
import { useAutoPrint } from "./hooks/useAutoPrint";
import { usePrintTitle } from "./hooks/usePrintTitle";
import { useCookieConsent } from "./hooks/useCookieConsent";
import { useHashTarget } from "./hooks/useHashTarget";
import { isKnownPath } from "./lib/routing";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ParticleBackground } from "./components/ParticleBackground";
import { CVTemplate } from "./components/CVTemplate";
import { ScrollToTop } from "./components/ui/ScrollToTop";
import { NotFound } from "./components/NotFound";
import { PreviewApp } from "./preview/PreviewApp";
import { PREVIEW_PATH } from "./preview/protocol";

/** Chooses between the page, the editor's live preview, and the 404 view. */
export default function App() {
  const pathname = window.location.pathname;

  // The editor embeds this. It is the real page drawn from content posted
  // over the window, not a route the site links to — reached the same way
  // every client route here is, through the SPA's 404 fallback.
  if (pathname === PREVIEW_PATH) {
    return (
      <MotionProvider>
        <PreviewApp />
      </MotionProvider>
    );
  }

  return (
    <MotionProvider>
      {isKnownPath(pathname) ? (
        <Portfolio />
      ) : (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-500">
          <NotFound />
        </div>
      )}
    </MotionProvider>
  );
}

/**
 * The page itself, with the decision of whether to show it left to App.
 *
 * Exported so it can be mounted without that decision. Storybook serves its
 * preview from /iframe.html, so a story rendering App gets the 404 view: the
 * page-level accessibility scan was reading an error screen and reporting it
 * clean, which is how the first version of that scan passed.
 */
export function Portfolio() {
  const { pageLayout } = useContent();

  // Only the page can be printed; there is nothing on a 404 worth paper.
  useAutoPrint();

  // Name the printed CV's PDF for the person, not the indexed page title, for
  // the print only — the live page's title is left as search engines index it.
  usePrintTitle();

  // The sections do not exist when the browser looks for the anchor, so a
  // shared link to one of them has to be honoured here instead.
  useHashTarget();

  // Held here rather than in the footer: the banner and the scroll-to-top
  // button both live in the bottom-right corner, and one of them has to
  // know about the other.
  const { consent, accept, decline, reset } = useCookieConsent();

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden print:overflow-visible print:bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-3 focus:bg-cyan-500 focus:text-white focus:font-bold focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      <div className="print:hidden">
        {/* Interactive Space/IT Background */}
        <ParticleBackground />

        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <main
          id="main-content"
          itemScope
          itemType="https://schema.org/Person"
          className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-8"
        >
          {numbered(pageLayout.sections).map(({ section, number }, index) => {
            const Body = pageBodyOf(section.body);
            // Keyed by place as well as name: a layout being edited can name
            // one band twice for a moment, and two children with one key is
            // an error React recovers from by guessing.
            const key = `${String(index)}:${section.body}`;

            // A band with a heading is one of the numbered run and is
            // wrapped here; the hero, the quote and the contact form
            // render their own element, as they always did.
            return "title" in section ? (
              <PageSection key={key} id={section.id} number={number} title={section.title}>
                <Body />
              </PageSection>
            ) : (
              <Body key={key} />
            );
          })}
        </main>

        {/* Footer */}
        <Footer
          consent={consent}
          onAccept={accept}
          onDecline={decline}
          onReset={reset}
        />

        {/*
          Floating Scroll to Top Button. It stands down while the consent
          banner is up: both sit in the bottom-right corner, and the banner
          is the one asking for an answer. The button's z-50 does not save
          it either — the banner's z-[90] is trapped inside the footer's
          stacking context, so the button paints over the banner rather than
          under it.
        */}
        {consent !== "unset" && <ScrollToTop />}
      </div>

      {/* Print CV Template */}
      <div className="hidden print:block w-full bg-white text-black">
        <CVTemplate />
      </div>
    </div>
  );
}
