import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppPageShell } from "@/components/app/app-page-shell";
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { QUESTIONNAIRE_INTRO_NEW } from "@/lib/copy/orientational";
import { PAGE_METADATA } from "@/lib/copy/site";
import { responsesToQuestionnaireInputs } from "@/lib/questionnaire/responses-to-inputs";
import { loadLatestPlanForUser } from "@/lib/plan/load-latest-plan-for-user";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: PAGE_METADATA.questionnaire.title,
  description: PAGE_METADATA.questionnaire.description,
};

export default async function QuestionnairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(routes.login);
  }

  const plan = await loadLatestPlanForUser(user.id, "questionnaire");

  const latestVersion = plan?.versions[0];
  const planId = plan?.id;
  const initialValues = latestVersion
    ? responsesToQuestionnaireInputs(latestVersion.responses)
    : undefined;

  const questions = await prisma.questionDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });

  if (questions.length === 0) {
    return (
      <AppPageShell width="narrow">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ankieta planistyczna
          </h1>
        </div>
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {PAGE_METADATA.questionnaire.emptyKnowledgeBase}
        </p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell width="narrow">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
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
