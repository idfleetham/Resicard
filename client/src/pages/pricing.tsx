import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { formatPounds, monthlyFromAnnual } from "@/components/resident/format";
import ComparisonTable from "@/components/pricing/comparison-table";
import AnalyticsPreview from "@/components/pricing/analytics-preview";
import PricingFaq from "@/components/pricing/pricing-faq";
import PublicCounter from "@/components/public-counter";
import PreviewNotice from "@/components/preview-notice";
import { merchantRows, residentRows } from "@/components/pricing/plan-features";
import { trialPhrase, usePricing } from "@/components/pricing/use-pricing";
import { useAuth } from "@/hooks/use-auth";

function Header() {
  return (
    <section className="bg-sea text-foam">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 pt-[18px] pb-10 sm:pb-14">
        <Link href="/" className="inline-flex" aria-label="Resicard home">
          <Logo size={24} tone="white" />
        </Link>
        <h1 className="font-display font-extrabold text-[42px] sm:text-[56px] leading-none tracking-[-0.03em] text-foam mt-10 sm:mt-14">
          What it costs
        </h1>
        <p className="text-[15px] sm:text-lg leading-relaxed text-foam/90 max-w-xl mt-3">
          Three months free on both sides. No charge per offer, and nothing taken from the outlets.
        </p>
      </div>
    </section>
  );
}

function TablesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-80 bg-white rounded-2xl animate-pulse" />
      <div className="h-80 bg-white rounded-2xl animate-pulse" />
    </div>
  );
}

export default function PricingPage() {
  const { data, isLoading } = usePricing();
  const { isAuthenticated, user } = useAuth();
  const trial = data ? trialPhrase(data.freeTrialDays) : null;

  // Someone signed in only needs their own side of the scheme. A resident has no
  // use for what an outlet pays, and showing a merchant the resident fee invites
  // the wrong conversation about where the money comes from.
  const role = isAuthenticated ? user?.role : null;
  const showResidents = role !== "merchant";
  const showMerchants = role !== "resident";

  return (
    <div className="min-h-screen bg-foam text-sea">
      <Header />

      <main className="max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-12 flex flex-col gap-10">
        <PreviewNotice />
        <PublicCounter />

        {isLoading || !data ? (
          <TablesSkeleton />
        ) : (
          <>
            {showResidents && (
            <ComparisonTable
              title="For residents"
              intro="Free lets you look. Membership is the card itself: redeeming, points and tiers."
              columns={[
                { plan: "Free", price: "£0", note: "always free" },
                {
                  plan: "Member",
                  price: monthlyFromAnnual(data.resident.individual),
                  note: trial
                    ? `a month, billed yearly at ${formatPounds(data.resident.individual)}, first ${trial} free`
                    : `a month, billed yearly at ${formatPounds(data.resident.individual)}`,
                  footnote: `Household: two adults, children free, ${monthlyFromAnnual(data.resident.household)} a month`,
                },
              ]}
              rows={residentRows()}
            />
            )}

            {showMerchants && (
            <>
            <ComparisonTable
              title="For businesses"
              intro="Free is a listing with offers on the days you choose. Standard adds the loyalty programme. Insight adds analytics and town benchmarks."
              columns={[
                { plan: "Free", price: "£0", note: "always free" },
                {
                  plan: "Standard",
                  price: formatPounds(data.merchant.standardMonthly),
                  note: trial ? `a month, first ${trial} free` : "a month",
                },
                {
                  plan: "Insight",
                  price: formatPounds(data.merchant.insightMonthly),
                  note: trial ? `a month, first ${trial} free` : "a month",
                },
              ]}
              rows={merchantRows(data.merchant.freeLiveOfferLimit)}
            />

            <AnalyticsPreview />
            </>
            )}
          </>
        )}

        <PricingFaq />

        {!isAuthenticated && (
          <section className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="buoy" className="h-[52px] flex-1 text-base">
              <Link href="/register">Join Resicard</Link>
            </Button>
            <Button asChild variant="outline" className="h-[52px] flex-1 text-base bg-white">
              <Link href="/register?role=merchant">List your business</Link>
            </Button>
          </section>
        )}
        {isAuthenticated && (
          <section>
            <Button asChild variant="buoy" className="h-[52px] w-full sm:w-auto sm:px-10 text-base">
              <Link href={role === "merchant" ? "/merchant/plan" : "/resident"}>
                {role === "merchant" ? "Your plan" : "Back to your card"}
              </Link>
            </Button>
          </section>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-5 sm:px-6 py-8 flex items-center gap-3 text-xs text-slate-brand">
        <Logo size={18} />
        <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
