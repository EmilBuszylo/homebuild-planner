import {
  ORIENTATIONAL_TRUST_BULLETS,
  ORIENTATIONAL_TRUST_HEADING,
} from "@/lib/copy/orientational";

export function LandingTrust() {
  return (
    <section className="border-y bg-muted/50 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {ORIENTATIONAL_TRUST_HEADING}
        </h2>
        <ul className="mt-6 max-w-3xl list-disc space-y-3 pl-5 text-muted-foreground">
          {ORIENTATIONAL_TRUST_BULLETS.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
