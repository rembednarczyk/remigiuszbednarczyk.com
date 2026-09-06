import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  readStoredConsent,
  useCookieConsent,
} from "./useCookieConsent";
import { TAG_ELEMENT_ID } from "../lib/analyticsTag";

/**
 * The one part of this site with a legal obligation behind it. Analytics
 * must stay denied until someone says otherwise, the choice must survive a
 * reload, and withdrawing it has to work as reliably as giving it.
 */

const gtag = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("gtag", gtag);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // Any test that accepts now puts the analytics tag in the document, and
  // jsdom keeps it between tests.
  document.getElementById(TAG_ELEMENT_ID)?.remove();
});

/** Makes every localStorage method throw, as a locked-down browser does. */
function blockSiteData() {
  const boom = () => {
    throw new DOMException("denied", "SecurityError");
  };
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(boom);
}

describe("readStoredConsent", () => {
  it.each([
    ["granted", "granted"],
    ["denied", "denied"],
  ])("returns a stored %s", (stored, expected) => {
    localStorage.setItem(CONSENT_STORAGE_KEY, stored);
    expect(readStoredConsent()).toBe(expected);
  });

  it.each([
    ["nothing stored", null],
    ["a value from an older version", "yes"],
    ["an empty string", ""],
    ["something that only looks close", "Granted"],
  ])("treats %s as no choice yet", (_case, stored) => {
    if (stored !== null) localStorage.setItem(CONSENT_STORAGE_KEY, stored);
    expect(readStoredConsent()).toBe("unset");
  });

  it("reports no choice when the browser refuses site data", () => {
    // Throwing here would take the first render down with it.
    blockSiteData();
    expect(readStoredConsent()).toBe("unset");
  });
});

describe("useCookieConsent", () => {
  it("starts with no choice, so the banner is shown", () => {
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBe("unset");
  });

  it("starts from the stored choice, so the banner is not shown again", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    const { result } = renderHook(() => useCookieConsent());
    expect(result.current.consent).toBe("granted");
  });

  it("starts denied in the editor's preview, whatever the owner chose on the site", () => {
    // The preview is this page at its own origin; a mirror of an unsaved edit
    // is not a visit, so nothing is asked and no tag is loaded there.
    localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    window.history.pushState({}, "", "/preview");
    try {
      const { result } = renderHook(() => useCookieConsent());
      expect(result.current.consent).toBe("denied");
      expect(document.getElementById(TAG_ELEMENT_ID)).toBeNull();
    } finally {
      window.history.pushState({}, "", "/");
    }
  });

  it("grants analytics storage and remembers it", () => {
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.accept());

    expect(result.current.consent).toBe("granted");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
    });
  });

  it("records a refusal rather than leaving it unanswered", () => {
    // A stored "denied" is what stops the banner coming back on every visit.
    const { result } = renderHook(() => useCookieConsent());
    act(() => result.current.decline());

    expect(result.current.consent).toBe("denied");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBe("denied");
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "denied",
    });
  });

  it("withdraws consent as thoroughly as it was given", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "granted");
    const { result } = renderHook(() => useCookieConsent());

    act(() => result.current.reset());

    expect(result.current.consent).toBe("unset");
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    // Clearing the record is not enough on its own: the tag is still running
    // with storage granted until it is told otherwise.
    expect(gtag).toHaveBeenLastCalledWith("consent", "update", {
      analytics_storage: "denied",
    });
  });

  it("applies a choice for this visit even when it cannot be stored", () => {
    blockSiteData();
    const { result } = renderHook(() => useCookieConsent());

    act(() => result.current.accept());

    expect(result.current.consent).toBe("granted");
    expect(gtag).toHaveBeenCalledWith("consent", "update", {
      analytics_storage: "granted",
    });
  });

  it("works on a page where the tag never loaded", () => {
    // An ad blocker removes gtag entirely. The banner still has to respond.
    vi.stubGlobal("gtag", undefined);
    const { result } = renderHook(() => useCookieConsent());

    expect(() => act(() => result.current.accept())).not.toThrow();
    expect(result.current.consent).toBe("granted");
  });

  it("keeps its callbacks stable across renders", () => {
    const { result, rerender } = renderHook(() => useCookieConsent());
    const first = result.current;

    rerender();

    expect(result.current.accept).toBe(first.accept);
    expect(result.current.decline).toBe(first.decline);
    expect(result.current.reset).toBe(first.reset);
  });
});

/**
 * The request itself, not just the cookie.
 *
 * Consent Mode kept storage denied while index.html fetched the tag on
 * every visit anyway, which told Google the visitor's address and referring
 * page before the banner had been answered. The hook owns that request now,
 * so the hook is where it is held.
 */
describe("when the analytics tag is fetched", () => {
  const tagsInDocument = () =>
    document.querySelectorAll('script[src*="googletagmanager.com"]').length;

  it("asks for nothing while the visitor has not answered", () => {
    renderHook(() => useCookieConsent());

    expect(tagsInDocument()).toBe(0);
  });

  it("asks for nothing after a refusal", () => {
    const { result } = renderHook(() => useCookieConsent());

    act(() => result.current.decline());

    expect(tagsInDocument()).toBe(0);
  });

  it("loads it once the visitor accepts", () => {
    const { result } = renderHook(() => useCookieConsent());

    act(() => result.current.accept());

    expect(tagsInDocument()).toBe(1);
  });

  it("loads it for a visitor who accepted on an earlier visit", () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "granted");

    renderHook(() => useCookieConsent());

    expect(tagsInDocument()).toBe(1);
  });

  it("does not load a second copy when the choice is re-made", () => {
    const { result } = renderHook(() => useCookieConsent());

    act(() => result.current.accept());
    act(() => result.current.reset());
    act(() => result.current.accept());

    expect(tagsInDocument()).toBe(1);
  });
});
