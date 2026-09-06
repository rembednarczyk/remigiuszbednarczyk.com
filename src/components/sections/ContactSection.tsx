import { useState } from "react";
import { Mail, Download } from "lucide-react";
import { LinkedinIcon, GithubIcon } from "../ui/BrandIcon";
import { ContactModal } from "../ui/ContactModal";
import { Reveal } from "../ui/Reveal";
import { numbered } from "../../lib/pageLayout";
import pageLayout from "../../content/pageLayout.json" with { type: "json" };

/**
 * The `contact` band, which renders its own element.
 *
 * It is not one of the numbered run and takes no heading or anchor — it
 * never had one, and giving it one to match the others would put words on
 * the page nobody asked for. Whether it appears, and where, is
 * src/content/pageLayout.json.
 *
 * Its teaser wears the number after the numbered run — the informal next
 * step past the ten. That number is derived from the layout, not typed:
 * a hand-typed `11.` is exactly the drift `numbered()` exists to end, and
 * the bughunt found it here after the rest of the page had been freed of it.
 * Add or remove a titled band and this follows, the same way the run does.
 *
 * src/components/PageBodies.tsx is what maps the name to this component.
 */
export function ContactSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const numberedCount = numbered(pageLayout.sections).filter(
    ({ number }) => number !== "",
  ).length;
  const nextNumber = String(numberedCount + 1).padStart(2, "0");

  return (
    <section
      id="contact"
      className="pt-32 pb-16 text-center max-w-2xl mx-auto flex flex-col items-center"
    >
      <Reveal className="w-full">
        <p className="text-cyan-400 font-mono mb-4 text-lg">
          {nextNumber}. What&apos;s next?
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Get In Touch
        </h2>
        <p className="text-slate-400 mb-10 leading-relaxed text-lg">
          Whether you have a question, want to discuss a project, 
          or just want to say hi - my inbox is always open.
        </p>
        
        <div className="flex flex-col items-center justify-center gap-8 mb-16">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 active:from-cyan-400 active:to-purple-400 active:scale-95 text-white font-bold rounded-lg transition-all shadow-lg shadow-cyan-500/20 w-full sm:w-auto focus-ring"
          >
            <Mail aria-hidden="true" size={20} />
            Say Hello
          </button>

          <div className="flex flex-col items-center gap-4 print:hidden">
            <p className="text-sm text-slate-400 font-medium">Prefer to keep a copy of my experience?</p>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white active:scale-95 font-semibold rounded-lg transition-all w-full sm:w-auto focus-ring"
            >
              <Download aria-hidden="true" size={18} />
              Save as PDF
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-6 mb-16">
          <a
            href="https://linkedin.com/in/rembednarczyk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="text-slate-400 hover:text-cyan-400 active:text-cyan-400 active:scale-90 active:bg-white/5 transition-all p-2 hover:bg-white/5 rounded-full focus-ring"
          >
            <LinkedinIcon aria-hidden="true" size={28} />
          </a>
          <a
            href="https://github.com/rembednarczyk"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="text-slate-400 hover:text-cyan-400 active:text-cyan-400 active:scale-90 active:bg-white/5 transition-all p-2 hover:bg-white/5 rounded-full focus-ring"
          >
            <GithubIcon aria-hidden="true" size={28} />
          </a>
        </div>
      </Reveal>
      
      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </section>
  );
}
