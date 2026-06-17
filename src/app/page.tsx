import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Hero } from "@/components/marketing/hero";
import { FeaturesSection } from "@/components/marketing/features-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "NovaHR | Modern HR & Payroll for South African Businesses",
  description:
    "Run South African payroll in minutes. Manage leave, employees, and payslips — built for growing SA businesses.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <MarketingNav />
      <main className="flex-1">
        <section className="container mx-auto max-w-6xl px-4">
          <Hero />
        </section>
        <section className="container mx-auto max-w-6xl px-4 py-24">
          <FeaturesSection />
        </section>
        <section className="container mx-auto max-w-6xl px-4 py-24 border-t">
          <PricingSection />
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
