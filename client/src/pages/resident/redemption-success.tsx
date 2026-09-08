import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRequireRole } from "@/hooks/use-auth";
import { errorMessage, formatPounds, offerHeadline } from "@/components/resident/format";
import { GreenScreen, GreenScreenLoading, GreenScreenNotFound, type GreenScreenLoyalty } from "@/components/resident/green-screen";
import type { OfferType } from "@shared/schema";

interface RedemptionDetails {
  redemption: {
    id: string;
    code: string;
    redeemedAt: string;
    pointsAwarded: number;
    basketAmount: number | null;
    savedAmount: number | null;
    savedEstimated: boolean;
  };
  offer: {
    id: string;
    title: string;
    type: OfferType | null;
    percentOff: number | null;
    fixedPrice: number | null;
    shortPromo: string | null;
    terms: string | null;
  };
  merchant: { id: string; name: string; logoUrl: string | null };
  resident: { firstName: string | null; surname: string | null; profilePhoto: string | null };
  loyalty: GreenScreenLoyalty | null;
}

/** Whole pounds without ".00" for the big headline. */
function bigPounds(value: number | string): string {
  return formatPounds(value).replace(/\.00$/, "");
}

/** The headline over one or two lines: ["20%", "off"], ["£15"], ["Free"]. */
function headlineLines(offer: RedemptionDetails["offer"]): string[] {
  switch (offer.type) {
    case "percentage_discount":
    case "off_peak":
      return offer.percentOff ? [`${offer.percentOff}%`, "off"] : ["Offer"];
    case "fixed_amount_discount":
      return offer.fixedPrice ? [bigPounds(offer.fixedPrice), "off"] : ["Money", "off"];
    case "fixed_price":
    case "set_menu":
      return offer.fixedPrice ? [bigPounds(offer.fixedPrice)] : ["Set", "price"];
    case "bogo":
      return ["2 for", "1"];
    case "free_item_with_purchase":
      return ["Free"];
    case "loyalty_reward":
      return ["Reward"];
    default: {
      const words = offerHeadline(offer).split(" ");
      return words.length > 1 ? [words[0], words.slice(1).join(" ")] : words;
    }
  }
}

export default function RedemptionSuccess() {
  const { id = "" } = useParams<{ id: string }>();
  const { ready } = useRequireRole("resident");

  const { data, isLoading, error } = useQuery<RedemptionDetails>({
    queryKey: [`/api/redemptions/${id}`],
    enabled: ready && id.length > 0,
  });

  if (!ready || isLoading) return <GreenScreenLoading />;
  if (error || !data) return <GreenScreenNotFound title="Redemption not found" message={error ? errorMessage(error) : ""} />;

  const points = data.redemption.pointsAwarded;
  const { savedAmount, savedEstimated } = data.redemption;
  // Quiet by design: the code and the outlet are what staff and resident read first.
  const savedLine =
    savedAmount === null ? null : `You saved ${savedEstimated ? "about " : ""}${formatPounds(savedAmount)}`;
  return (
    <GreenScreen
      kind="redemption"
      headlineLines={headlineLines(data.offer)}
      title={data.offer.title}
      subtitle={data.offer.shortPromo}
      terms={data.offer.terms}
      merchant={data.merchant}
      resident={data.resident}
      code={data.redemption.code}
      at={data.redemption.redeemedAt}
      loyalty={data.loyalty}
      pointsLine={points > 0 ? `+${points} points at ${data.merchant.name}` : null}
      savedLine={savedLine}
    />
  );
}
