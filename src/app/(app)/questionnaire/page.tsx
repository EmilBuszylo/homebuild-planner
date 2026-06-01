import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppPageShell } from "@/components/app/app-page-shell";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { QUESTIONNAIRE_INTRO_NEW } from "@/lib/copy/orientational";
import { responsesToQuestionnaireInputs } from "@/lib/questionnaire/responses-to-inputs";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Ankieta",
};

export default async function QuestionnairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login);
  }

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { responses: true },
      },
    },
  });

  const latestVersion = plan?.versions[0];
  const planId = plan?.id;
  const initialValues = latestVersion
    ? responsesToQuestionnaireInputs(latestVersion.responses)
    : undefined;

  const questions = await prisma.questionDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return (
    <AppPageShell width="narrow">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {planId ? "Edycja ankiety" : "Ankieta planistyczna"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {planId
            ? "Zmień odpowiedzi i przelicz orientacyjny kosztorys oraz harmonogram."
            : QUESTIONNAIRE_INTRO_NEW}
        </p>
      </div>
      <QuestionnaireForm
        questions={questions}
        planId={planId}
        initialValues={initialValues}
      />
    </AppPageShell>
  );
}
