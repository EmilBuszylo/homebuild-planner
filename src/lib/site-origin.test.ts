import { afterEach, describe, expect, it, vi } from "vitest";

import { getSiteOrigin } from "@/lib/site-origin";

describe("getSiteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://homebuild-planner.vercel.app/");

    expect(getSiteOrigin()).toBe("https://homebuild-planner.vercel.app");
  });

  it("falls back to localhost when NEXT_PUBLIC_SITE_URL is unset", () => {
    expect(getSiteOrigin()).toBe("http://localhost:3000");
  });
});
