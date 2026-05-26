import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";

export default async function QuestionnairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login);
  }

  const existingPlan = await prisma.plan.findFirst({
    where: { userId: user.id },
  });

  if (existingPlan) {
    redirect(routes.plan(existingPlan.id));
  }

  const questions = await prisma.questionDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <QuestionnaireForm questions={questions} />
    </div>
  );
}
