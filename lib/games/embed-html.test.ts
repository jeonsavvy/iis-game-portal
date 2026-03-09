import { describe, expect, it } from "vitest";

import { patchHtmlForEmbeddedViewport } from "./embed-html";

describe("patchHtmlForEmbeddedViewport", () => {
  it("injects embed fixes into plain html", () => {
    const result = patchHtmlForEmbeddedViewport("<!doctype html><html><head></head><body><main><canvas></canvas></main></body></html>");
    expect(result).toContain("iis-embed-viewport-fix");
    expect(result).toContain("iis-embed-viewport-script");
  });

  it("does not override the game's original document background color", () => {
    const result = patchHtmlForEmbeddedViewport("<!doctype html><html><head></head><body></body></html>");
    expect(result).not.toContain("background:#020617!important");
  });

  it("does not auto-dismiss start overlays during portal embed recovery", () => {
    const result = patchHtmlForEmbeddedViewport("<!doctype html><html><head></head><body></body></html>");
    expect(result).not.toContain("overlayText.includes('start')");
    expect(result).not.toContain("overlayText.includes('시작')");
  });

  it("is idempotent", () => {
    const once = patchHtmlForEmbeddedViewport("<!doctype html><html><head></head><body></body></html>");
    const twice = patchHtmlForEmbeddedViewport(once);
    expect(twice).toBe(once);
  });
});
