import {
  CalendarRange,
  Layers,
  Library,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Benefit = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const benefits: Benefit[] = [
  {
    icon: Layers,
    title: "Koszty na etapy",
    description:
      "Orientacyjny podział wydatków według etapów budowy — łatwiej planujesz budżet i widzisz, co jest przed Tobą.",
  },
  {
    icon: CalendarRange,
    title: "Harmonogram z zależnościami",
    description:
      "Timeline uwzględnia kolejność prac i etapy już ukończone — mniej ryzyka błędów w organizacji budowy.",
  },
  {
    icon: Library,
    title: "Lokalna baza wiedzy",
    description:
      "Wyceny oparte na sprawdzonej bazie etapów i widełek kosztowych, dopasowanej do odpowiedzi z ankiety.",
  },
  {
    icon: Sparkles,
    title: "Szybki start",
    description:
      "Załóż konto, wypełnij ankietę i zobacz wynik — bez zobowiązań i bez formalnej oferty wykonawcy.",
  },
];

export function LandingBenefits() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Co zyskujesz
          </h2>
          <p className="mt-3 text-muted-foreground">
            Narzędzie dla inwestora indywidualnego budującego dom w trybie
            gospodarczym — konkretna mapa kosztów i kolejności działań.
          </p>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <li key={benefit.title}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </div>
                    <CardTitle>{benefit.title}</CardTitle>
                    <CardDescription>{benefit.description}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
