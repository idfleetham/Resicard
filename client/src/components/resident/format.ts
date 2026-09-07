import type { Offer, OfferType } from "@shared/schema";

/** Turn an apiRequest error ("400: {\"message\":\"...\"}") into a readable message. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!(err instanceof Error)) return fallback;
  const raw = err.message.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON
  }
  return raw || fallback;
}

/** The `code` field from an apiRequest error body, e.g. "plan_limit", or null. */
export function errorCode(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  try {
    const parsed = JSON.parse(err.message.replace(/^\d{3}:\s*/, "")) as { code?: unknown };
    return typeof parsed?.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

/** dd Mon yyyy */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** HH:MM (24h) */
export function formatTime(value: string | Date | null | undefined, withSeconds = false): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  });
}

export function formatPounds(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number.isNaN(n) ? 0 : n);
}

/** "just now", "2 min ago", "1 hr ago" */
export function relativeTime(value: string | Date, now: Date = new Date()): string {
  const diffSec = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurant",
  bar: "Bar",
  cafe: "Cafe",
  pub: "Pub",
  takeaway: "Takeaway",
  hotel: "Hotel",
  retail: "Shop",
  services: "Services",
  experience: "Things to do",
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "Other";
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  percentage_discount: "Discount",
  fixed_amount_discount: "Money off",
  fixed_price: "Fixed price",
  free_item_with_purchase: "Free item",
  bogo: "Two for one",
  set_menu: "Set menu",
  off_peak: "Off-peak",
  loyalty_reward: "Loyalty reward",
};

interface OfferLike {
  type: OfferType | null;
  percentOff: number | null;
  fixedPrice: string | number | null;
  shortPromo?: string | null;
}

/** The short, bold line shown on a card: "20% off", "£12.50", "2 for 1". */
export function offerHeadline(offer: OfferLike): string {
  switch (offer.type) {
    case "percentage_discount":
      return offer.percentOff ? `${offer.percentOff}% off` : "Discount";
    case "fixed_amount_discount":
      return offer.fixedPrice ? `${formatPounds(offer.fixedPrice)} off` : "Money off";
    case "fixed_price":
    case "set_menu":
      return offer.fixedPrice ? formatPounds(offer.fixedPrice) : OFFER_TYPE_LABELS[offer.type];
    case "bogo":
      return "2 for 1";
    case "free_item_with_purchase":
      return "Free item";
    case "off_peak":
      return offer.percentOff ? `${offer.percentOff}% off off-peak` : "Off-peak offer";
    case "loyalty_reward":
      return "Loyalty reward";
    default:
      return offer.shortPromo ?? "Offer";
  }
}

const DAY_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

/** "Mon to Fri, 12:00 to 15:00" style summary of when an offer applies. */
export function offerWhen(offer: Pick<Offer, "daysOfWeek" | "timeSlots" | "validTo">): string[] {
  const lines: string[] = [];
  const days = offer.daysOfWeek ?? [];
  if (days.length && days.length < 7) {
    lines.push(days.map((d) => DAY_LABELS[d] ?? d).join(", "));
  }
  const slots = offer.timeSlots ?? {};
  const slotStrings = new Set<string>();
  for (const list of Object.values(slots)) {
    for (const s of list) slotStrings.add(`${s.start} to ${s.end}`);
  }
  if (slotStrings.size) lines.push(Array.from(slotStrings).join(", "));
  if (offer.validTo) lines.push(`Until ${formatDate(offer.validTo)}`);
  return lines;
}

/** Short list of conditions worth showing at a glance. */
export function offerConditions(
  offer: Pick<Offer, "dineInOnly" | "excludesAlcohol" | "minBasket" | "newCustomerOnly" | "maxPerDay">,
): string[] {
  const out: string[] = [];
  if (offer.dineInOnly) out.push("Dine-in only");
  if (offer.excludesAlcohol) out.push("Excludes alcohol");
  if (offer.minBasket && Number(offer.minBasket) > 0) out.push(`Minimum spend ${formatPounds(offer.minBasket)}`);
  if (offer.newCustomerOnly) out.push("New customers only");
  if (offer.maxPerDay) out.push(`Max ${offer.maxPerDay} per day`);
  return out;
}
