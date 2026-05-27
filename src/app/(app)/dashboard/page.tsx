import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

function formatPlanCreatedAt(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Panel</h1>
        {authUser.email && (
          <p className="text-muted-foreground">{authUser.email}</p>
        )}

        {plan ? (
          <>
            <p className="text-muted-foreground text-sm">
              Plan utworzony {formatPlanCreatedAt(plan.createdAt)}
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto">
              <Button asChild size="lg" className="w-full">
                <Link href={routes.plan(plan.id)}>
                  Zobacz kosztorys i harmonogram
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href={routes.questionnaire}>Edytuj odpowiedzi</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Odpowiedz na kilka pytań o budowę — otrzymasz orientacyjny
              kosztorys etapów i harmonogram prac.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={routes.questionnaire}>Rozpocznij ankietę</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
