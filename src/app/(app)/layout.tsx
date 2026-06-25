import { AppHeader } from "@/components/app/app-header";
import { loadLatestPlanForUser } from "@/lib/plan/load-latest-plan-for-user";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let latestPlanId: string | null = null;
  if (user) {
    const plan = await loadLatestPlanForUser(user.id, "nav");
    latestPlanId = plan?.id ?? null;
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader latestPlanId={latestPlanId} />
      {children}
    </div>
  );
}
