import { useCallback, useRef } from "react";
import { m } from "motion/react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useContactForm } from "../../hooks/useContactForm";

export interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Shared by every field, so the three inputs cannot drift apart. */
const FIELD_CLASSES =
  "w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus-ring-always transition-all";

/**
 * The dialog. It renders the form and the outcome and owns nothing else:
 * keyboard and focus behaviour is useModalA11y, the submission state machine
 * is useContactForm, and the request itself is lib/contactForm.
 */
export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  const { status, failure, submit, reset } = useContactForm({ onSent: onClose });

  /**
   * Closing ends the attempt.
   *
   * A submission still in flight used to leave the dialog spinning, and
   * closing and reopening showed the same spinner because nothing reset.
   * Every way out has to go through here: Escape, the backdrop, and the X.
   */
  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Send a Message"
      closeLabel="Close modal"
      initialFocusRef={firstInputRef}
    >
      {status === "success" ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-8 text-center"
        >
          {/*
            Sending a message is the rarest, highest-emotion moment the site
            has, and the one place a beat of delight is earned rather than
            indulgent. The check springs in from 0.8 so the confirmation
            lands as an arrival, not a swap; the copy is held back a beat so
            the eye reaches the mark first. Reduced motion is not handled
            here — MotionConfig reducedMotion="user" in App.tsx switches the
            transform off for the whole tree, the same reason Reveal does not
            repeat it. The wrapper is content-width under the parent's
            items-center, so it stays centred.
          */}
          <m.div
            className="mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
          >
            <CheckCircle2 className="w-16 h-16 text-emerald-400" aria-hidden="true" />
          </m.div>
          <m.h3
            className="text-xl font-bold text-white mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            Message Sent!
          </m.h3>
          <m.p
            className="text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            Thank you for reaching out. I&apos;ll get back to you soon.
          </m.p>
        </m.div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Honeypot for bot protection */}
          <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Name</label>
            <input
              ref={firstInputRef}
              type="text"
              id="name"
              name="name"
              required
              className={FIELD_CLASSES}
              placeholder="Your name"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className={FIELD_CLASSES}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-1">Message</label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              className={`${FIELD_CLASSES} resize-none`}
              placeholder="Let’s talk testing"
            />
          </div>

          {status === "error" && (
            <p className="text-red-400 text-sm" role="alert">
              {failure === "unreachable"
                ? "Could not reach the form service. Check your connection and try again."
                : "The message was not accepted. Please try again later, or reach me on LinkedIn."}
            </p>
          )}

          {/*
            The loading state goes through the shell's `isLoading` rather
            than being written out here. Written out here, it replaced the
            children with a bare spinner, so from the moment the visitor
            pressed Send until the request answered, the control they had
            just used had no accessible name at all — axe reports
            button-name, and a screen reader announces "button, dimmed".

            The shell renders its spinner beside the children and sets
            aria-busy, so the name survives and the state is announced.
            "Sending…" rather than "Send Message" because the button is
            reporting what is happening, not offering to do it again.
          */}
          <Button
            type="submit"
            className="w-full py-6 text-lg mt-2"
            isLoading={status === "loading"}
          >
            {status === "loading" ? (
              "Sending…"
            ) : (
              <>
                <Mail className="w-5 h-5 mr-2" aria-hidden="true" />
                Send Message
              </>
            )}
          </Button>
        </form>
      )}
    </Modal>
  );
}
