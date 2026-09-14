import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { ShieldCheck, Download, Menu, X } from "lucide-react";
import { useActiveSection } from "../../hooks/useActiveSection";
import { useScrollToSection } from "../../hooks/useScrollToSection";
import { NAV_ITEMS, SECTION_TO_NAV_ENTRY } from "../../data/navigation";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeSection = useActiveSection(SECTION_TO_NAV_ENTRY);
  const scrollToSection = useScrollToSection();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleScrollToSection = (id: string) => {
    scrollToSection(id, () => setIsMobileMenuOpen(false));
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          className="flex items-center gap-2 cursor-pointer group focus-ring rounded-lg p-2.5 -ml-2.5 transition-transform active:scale-95"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ShieldCheck
            aria-hidden="true"
            className="text-cyan-400 group-hover:text-purple-400 group-active:text-purple-400 transition-colors"
            size={24}
          />
          <div className="text-xl font-bold tracking-tighter text-white hidden sm:block">
            Remigiusz<span className="text-cyan-400">Bednarczyk</span>
          </div>
          <div className="text-xl font-bold tracking-tighter text-white sm:hidden">
            R<span className="text-cyan-400">B</span>
          </div>
        </button>

        <div className="flex items-center gap-3 lg:gap-4">
          {/* Desktop Links */}
          <div className="hidden lg:flex items-center space-x-3 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleScrollToSection(item.id)}
                className={`hover:text-cyan-400 active:text-cyan-400 active:scale-95 transition-all focus-ring rounded px-2 py-3 ${activeSection === item.id ? "text-cyan-400" : "text-slate-200"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Always visible CV Button */}
          <button
            onClick={() => window.print()}
            className="px-3 py-3 xl:px-5 xl:py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 active:from-cyan-400 active:to-purple-400 active:scale-95 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 text-sm xl:text-base focus-ring"
          >
            <Download
              aria-hidden="true"
              size={18}
              className="w-4 h-4 xl:w-[18px] xl:h-[18px]"
            />
            <span className="hidden xl:inline">Resume (PDF)</span>
            <span className="xl:hidden">CV</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            ref={buttonRef}
            className="lg:hidden text-slate-300 hover:text-white active:text-white active:scale-90 transition-all p-2.5 focus-ring rounded"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X aria-hidden="true" size={24} />
            ) : (
              <Menu aria-hidden="true" size={24} />
            )}
          </button>
        </div>
      </div>

      {/*
        Mobile Menu Dropdown.

        The height subtracts whatever a fixed bar has claimed at the foot of
        the viewport, the same `--fixed-bar-space` the body's padding spends.
        Without it the menu grows to 16px from the bottom edge and lands on
        the consent banner: at 812x375, 740x360 and 768x500 it covered Accept
        and Decline completely, and a tap on Accept went to a nav button, so
        the page scrolled away and no choice was recorded.

        The banner's own `z-[90]` does not save it. It is trapped inside the
        footer's stacking context, which is `z-10`, so against this menu at
        `z-50` it loses — the same trap App.tsx documents for the
        scroll-to-top button.

        The floor is the other half, and it was missing. Subtracting the
        band's whole height with nothing to stop it reaching zero is fine
        while the banner is a row and cruel once it is a stack: at 568x320
        the banner claims 191 of 320 pixels and the menu computed to 33px,
        which is its own padding and no rows at all. Measured before the
        floor: 0 of 7 items visible at 320x320, 480x320 and 568x320, where
        the rule this replaced showed 4. An empty menu is worse than the
        defect the reservation was added for.

        7.5rem is measured, and measured twice. The first attempt was 9.5rem,
        chosen against the distance to the banner's Accept button — at least
        171px below the menu's top edge at every viewport — with a comment
        claiming the floor gave up only explanatory text and none of the
        banner's three controls. check:focus refused it: at 480x320 and
        320x320 a 152px menu covered "Read the privacy policy", which sits
        132px down, well above Accept. The binding constraint was the control
        nobody thought to measure, and the gate is what said so.

        So the floor is 120px, ending 12px clear of that link, and it shows
        two rows rather than three. Two is what the screen has room for once
        the banner has been answered honestly; the menu scrolls, so all seven
        stay reachable. Where there is room the subtraction still wins and
        nothing changes.
      */}
      {/*
        AnimatePresence rather than a bare `{isMobileMenuOpen && …}` so the
        menu leaves the way it arrived. It entered with `animate-in
        slide-in-from-top-4` and then vanished on close, unmounted mid-frame
        — a surface that tells a spatial story on the way in and teleports
        out reads as broken in a way people cannot name. motion/react holds
        it mounted through the exit and plays the same path in reverse. The
        `origin-top-right` class stays: the scale grows from and collapses
        toward the trigger's corner. The drawer curve is the one Modal's
        panel is closest to; reduced motion is App.tsx's MotionConfig, which
        also replaces the CSS `animate-in` this dropped — the one Tailwind
        animation the reduced-motion block in index.css was neutralising by
        hand.
      */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <m.div
            ref={menuRef}
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="lg:hidden absolute top-20 right-4 w-56 sm:w-64 max-h-[max(7.5rem,calc(100vh-6rem-var(--fixed-bar-space,0px)))] overflow-y-auto bg-[#020617]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-4 px-5 flex flex-col gap-3 text-sm font-medium origin-top-right scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => handleScrollToSection(item.id)}
              className={`text-left py-3 px-3 rounded-lg hover:bg-white/5 hover:text-cyan-400 active:text-cyan-400 active:scale-95 transition-all ${activeSection === item.id ? "text-cyan-400 bg-white/5" : "text-slate-200"}`}
            >
              {item.label}
            </button>
          ))}
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
