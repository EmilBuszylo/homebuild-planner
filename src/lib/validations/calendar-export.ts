import { z } from "zod";

export const calendarExportSchema = z.object({
  stageSlugs: z
    .array(z.string().min(1, "Identyfikator etapu jest wymagany"))
    .optional(),
});

export type CalendarExportInput = z.infer<typeof calendarExportSchema>;
