import type { RawContent } from "../data/content";

/**
 * The wire between the editor and this preview, kept apart from the component
 * so its two decisions can be tested without a DOM: whose messages are
 * listened to, and what counts as a content message.
 *
 * The preview renders unsaved content and answers with the page's geometry.
 * Neither should be reachable by a page the owner did not open, so every
 * message is dropped unless its origin is one the editor is served from. The
 * deployed editor's origin is configured at build (`VITE_PREVIEW_EDITOR_ORIGIN`,
 * comma-separated for more than one); localhost is allowed in a development
 * build only, for developing the two together. This is the same suspicion the editor already aims the other way,
 * treating the site it fetches as untrusted.
 */

/** The path the editor embeds. Served by the SPA's 404 fallback, like every
 *  other client route this site has. */
export const PREVIEW_PATH = "/preview";

/**
 * A comma-separated list of origins, each reduced to a bare origin.
 *
 * `event.origin` is always a bare origin — scheme, host, port, no path, no
 * trailing slash — so an allowed entry has to be one too, and the common way
 * to set `VITE_PREVIEW_EDITOR_ORIGIN` wrong is to paste the editor's URL with
 * the trailing slash a browser shows. `https://x.onrender.com/` never equals
 * `https://x.onrender.com`, so the match failed silently and the preview
 * ignored every edit. `new URL(value).origin` normalises both away; a value
 * too malformed to parse is dropped rather than crashing the module that every
 * preview message passes through.
 */
export function normalizeOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .flatMap((value) => {
      try {
        return [new URL(value).origin];
      } catch {
        return [];
      }
    });
}

/** Where the editor is served from while the two are developed together. */
const LOCAL_EDITOR_ORIGINS = ["http://localhost:3001", "http://localhost:5173"];

/**
 * The origins an editor may post from: the configured list, and in a
 * development build the local ones too.
 *
 * The local origins used to be in every build, the deployed one included,
 * so any page a developer's machine happened to serve on one of those ports
 * could post content into the live preview at the site's own origin. The
 * site holds no cookie or secret and React refuses a `javascript:` address,
 * so what that bought was bounded — measured in the security sweep — but an
 * allowlist with a hole in it is not an allowlist. A built site driven from
 * a local editor names the local origin in `VITE_PREVIEW_EDITOR_ORIGIN` at
 * build time instead, which is what the variable is for.
 */
export function editorOrigins(configured: string | undefined, development: boolean): string[] {
  const origins = normalizeOrigins(configured);
  return development ? [...origins, ...LOCAL_EDITOR_ORIGINS] : origins;
}

const ALLOWED_EDITOR_ORIGINS: readonly string[] = editorOrigins(
  (import.meta.env as Record<string, string | undefined>)["VITE_PREVIEW_EDITOR_ORIGIN"],
  import.meta.env.DEV,
);

/** The origins the preview will take content from — for a diagnostic message
 *  when it drops one it does not know. */
export function allowedEditorOrigins(): readonly string[] {
  return ALLOWED_EDITOR_ORIGINS;
}

export function originAllowed(origin: string): boolean {
  return ALLOWED_EDITOR_ORIGINS.includes(origin);
}

/**
 * Whether a message is shaped like content, without checking whose it is.
 *
 * `isContentMessage` answers "should this be rendered", which requires both a
 * trusted origin and every document present. This answers the narrower "did
 * someone try to send content", so a message that looks like an edit but
 * arrived from an origin the preview does not trust can be reported rather than
 * dropped in silence — the one failure that leaves an owner typing into a
 * preview that never moves.
 */
export function looksLikeContent(data: unknown): boolean {
  return typeof data === "object" && data !== null && (data as Record<string, unknown>)["type"] === "preview:content";
}

/**
 * Whether a message asks the preview to scroll a section into view.
 *
 * The editor sends this when a file is opened, carrying the id of the page
 * band that file feeds — the same anchor the site's own navigation scrolls to.
 * A shape check only, and gated by the origin check like content: only a page
 * the owner opened may move this one. An id that names no element on the page
 * scrolls nowhere, decided where the scroll happens rather than here.
 */
export function isScrollMessage(data: unknown): data is ScrollMessage {
  if (typeof data !== "object" || data === null) return false;

  const message = data as Record<string, unknown>;
  return message["type"] === "preview:scrollTo" && typeof message["id"] === "string" && message["id"] !== "";
}

/** The documents a whole page is built from — every key `buildContent` reads. */
const RAW_KEYS: readonly (keyof RawContent)[] = [
  "hero",
  "about",
  "thinking",
  "achievements",
  "recognition",
  "experience",
  "cv",
  "certifications",
  "expertise",
  "skills",
  "community",
  "keyProjects",
  "brandPresence",
  "certificationsSummary",
  "pageLayout",
];

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Editor → preview: render this content. */
export interface ContentMessage {
  type: "preview:content";
  content: RawContent;
}

/** Editor → preview: scroll this section into view. */
export interface ScrollMessage {
  type: "preview:scrollTo";
  id: string;
}

/**
 * Editor → preview: this entry has the cursor; light it. `file` null clears
 * the light. `where` is the entry as the editor names it, `projects[2]`, or
 * null for a file the page draws whole — the same two parts the cards'
 * `data-edit` attribute carries (src/preview/edit.ts).
 */
export interface HighlightMessage {
  type: "preview:highlight";
  file: string | null;
  where: string | null;
}

/**
 * Preview → editor: the owner clicked here. Either an entry, named the way
 * the highlight names one, or a section by the id the page renders for it —
 * the same id the scroll request takes — when the click landed in a band
 * whose cards carry no entry (the heading of one, a section drawn from code).
 */
export type PickMessage =
  | { type: "preview:pick"; file: string; where: string | null }
  | { type: "preview:pick"; id: string };

/**
 * Whether a message asks the preview to light an entry, or to clear the
 * light. Gated by the origin check like every other request the preview
 * takes: it changes what the page shows, if only by an outline.
 */
export function isHighlightMessage(data: unknown): data is HighlightMessage {
  if (typeof data !== "object" || data === null) return false;

  const message = data as Record<string, unknown>;
  if (message["type"] !== "preview:highlight") return false;

  const nullOrString = (value: unknown) => value === null || typeof value === "string";
  return nullOrString(message["file"]) && nullOrString(message["where"]);
}

/** Preview → editor: I am mounted and listening. */
export interface ReadyMessage {
  type: "preview:ready";
}

/** Preview → editor: where each section sits, so a field can be scrolled to. */
export interface GeometryMessage {
  type: "preview:geometry";
  boxes: Record<string, Box>;
}

/** Preview → editor: the content you sent could not be built into a page. */
export interface ErrorMessage {
  type: "preview:error";
  message: string;
}

/**
 * Whether a message is content to render.
 *
 * A shape check, not a full validation: it confirms the envelope and that
 * every document a page needs is present, and leaves the rest to
 * `buildContent`, which throws on content it cannot turn into a page (a tone
 * that is not one of the three, say) — caught by the preview and reported.
 */
export function isContentMessage(data: unknown): data is ContentMessage {
  if (typeof data !== "object" || data === null) return false;

  const message = data as Record<string, unknown>;
  if (message["type"] !== "preview:content") return false;

  const content = message["content"];
  if (typeof content !== "object" || content === null) return false;

  return RAW_KEYS.every((key) => key in content);
}
