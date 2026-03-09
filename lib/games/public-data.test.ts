import { describe, expect, it } from "vitest";

import { hasLiveCatalogImage } from "@/lib/games/public-data";

describe("hasLiveCatalogImage", () => {
  it("accepts absolute canonical images", () => {
    expect(
      hasLiveCatalogImage({
        thumbnail_url: "https://cdn.example.com/games/lowpoly-siege/canonical.png",
        hero_image_url: null,
        screenshot_url: null,
      } as never),
    ).toBe(true);
  });

  it("rejects relative placeholder assets for live catalog rows", () => {
    expect(
      hasLiveCatalogImage({
        thumbnail_url: "/assets/preview/timebreakers.svg",
        hero_image_url: null,
        screenshot_url: null,
      } as never),
    ).toBe(false);
  });

  it("rejects absolute preview placeholder assets for live catalog rows", () => {
    expect(
      hasLiveCatalogImage({
        thumbnail_url: "https://arcade.example.com/assets/preview-raster/timebreakers.png",
        hero_image_url: null,
        screenshot_url: null,
      } as never),
    ).toBe(false);
  });
});
