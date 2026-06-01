import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppPageShell } from "@/components/app/app-page-shell";
import { PlanSnapshotCard } from "@/components/app/plan-snapshot-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORIENTATIONAL_TRUST_HEADING } from "@/lib/copy/orientational";
import { PAGE_METADATA } from "@/lib/copy/site";
import { fetchPlanResults } from "@/lib/api/fetch-plan-results";
import { formatPlDate } from "@/lib/format/date";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: PAGE_METADATA.dashboard.title,
  description: PAGE_METADATA.dashboard.description,
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect(routes.login);
  }

  const plan = await prisma.plan.findFirst({
    where: { userId: authUser.id },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const results =
    plan !== null ? await fetchPlanResults(plan.id) : null;

  return (
    <AppPageShell>
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {plan ? "Twój plan budowy" : "Witaj"}
          </h1>
          {authUser.email ? (
            <p className="text-sm text-muted-foreground">{authUser.email}</p>
          ) : null}
          {!plan ? (
            <p className="max-w-2xl pt-2 text-muted-foreground">
              Odpowiedz na kilka pytań o budowę — otrzymasz orientacyjny
              kosztorys etapów i harmonogram prac.
            </p>
          ) : null}
        </div>

        {plan && results?.status === "ok" ? (
          <PlanSnapshotCard
            results={results.data}
            planCreatedAt={plan.createdAt}
          />
        ) : null}

        {plan && results?.status !== "ok" ? (
          <Card>
            <CardHeader>
              <CardTitle>Plan w przygotowaniu</CardTitle>
              <CardDescription>
                Plan utworzony {formatPlDate(plan.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nie udało się wczytać podsumowania. Otwórz wyniki planu lub
                uzupełnij ankietę i przelicz ponownie.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={routes.plan(plan.id)}>
                  Otwórz plan
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href={routes.questionnaire}>Edytuj odpowiedzi</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {!plan ? (
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Zacznij od ankiety</CardTitle>
              <CardDescription>{ORIENTATIONAL_TRUST_HEADING}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Podasz m.in. metraż, standard budowy i stan inwestycji. Na
                końcu zobaczysz kosztorys etapów i harmonogram w czasie.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild size="lg">
                <Link href={routes.questionnaire}>Rozpocznij ankietę</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : null}
      </div>
    </AppPageShell>
  );
}
