import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const user = authUser
    ? await prisma.user.findUnique({ where: { id: authUser.id } })
    : null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Panel</h1>
      {(user?.email ?? authUser?.email) && (
        <p className="text-muted-foreground">
          {user?.email ?? authUser?.email}
        </p>
      )}
      <SignOutButton />
    </div>
  );
}
