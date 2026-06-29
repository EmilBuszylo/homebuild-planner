import { describe, expect, it } from "vitest";

import {
  deletePlanStageNoteQuerySchema,
  upsertPlanStageNoteSchema,
} from "@/lib/validations/plan-stage-note";

describe("upsertPlanStageNoteSchema", () => {
  it("accepts a valid payload", () => {
    const result = upsertPlanStageNoteSchema.safeParse({
      stageSlug: "foundations",
      body: "Kontakt z wykonawcą",
      isPinned: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty stageSlug", () => {
    const result = upsertPlanStageNoteSchema.safeParse({
      stageSlug: "",
      body: "Notatka",
      isPinned: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects body longer than 2000 characters", () => {
    const result = upsertPlanStageNoteSchema.safeParse({
      stageSlug: "foundations",
      body: "x".repeat(2001),
      isPinned: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("deletePlanStageNoteQuerySchema", () => {
  it("accepts a valid stageSlug query param", () => {
    const result = deletePlanStageNoteQuerySchema.safeParse({
      stageSlug: "foundations",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty stageSlug", () => {
    const result = deletePlanStageNoteQuerySchema.safeParse({
      stageSlug: "",
    });
    expect(result.success).toBe(false);
  });
});
