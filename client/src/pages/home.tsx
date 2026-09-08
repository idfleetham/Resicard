import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import OfferCard, { type PublicOffer } from "@/components/offer-card";
import OfferDetailsModal from "@/components/offer-details-modal";
import PublicCounter from "@/components/public-counter";
import { OfferGridSkeleton } from "@/components/resident/offers-tab";
import { useAuth } from "@/hooks/use-auth";
import { homePathForRole } from "@/lib/auth";
import { usePricing } from "@/components/pricing/use-pricing";
import { monthlyFromAnnual } from "@/components/resident/format";

/** The price is the persuasive part, so it comes from /api/pricing rather than being typed here twice. */
function steps(monthly: string | null) {
  return [
    { title: "Prove you live here.", text: "We post a card with a code to your address, or an admin verifies you in person. No documents are stored." },
    {
      title: "Free or Premium.",
      text: `Free lets you browse every offer and see what it is worth. Premium${monthly ? `, ${monthly} a month billed yearly,` : ","} gets you the card itself: redeeming, points and tiers. The first three months are free.`,
    },
    { title: "Scan the code at the till.", text: "Pick the offer, show the green screen." },
  ];
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [selected, setSelected] = useState<PublicOffer | null>(null);
  const offers = useQuery<PublicOffer[]>({ queryKey: ["/api/offers"] });
  const pricing = usePricing();

  const homePath = isAuthenticated && user ? homePathForRole(user.role) : null;

  return (
    <div className="min-h-screen bg-foam text-sea">
      <section className="relative overflow-hidden bg-sea text-foam min-h-[470px] sm:min-h-[560px] flex flex-col">
        <img
          src="/brand/west-sands.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          style={{ objectPosition: "60% 40%" }}
        />
        <div className="absolute inset-0 sea-gradient" />

        <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-6 pt-[18px] flex items-center justify-between">
          <Logo size={24} tone="white" />
          {homePath ? (
            <Link href={homePath} className="text-sm font-semibold text-foam">
              My Resicard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-foam">
              Log in
            </Link>
          )}
        </div>

        <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-6 pb-12 sm:pb-16 mt-auto pt-16 sm:pt-24">
          <div className="max-w-2xl flex flex-col gap-[14px]">
            <h1 className="font-display font-extrabold text-[42px] sm:text-[64px] leading-none tracking-[-0.03em] text-foam" style={{ textWrap: "pretty" }}>
              Local prices for local people.
            </h1>
            <p className="text-[15px] sm:text-lg leading-relaxed text-foam/90 max-w-xl">
              St Andrews prices are set for visitors and students. Resicard lets the town's outlets give residents a
              better deal.
            </p>
            <div className="mt-1">
              {homePath ? (
                <Button asChild variant="buoy" className="h-[52px] w-full sm:w-auto sm:px-10 text-base">
                  <Link href={homePath}>Go to my Resicard</Link>
                </Button>
              ) : (
                <Button asChild variant="buoy" className="h-[52px] w-full sm:w-auto sm:px-10 text-base">
                  <Link href="/register">Join Resicard</Link>
                </Button>
              )}
              <p className="text-sm text-[#F2F5F4]/75 mt-1">
                Works on your phone's home screen. Nothing to download, no app store.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicCounter className="max-w-6xl mx-auto px-5 sm:px-6 pt-7 sm:pt-10" />

      <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-7 sm:pt-12">
        <div className="flex items-baseline justify-between mb-[14px]">
          <h2 className="font-display font-bold text-2xl tracking-[-0.02em]">On this week</h2>
          <Link href="/register" className="text-[13px] font-semibold text-buoy">
            All offers
          </Link>
        </div>
        {offers.isLoading ? (
          <OfferGridSkeleton />
        ) : !offers.data || offers.data.length === 0 ? (
          <div className="bg-sand rounded-2xl p-8 text-center text-sea">
            No offers are live yet. Outlets are signing up now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {offers.data.map((o) => (
              <OfferCard key={o.id} offer={o} onOpen={setSelected} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-[30px] sm:pt-12">
        <h2 className="font-display font-bold text-2xl tracking-[-0.02em] mb-4">How it works</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps(pricing.data ? monthlyFromAnnual(pricing.data.resident.individual) : null).map((step, i) => (
            <li key={step.title} className="flex gap-[14px] items-start bg-white rounded-2xl p-[14px] sm:p-5">
              <span className="flex-none h-8 w-8 rounded-full bg-sea text-foam font-display font-extrabold text-[15px] flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-[15px] leading-[1.45]">
                <strong className="font-bold">{step.title}</strong> {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-[30px] sm:pt-12">
        <div className="bg-sea text-foam rounded-2xl p-5 sm:p-8 flex flex-col gap-2 md:flex-row md:items-center md:gap-8">
          <div className="flex-1 flex flex-col gap-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-[-0.02em] text-foam">Run a bar, cafe or shop?</h2>
            <p className="text-sm sm:text-base leading-relaxed text-foam/90">
              Listing is free: offers for residents on the days you choose, a QR poster and a redemption feed. Premium adds a loyalty programme and analytics, and the first three months are free.
            </p>
          </div>
          <div className="flex items-center gap-5 mt-1 md:mt-0">
            <Link
              href="/register?role=merchant"
              className="text-sm font-bold text-foam underline underline-offset-[3px]"
            >
              List your business
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-foam/90 underline underline-offset-[3px]">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-5 sm:px-6 py-8 mt-6 flex items-center justify-between gap-3 text-xs text-slate-brand">
        <div className="flex items-center gap-3">
          <Logo size={18} />
          <span>{new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sea underline underline-offset-2">
            Pricing
          </Link>
          <Link href="/admin-signup" className="text-sea underline underline-offset-2">
            Admin
          </Link>
        </div>
      </footer>

      <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
