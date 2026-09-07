import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Store, Ticket, Users, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import OfferCard, { type PublicOffer } from "@/components/offer-card";
import OfferDetailsModal from "@/components/offer-details-modal";
import { OfferGridSkeleton } from "@/components/resident/offers-tab";
import { useAuth } from "@/hooks/use-auth";
import { homePathForRole } from "@/lib/auth";

interface Stats {
  activeOffers: number;
  merchants: number;
  redemptions: number;
  members: number;
}

const STEPS = [
  { title: "Sign up and verify your address", text: "Create an account with your postcode and upload a proof of address. We check it is in or around St Andrews." },
  { title: "Pay the annual membership", text: "One flat fee for the year. No charge per offer, and nothing taken from the outlets when you redeem." },
  { title: "Scan the Resicard code at the till", text: "Pick the offer you want and show the green screen to staff. That is it." },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [selected, setSelected] = useState<PublicOffer | null>(null);
  const stats = useQuery<Stats>({ queryKey: ["/api/stats"] });
  const offers = useQuery<PublicOffer[]>({ queryKey: ["/api/offers"] });

  const statItems = [
    { label: "Live offers", value: stats.data?.activeOffers, icon: Ticket },
    { label: "Outlets", value: stats.data?.merchants, icon: Store },
    { label: "Members", value: stats.data?.members, icon: Users },
    { label: "Redemptions", value: stats.data?.redemptions, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">St Andrews</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mt-2 max-w-2xl">
            A fair price for the people who live here.
          </h1>
          <p className="text-lg text-white/90 mt-4 max-w-2xl">
            Prices in St Andrews are set for visitors and students, and locals get priced out of their own town.
            Resicard lets bars, restaurants and shops offer residents a better price, the same way they already
            do for students.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            {isAuthenticated && user ? (
              <Button asChild size="lg" className="h-12 text-base bg-white text-blue-700 hover:bg-blue-50">
                <Link href={homePathForRole(user.role)}>Go to my Resicard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-12 text-base bg-white text-blue-700 hover:bg-blue-50">
                  <Link href="/register">Join Resicard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 text-base border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link href="/login">Log in</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <p className="text-3xl font-bold text-slate-900 mt-1">{value ?? "-"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Current offers</h2>
            <p className="text-slate-600">What local outlets are offering residents right now.</p>
          </div>
        </div>
        {offers.isLoading ? (
          <OfferGridSkeleton />
        ) : !offers.data || offers.data.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
            No offers are live yet. Outlets are signing up now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.data.map((o) => (
              <OfferCard key={o.id} offer={o} onOpen={setSelected} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex-none h-10 w-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-slate-600 text-sm mt-1">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">For businesses</h2>
            <p className="text-slate-300 mt-2">
              Fill quiet hours, reward regulars and give locals a reason to come back. Set your own offers, run a
              loyalty programme if you like, and pay one flat monthly fee. No commission on redemptions.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 text-base bg-white text-slate-900 hover:bg-slate-100">
            <Link href="/register?role=merchant">Apply to join</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <p>Resicard St Andrews, {new Date().getFullYear()}</p>
          <Link href="/admin-signup" className="hover:text-slate-800">
            Admin
          </Link>
        </div>
      </footer>

      <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
