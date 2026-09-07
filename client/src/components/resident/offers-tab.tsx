import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OfferCard, { type PublicOffer } from "@/components/offer-card";
import OfferDetailsModal from "@/components/offer-details-modal";
import { categoryLabel } from "@/components/resident/format";

const ALL = "all";

export function OfferGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-slate-100" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-slate-100 rounded w-1/3" />
            <div className="h-5 bg-slate-100 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OffersTab() {
  const { data: offers = [], isLoading } = useQuery<PublicOffer[]>({ queryKey: ["/api/offers"] });
  const [category, setCategory] = useState(ALL);
  const [merchantId, setMerchantId] = useState(ALL);
  const [selected, setSelected] = useState<PublicOffer | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const o of offers) set.add(o.category ?? o.merchant.category ?? "other");
    return Array.from(set).sort();
  }, [offers]);

  const merchants = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) map.set(o.merchant.id, o.merchant.name);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [offers]);

  const visible = offers.filter((o) => {
    const cat = o.category ?? o.merchant.category ?? "other";
    if (category !== ALL && cat !== category) return false;
    if (merchantId !== ALL && o.merchant.id !== merchantId) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-12 text-base bg-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={merchantId} onValueChange={setMerchantId}>
          <SelectTrigger className="h-12 text-base bg-white">
            <SelectValue placeholder="Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All outlets</SelectItem>
            {merchants.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <OfferGridSkeleton />
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-600">
          {offers.length === 0 ? "No offers are live yet. Check back soon." : "No offers match those filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((o) => (
            <OfferCard key={o.id} offer={o} onOpen={setSelected} />
          ))}
        </div>
      )}

      <OfferDetailsModal offer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
