import { describe, expect, it } from "vitest";

import { calendarExportSchema } from "@/lib/validations/calendar-export";

describe("calendarExportSchema", () => {
  it("accepts empty body (export all stages)", () => {
    const result = calendarExportSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a list of stage slugs", () => {
    const result = calendarExportSchema.safeParse({
      stageSlugs: ["foundations", "roofing"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty slug in array", () => {
    const result = calendarExportSchema.safeParse({
      stageSlugs: ["foundations", ""],
    });
    expect(result.success).toBe(false);
  });
});
