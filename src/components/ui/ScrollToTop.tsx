import { useState, useEffect } from "react";
import { m, AnimatePresence } from "motion/react";
import { ChevronUp } from "lucide-react";

export function ScrollToTop() {
  // Decided from where the page already is, not only from the next scroll.
  // This component is mounted once the consent banner is answered, which can
  // happen after the visitor has scrolled deep into the page — the banner
  // was over the content while they read. Read at the first render rather
  // than set in the effect, or the button stays hidden until the next scroll,
  // absent exactly where it is wanted.
  const [isVisible, setIsVisible] = useState(() => window.scrollY > 300);

  useEffect(() => {
    let timeoutId: number | null = null;
    const toggleVisibility = () => {
      if (timeoutId) return;
      timeoutId = window.setTimeout(() => {
        // Show button when page is scrolled down 300px
        if (window.scrollY > 300) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
        timeoutId = null;
      }, 100);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <m.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 p-3 bg-[#0a1128]/80 hover:bg-white/10 border border-white/10 text-cyan-400 rounded-full shadow-lg shadow-cyan-500/10 backdrop-blur-sm transition-colors group print:hidden focus-ring"
          aria-label="Scroll to top"
        >
          <ChevronUp size={24} className="animate-bounce" />
        </m.button>
      )}
    </AnimatePresence>
  );
}
