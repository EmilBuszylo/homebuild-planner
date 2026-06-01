import { ORIENTATIONAL_DISCLAIMER_PARAGRAPH } from "@/lib/copy/orientational";

export function OrientationalDisclaimer() {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground">
      {ORIENTATIONAL_DISCLAIMER_PARAGRAPH}
    </p>
  );
}
