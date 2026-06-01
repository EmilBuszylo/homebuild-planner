import { AppHeader } from "@/components/app/app-header";
import { prisma } from "@/lib/prisma";
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
    const plan = await prisma.plan.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    latestPlanId = plan?.id ?? null;
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader latestPlanId={latestPlanId} />
      {children}
    </div>
  );
}
