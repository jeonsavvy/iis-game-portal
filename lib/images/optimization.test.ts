import { afterEach, describe, expect, it } from "vitest";

import { shouldUseUnoptimizedImage } from "./optimization";

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

describe("shouldUseUnoptimizedImage", () => {
  afterEach(() => {
    if (ORIGINAL_SUPABASE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      return;
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL;
  });

  it("returns false for Supabase storage host", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo-project.supabase.co";
    expect(shouldUseUnoptimizedImage("https://demo-project.supabase.co/storage/v1/object/public/games/a.png")).toBe(false);
  });

  it("returns false for known optimized host", () => {
    expect(shouldUseUnoptimizedImage("https://images.unsplash.com/photo-123")).toBe(false);
  });

  it("returns true for non-allowlisted host", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo-project.supabase.co";
    expect(shouldUseUnoptimizedImage("https://cdn.example.com/image.webp")).toBe(true);
  });

  it("returns true for local relative assets", () => {
    expect(shouldUseUnoptimizedImage("/assets/preview/neon-drift.svg")).toBe(true);
  });

  it("returns false for local raster assets", () => {
    expect(shouldUseUnoptimizedImage("/assets/preview/neon-drift.webp")).toBe(false);
  });

  it("returns true for data uri", () => {
    expect(shouldUseUnoptimizedImage("data:image/png;base64,abc")).toBe(true);
  });
});
