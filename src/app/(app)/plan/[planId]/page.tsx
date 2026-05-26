import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
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

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan || plan.userId !== user.id) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Twój plan budowy</h1>
      <p className="text-muted-foreground">Plan został utworzony pomyślnie.</p>
      <p className="text-muted-foreground text-sm">ID: {plan.id}</p>
      <a
        href={routes.dashboard}
        className="text-primary underline-offset-4 hover:underline"
      >
        Wróć do panelu
      </a>
    </div>
  );
}
