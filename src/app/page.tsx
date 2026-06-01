import type { Metadata } from "next";

import { LandingBenefits } from "@/components/marketing/landing-benefits";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingHeader } from "@/components/marketing/landing-header";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingTrust } from "@/components/marketing/landing-trust";
import { SITE_DESCRIPTION } from "@/lib/copy/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    absolute: "Planer budowy domu",
  },
  description: SITE_DESCRIPTION,
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <LandingHero isAuthenticated={isAuthenticated} />
        <LandingBenefits />
        <LandingTrust />
      </main>
      <LandingFooter />
    </div>
  );
}
