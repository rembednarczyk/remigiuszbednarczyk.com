import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MEASUREMENT_ID } from "../src/lib/analyticsTag";

/**
 * The document a visitor receives before any script of ours has run.
 *
 * Consent Mode kept cookies unwritten, so this looked handled. It was not:
 * `<script async src="…googletagmanager.com…">` sat in the head and the
 * request went out on every visit, before the banner had been answered,
 * carrying the visitor's address, user agent and referring page. A
 * `<link rel="preconnect">` above it opened the connection sooner still.
 *
 * The privacy policy this site serves states that no measurement data is
 * collected until the banner is accepted. This holds the document to that
 * sentence, which is the kind of claim nothing else would report on.
 */

const root = resolve(__dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

const THIRD_PARTY_ANALYTICS = /googletagmanager\.com|google-analytics\.com/;

describe("what the document reaches for on its own", () => {
  it("loads no analytics script", () => {
    const scripts = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map(
      (m) => m[1],
    );

    expect(
      scripts.filter((src) => THIRD_PARTY_ANALYTICS.test(src)),
      "index.html requests the analytics tag before the visitor has answered the banner",
    ).toEqual([]);
  });

  it("opens no connection to the analytics host either", () => {
    // preconnect and dns-prefetch both reach out before consent, and a TLS
    // handshake is as much a disclosure of the visit as the script request.
    const hints = [...html.matchAll(/<link[^>]*rel=["'](preconnect|dns-prefetch)["'][^>]*>/g)].map(
      (m) => m[0],
    );

    expect(
      hints.filter((tag) => THIRD_PARTY_ANALYTICS.test(tag)),
      "index.html opens a connection to the analytics host before consent",
    ).toEqual([]);
  });

  it("names the analytics host nowhere but in a comment, whatever the shape of the reach", () => {
    // The two checks above hold a `<script src>` and a resource hint. The
    // bughunt built the tag a third way — an inline
    // `document.createElement('script')` with the same src, before the
    // consent defaults — and both stayed green while the document reached
    // for the host on every visit. So the whole document is held, comments
    // aside: the one legitimate mention of the host is the sentence saying
    // why it is not here.
    const withoutHtmlComments = html.replace(/<!--[\s\S]*?-->/g, "");

    expect(
      withoutHtmlComments,
      "index.html names the analytics host outside a comment, so something in it can reach for the tag before consent",
    ).not.toMatch(THIRD_PARTY_ANALYTICS);
  });

  it("still queues the consent defaults, which have to run first", () => {
    // Removing the tag must not remove the denial that governs it once the
    // visitor accepts and the tag finally loads.
    expect(html).toMatch(/gtag\(\s*['"]consent['"]\s*,\s*['"]default['"]/);
    expect(html).toContain("analytics_storage: 'denied'");
  });

  it("configures the property the loader fetches", () => {
    // Two places name the measurement id. If they disagree, the tag loads
    // for one property and reports to another.
    expect(html).toContain(`gtag('config', '${MEASUREMENT_ID}')`);
  });

  it("re-applies a stored opt-in before anything is sent", () => {
    expect(html).toMatch(/localStorage\.getItem\(['"]cookie-consent['"]\)/);
    expect(html).toMatch(/analytics_storage:\s*['"]granted['"]/);
  });
});
