import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppPageShell } from "@/components/app/app-page-shell";
import { OrientationalDisclaimer } from "@/components/app/orientational-disclaimer";
import { PlanSummaryStrip } from "@/components/app/plan-summary-strip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlanCostTable } from "@/components/plan/plan-cost-table";
import { PlanTimeline } from "@/components/plan/plan-timeline";
import { PAGE_METADATA } from "@/lib/copy/site";
import { fetchPlanResults } from "@/lib/api/fetch-plan-results";
import { isGoogleCalendarConnected } from "@/lib/google-calendar/google-oauth";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: PAGE_METADATA.plan.title,
  description: PAGE_METADATA.plan.description,
};

interface PlanPageProps {
  params: Promise<{ planId: string }>;
}

function PlanPageError({
  message,
}: {
  message: string;
}) {
  return (
    <AppPageShell paddingY="loose">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Twój plan budowy
          </h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href={routes.dashboard}>Wróć do panelu</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.questionnaire}>Ankieta</Link>
          </Button>
        </div>
      </div>
    </AppPageShell>
  );
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
      <PlanPageError message="Nie znaleziono planu lub brak wyników do wyświetlenia." />
    );
  }

  if (result.status === "error") {
    return (
      <PlanPageError message="Nie udało się wczytać wyników planu. Spróbuj ponownie później." />
    );
  }

  const googleCalendarConnected = await isGoogleCalendarConnected(user.id);

  return (
    <AppPageShell paddingY="loose" className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Twój plan budowy
          </h1>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={routes.questionnaire}>Edytuj odpowiedzi</Link>
        </Button>
      </header>

      <div className="space-y-4">
        <PlanSummaryStrip results={result.data} />
        <OrientationalDisclaimer />
      </div>

      <Separator />

      <div className="flex flex-col gap-8">
        <PlanCostTable results={result.data} />
        <PlanTimeline
          results={result.data}
          googleCalendarConnected={googleCalendarConnected}
        />
      </div>
    </AppPageShell>
  );
}
