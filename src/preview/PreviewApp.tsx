import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Portfolio } from "../App";
import { buildContent, ContentProvider, STATIC_CONTENT, type SiteContent } from "../data/content";
import { cardFor, editOf, pickAt } from "./edit";
import { PreviewBoundary } from "./PreviewBoundary";
import {
  allowedEditorOrigins,
  type Box,
  isContentMessage,
  isHighlightMessage,
  isScrollMessage,
  looksLikeContent,
  originAllowed,
} from "./protocol";

/**
 * The site's own page, drawn from content handed to it live.
 *
 * This is the whole of the preview seam on the site's side. It renders the
 * real `Portfolio` — the same components, so what it shows is what deploys —
 * inside a content provider it can change. The editor posts edited content
 * over `postMessage`; each message rebuilds the page through the site's own
 * transforms and the page redraws. Back the other way go the section
 * geometries, so the editor can scroll the preview to the file being edited.
 *
 * And a click goes back too: every card the page draws from an entry says
 * which entry (src/preview/edit.ts), so a click on the third job tells the
 * editor to open `jobs[2]`, and a click in a band with no such card names the
 * band. The editor answers in kind — which entry has the cursor — and that
 * card is outlined and brought into view, so the two panes point at the same
 * thing from either side.
 *
 * It opens showing the build's own content, so an editor that has not sent
 * anything yet — or is not there at all — still sees the real page rather than
 * a blank frame. Nothing here can write: it is a mirror, and the only road to
 * the repository stays the editor's token-holding server.
 */
export function PreviewApp() {
  const [content, setContent] = useState<SiteContent>(() => STATIC_CONTENT);
  // Who to answer with geometry: the window and origin of the last editor
  // message that passed the origin check.
  const editor = useRef<{ window: Window; origin: string } | null>(null);
  // The `data-edit` value of the entry the editor says has the cursor, or
  // null for none. State rather than a ref: the page redraws on every edit,
  // and the outline has to land on the card that draws the entry after each.
  const [editing, setEditing] = useState<string | null>(null);
  // The last content that drew without throwing, to go back to when one does
  // not; and which mount of the boundary is on the page, bumped to give the
  // next edit a fresh one. `failed` is set by the boundary in the commit
  // that showed nothing, before this component's own effects run in that
  // same commit, so the effect below can tell a drawn page from a caught one.
  const lastGood = useRef<SiteContent>(STATIC_CONTENT);
  const failed = useRef(false);
  const [attempt, setAttempt] = useState(0);

  /** Tell the editor the content could not become a page, in its words. */
  function report(error: unknown): void {
    const target = editor.current;
    if (target === null) return;
    target.window.postMessage(
      { type: "preview:error", message: error instanceof Error ? error.message : String(error) },
      target.origin,
    );
  }

  /** A render threw: say so, go back to the last page that drew, start over. */
  function recover(error: Error): void {
    failed.current = true;
    report(error);
    setContent(lastGood.current);
    setAttempt((count) => count + 1);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!originAllowed(event.origin)) {
        // The one failure that looks like nothing: an editor posting content
        // from an origin this build was not told to trust. The message is
        // still dropped — the origin check is the security boundary — but it
        // is no longer dropped in silence, so an owner whose preview never
        // moves can see why in the frame's console.
        if (looksLikeContent(event.data)) {
          // Worded to avoid a bare `from "…"`, which the dependency gate reads
          // as an import specifier — the fragility README's dependency entry
          // records.
          console.warn(
            `[preview] ignored an edit posted by ${event.origin} — it is not an allowed editor ` +
              `origin. Set VITE_PREVIEW_EDITOR_ORIGIN to this exact origin at build time and ` +
              `redeploy. Currently allowed: ${allowedEditorOrigins().join(", ")}`,
          );
        }
        return;
      }

      // A file opened in the editor: walk the page to that band, the same
      // anchor the site's own navigation scrolls to. Gated by the origin check
      // above, like content. An id that is on no page scrolls nowhere.
      if (isScrollMessage(event.data)) {
        const target = document.getElementById(event.data.id);
        if (target !== null && typeof target.scrollIntoView === "function") {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      if (isHighlightMessage(event.data)) {
        const { file, where } = event.data;
        setEditing(file === null ? null : editOf({ file, where }));
        return;
      }

      if (!isContentMessage(event.data)) return;

      if (event.source !== null) {
        editor.current = { window: event.source as Window, origin: event.origin };
      }

      try {
        setContent(buildContent(event.data.content));
      } catch (error) {
        report(error);
      }
    }

    window.addEventListener("message", onMessage);
    // Announce readiness to whoever embedded us. The message carries nothing,
    // so "*" is safe; content and geometry only ever go to a checked origin.
    if (window.parent !== window) {
      window.parent.postMessage({ type: "preview:ready" }, "*");
    }

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // After the page has drawn the new content, hand the editor the geometry —
  // and remember the content as one that draws. A commit in which the
  // boundary caught a throw drew nothing, so it is neither.
  useLayoutEffect(() => {
    if (failed.current) {
      failed.current = false;
      return;
    }
    lastGood.current = content;
    postGeometry(editor.current, content);
  }, [content]);

  // A click lands in the editor. Only once an editor has spoken — a preview
  // opened in its own tab is the page, and its links should work as links.
  // With an editor, a link inside a card is a click on the card: the mirror
  // must not walk off to another site, and "Open in a tab" is there for that.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = editor.current;
      if (target === null || !(event.target instanceof Element)) return;

      const pick = pickAt(event.target);
      if (pick === null) return;

      if (event.target.closest("a[href]") !== null) event.preventDefault();
      target.window.postMessage(pick, target.origin);
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  // Mark the card the editor is on, after every draw: the outline is an
  // attribute on the card, and the card is redrawn on every edit.
  useLayoutEffect(() => {
    for (const marked of document.querySelectorAll("[data-editing]")) {
      marked.removeAttribute("data-editing");
    }
    if (editing !== null) cardFor(document, editing)?.setAttribute("data-editing", "");
  }, [content, editing]);

  // And bring it into view when it changes — not on every keystroke, which
  // would fight a page the owner is scrolling through.
  useEffect(() => {
    const card = editing === null ? null : cardFor(document, editing);
    if (card !== null && typeof card.scrollIntoView === "function") {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [editing]);

  // And whenever the page moves under a fixed content — a scroll, a resize —
  // so the editor's map stays true. Coalesced to one send per frame.
  useEffect(() => {
    let frame = 0;
    const send = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        postGeometry(editor.current, content);
      });
    };

    window.addEventListener("resize", send);
    window.addEventListener("scroll", send, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", send);
      window.removeEventListener("scroll", send);
    };
  }, [content]);

  return (
    <ContentProvider value={content}>
      <PreviewBoundary key={attempt} onFail={recover}>
        <Portfolio />
      </PreviewBoundary>
    </ContentProvider>
  );
}

/** Post the page's section boxes to the editor, if one has spoken to us. */
function postGeometry(
  target: { window: Window; origin: string } | null,
  content: SiteContent,
): void {
  if (target === null) return;

  const boxes: Record<string, Box> = {};

  for (const section of content.pageLayout.sections) {
    const id = (section as { id?: unknown }).id;
    if (typeof id !== "string") continue;

    const element = document.getElementById(id);
    if (element === null) continue;

    const rect = element.getBoundingClientRect();
    boxes[id] = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    };
  }

  target.window.postMessage({ type: "preview:geometry", boxes }, target.origin);
}
