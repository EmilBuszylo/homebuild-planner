import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Panel</h1>
      {session?.user?.email && (
        <p className="text-muted-foreground">{session.user.email}</p>
      )}
      <SignOutButton />
    </div>
  );
}
