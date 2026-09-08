import { Check, User } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useQuery } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/auth";
import { cardNameSizeFor } from "@shared/name-display";

interface DigitalMembershipCardProps {
  user: AuthUser;
  /** From /api/membership: the effective plan and status (a household member inherits the primary's). */
  membership?: {
    plan: "individual" | "household";
    status: "inactive" | "active" | "cancelled";
    expiry: string | null;
    renews?: boolean;
    /** True while the membership is running on the free trial. */
    inTrial?: boolean;
  } | null;
}

/** "Sep 27" style, as on the card mock-up. */
function shortMonthYear(d: Date): string {
  return `${d.toLocaleDateString("en-GB", { month: "short" })} ${String(d.getFullYear()).slice(-2)}`;
}

/** "0002 0417" style member number from the numeric id. */
function memberNumber(id: number | string): string {
  const digits = String(id).replace(/\D/g, "").padStart(8, "0").slice(-8);
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

/**
 * The card a resident shows staff when scanning is not possible.
 * Matches the brand card: sea, beach photo, name, verified line, valid-to.
 */
export default function DigitalMembershipCard({ user, membership }: DigitalMembershipCardProps) {
  const stats = useQuery<{ town?: string }>({ queryKey: ["/api/stats"], staleTime: 60 * 60 * 1000 });
  const townName = stats.data?.town ?? "St Andrews";
  const name = [user.firstName, user.surname].filter(Boolean).join(" ") || user.username;
  const status = membership?.status ?? user.membershipStatus;
  const rawExpiry = membership ? membership.expiry : user.membershipExpiry;
  const expiry = rawExpiry ? new Date(rawExpiry) : null;
  const renews = (membership ? membership.renews : user.membershipRenews) !== false;
  const member = status === "active" && expiry !== null && expiry.getTime() > Date.now();
  const verified = Boolean(user.isResidencyVerified);
  const plan = membership?.plan ?? user.membershipPlan ?? "individual";

  const inTrial = member && Boolean(membership?.inTrial) && renews;

  // A paying member: "Renews Sep 27" or "Ends Sep 27" with a downgrade scheduled, where the
  // month is enough. A trial ends within weeks, so that one shows the day: "6 Dec".
  const dateLabel = member && expiry ? (inTrial ? "Free until" : renews ? "Renews" : "Ends") : "Membership";
  const dateValue = !member || !expiry
    ? "Free"
    : inTrial
      ? new Date(expiry).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
      : shortMonthYear(expiry);
  const pill = "text-[10px] tracking-[0.18em] uppercase font-semibold px-[9px] py-[5px] rounded-full leading-none";

  // The renewal date and the member number used to sit in a third column beside the
  // name, which left the name about 105px on a phone: "Iona Whyte" already clipped.
  // They are a footer strip now, so the name has the row from the photo to the card
  // edge. What is left is a name too long even for that, which steps down a size
  // and wraps to a second line rather than being cut off mid-surname.
  // Sized against the card, not the viewport. A fixed pixel size is wrong because the
  // card is a percentage of a page that is 320px wide on an SE and 430px on a Pro Max,
  // and a threshold in characters cannot know which. `cqw` is one per cent of the card's
  // own width, so the name holds the same proportion at every size, and the clamp stops
  // it growing absurd inside the wide card on the account page.
  const nameSize = {
    large: "clamp(17px, 7.9cqw, 28px)",
    medium: "clamp(15px, 6.3cqw, 23px)",
    small: "clamp(13px, 5.2cqw, 19px)",
  }[cardNameSizeFor(name)];
  const footerRight = member && expiry ? `${dateLabel} ${dateValue}` : "Free membership";

  return (
    <div
      className="relative w-full aspect-[1.6/1] rounded-[20px] overflow-hidden bg-sea text-foam shadow-[0_18px_40px_rgba(15,59,71,0.35)]"
      style={{ filter: verified ? undefined : "grayscale(0.35)", containerType: "inline-size" }}
    >
      <img
        src="/brand/west-sands.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-55"
        style={{ objectPosition: "60% 40%" }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(15,59,71,0.15) 0%, rgba(15,59,71,0.55) 45%, #0F3B47 78%)" }}
      />

      <div className="absolute left-[22px] top-5">
        <Logo tone="white" size={22} />
        <p className="mt-1.5 pl-[3px] text-[10px] uppercase tracking-[0.22em] font-semibold text-[#F2F5F4]/75">{townName}</p>
      </div>
      <div className="absolute right-[22px] top-[22px] flex items-center gap-1.5">
        {member && plan === "household" && <span className={`${pill} bg-[#F2F5F4]/[0.18] text-foam`}>Household</span>}
        <span className={`${pill} bg-foam ${member ? "text-sea" : "text-slate-brand"}`}>{member ? "Member" : "Free"}</span>
      </div>

      <div className="absolute left-[22px] right-[22px] bottom-[46px] flex items-end gap-4">
        <div
          className="flex-none rounded-full bg-sand border-[3px] border-foam overflow-hidden flex items-center justify-center"
          style={{ height: "clamp(54px, 21cqw, 72px)", width: "clamp(54px, 21cqw, 72px)" }}
        >
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-8 w-8 text-[#7A8A8F]" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          {/* Two lines at most. A third would push the name up into the sky of the photo,
              where the gradient has not darkened enough for foam text to stay legible. */}
          <p
            className="font-display font-bold leading-[1.05] tracking-[-0.02em] line-clamp-2 break-words"
            style={{ fontSize: nameSize }}
          >
            {name}
          </p>
          {verified ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7FE0B0]">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              Address verified
            </p>
          ) : (
            <p className="text-xs font-semibold text-[#F2F5F4]/70">Not yet verified</p>
          )}
        </div>
      </div>

      <div className="absolute left-[22px] right-[22px] bottom-[15px] flex items-baseline justify-between gap-3 border-t border-[#F2F5F4]/20 pt-2">
        <p className="text-[10px] opacity-70 tabular-nums">No. {memberNumber(user.id)}</p>
        <p className="text-[10px] opacity-70">{footerRight}</p>
      </div>
    </div>
  );
}
