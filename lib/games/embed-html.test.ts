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

  it("repairs legacy published three namespace shims for core utilities", () => {
    const result = patchHtmlForEmbeddedViewport(
      "<!doctype html><html><head></head><body><script>camera.fov=window.__iis_addon_shims.MathUtils.lerp(camera.fov,58,0.5);</script></body></html>",
    );
    expect(result).toContain("THREE.MathUtils.lerp");
    expect(result).not.toContain("window.__iis_addon_shims.MathUtils");
  });

  it("is idempotent", () => {
    const once = patchHtmlForEmbeddedViewport("<!doctype html><html><head></head><body></body></html>");
    const twice = patchHtmlForEmbeddedViewport(once);
    expect(twice).toBe(once);
  });
});
