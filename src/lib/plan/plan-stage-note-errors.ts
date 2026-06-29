export class InvalidStageSlugError extends Error {
  constructor(stageSlug: string) {
    super(`Invalid stage slug: ${stageSlug}`);
    this.name = "InvalidStageSlugError";
  }
}

export class EmptyUnpinnedNoteError extends Error {
  constructor() {
    super("Empty unpinned note");
    this.name = "EmptyUnpinnedNoteError";
  }
}
