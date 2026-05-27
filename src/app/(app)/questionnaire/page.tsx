import { redirect } from "next/navigation";

import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form";
import { responsesToQuestionnaireInputs } from "@/lib/questionnaire/responses-to-inputs";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

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
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col items-center justify-center p-6 md:p-10">
      <div className="mb-6 w-full max-w-2xl space-y-2 text-center">
        <h1 className="text-2xl font-bold">
          {planId ? "Edycja ankiety" : "Ankieta planistyczna"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {planId
            ? "Zmień odpowiedzi i przelicz orientacyjny kosztorys oraz harmonogram."
            : "Odpowiedz na pytania o budowę — na końcu otrzymasz wstępny plan."}
        </p>
      </div>
      <QuestionnaireForm
        questions={questions}
        planId={planId}
        initialValues={initialValues}
      />
    </div>
  );
}
