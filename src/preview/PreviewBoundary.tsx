import { Component, type ReactNode } from "react";

/**
 * The catch between an edit that throws in the render and a preview that
 * goes blank until it is reloaded.
 *
 * `buildContent` refuses what it can see — a name the page has no shape
 * for — and the preview reports that. What it cannot see is a value the
 * page trips over while drawing: the bughunt proved a `null` where a list
 * should be reaches the root error boundary in main.tsx, which unmounts the
 * whole preview, its message listener with it, and the editor is left
 * posting into silence with nothing to say why. So the page is drawn inside
 * this boundary, which hands the error up instead of showing anything: the
 * preview reports it to the editor, goes back to the last content that drew,
 * and mounts a fresh boundary for the next edit.
 */
export class PreviewBoundary extends Component<
  { children: ReactNode; onFail: (error: Error) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    this.props.onFail(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
