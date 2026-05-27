import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";

import { PlanCostTable } from "@/components/plan/plan-cost-table";
import { PlanTimeline } from "@/components/plan/plan-timeline";
import { fetchPlanResults } from "@/lib/api/fetch-plan-results";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

interface PlanPageProps {
  params: Promise<{ planId: string }>;
}

export default async function PlanPage({ params }: PlanPageProps) {
  const { planId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login);
  }

  const result = await fetchPlanResults(planId);

  if (result.status === "unauthorized") {
    redirect(routes.login);
  }

  if (result.status === "not_found") {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Twój plan budowy</h1>
        <p className="text-muted-foreground">Nie znaleziono planu.</p>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Twój plan budowy</h1>
        <p className="text-muted-foreground">
          Nie udało się wczytać wyników planu. Spróbuj ponownie później.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-4xl flex-col gap-8 p-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Twój plan budowy</h1>
          <p className="text-muted-foreground">
            Orientacyjny kosztorys i harmonogram na podstawie Twoich odpowiedzi
            w ankiecie.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={routes.questionnaire}>Edytuj odpowiedzi</Link>
        </Button>
      </header>

      <PlanCostTable results={result.data} />
      <PlanTimeline results={result.data} />
    </div>
  );
}
