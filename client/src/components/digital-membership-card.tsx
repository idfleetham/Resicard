import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, User } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { formatDate } from "@/components/resident/format";

interface DigitalMembershipCardProps {
  user: AuthUser;
}

/**
 * The card a resident shows staff when scanning is not possible.
 * Kept to essentials so it reads at arm's length.
 */
export default function DigitalMembershipCard({ user }: DigitalMembershipCardProps) {
  const name = [user.firstName, user.surname].filter(Boolean).join(" ") || user.username;
  const expiry = user.membershipExpiry ? new Date(user.membershipExpiry) : null;
  const membershipLive = user.membershipStatus === "active" && expiry !== null && expiry.getTime() > Date.now();
  const verified = Boolean(user.isResidencyVerified);

  return (
    <div
      className={`rounded-2xl p-5 text-white shadow-lg ${
        membershipLive && verified
          ? "bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600"
          : "bg-gradient-to-br from-slate-600 to-slate-500"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold leading-none">Resicard</p>
          <p className="text-sm text-white/80 mt-1">St Andrews resident</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-white/70">Member no.</p>
          <p className="font-mono text-lg font-semibold">{String(user.id).padStart(6, "0")}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-5">
        <Avatar className="h-24 w-24 border-2 border-white/70 shadow">
          <AvatarImage src={user.profilePhoto ?? undefined} alt="" className="object-cover" />
          <AvatarFallback className="bg-white/20 text-white">
            <User className="h-10 w-10" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-tight truncate">{name}</p>
          {verified ? (
            <p className="inline-flex items-center gap-1 mt-1 text-sm font-medium bg-white/20 rounded-full px-2.5 py-0.5">
              <BadgeCheck className="h-4 w-4" />
              Address verified
            </p>
          ) : (
            <p className="inline-flex items-center mt-1 text-sm font-medium bg-black/20 rounded-full px-2.5 py-0.5">
              Address not yet verified
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/25 text-sm">
        <div>
          <p className="text-white/70 text-xs">Membership</p>
          <p className="font-semibold">
            {membershipLive ? `Valid until ${formatDate(expiry)}` : user.membershipStatus === "cancelled" ? "Cancelled" : "Not active"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/70 text-xs">Member since</p>
          <p className="font-semibold">{formatDate(user.createdAt) || "-"}</p>
        </div>
      </div>
    </div>
  );
}
