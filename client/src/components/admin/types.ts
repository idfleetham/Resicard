import type { Merchant } from "@shared/schema";

export interface AdminStats {
  residents: number;
  verifiedResidents: number;
  activeMembers: number;
  merchants: number;
  pendingMerchants: number;
  postcardsToPost: number;
  offers: number;
  redemptionsThisMonth: number;
}

export type AdminMerchant = Merchant & {
  owner: { id: number; email: string; firstName: string | null; surname: string | null } | null;
  offerCount: number;
};

export interface AdminRedemption {
  id: string;
  merchantName: string;
  offerTitle: string;
  customerAlias: string;
  code: string;
  basketAmount: string | number | null;
  pointsAwarded: number | null;
  redeemedAt: string;
}

export function fullName(u: { firstName?: string | null; surname?: string | null; username?: string | null; email?: string | null }): string {
  return [u.firstName, u.surname].filter(Boolean).join(" ") || u.username || u.email || "Unknown";
}

export interface AdminPostcard {
  id: string;
  userId: number;
  name: string;
  email: string;
  address: string;
  status: "requested" | "posted" | "used" | "expired" | "cancelled";
  requestedAt: string | null;
  postedAt: string | null;
  expiresAt: string | null;
  attempts: number;
}

export interface AdminResident {
  id: number;
  name: string;
  email: string;
  username: string;
  address: { addressLine1: string | null; addressLine2: string | null; town: string | null; postcode: string | null };
  verified: boolean;
  verifiedAt: string | null;
  method: "postcard" | "in_person" | null;
  membership: { status: "inactive" | "active" | "cancelled"; expiry: string | null; plan: "individual" | "household" };
  createdAt: string | null;
}

export function addressLines(a: AdminResident["address"]): string[] {
  return [a.addressLine1, a.addressLine2, a.town, a.postcode].filter((l): l is string => Boolean(l && l.trim()));
}
