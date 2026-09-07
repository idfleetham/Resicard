import type { Merchant, PublicUser } from "@shared/schema";

export interface AdminStats {
  residents: number;
  verifiedResidents: number;
  activeMembers: number;
  merchants: number;
  pendingMerchants: number;
  pendingDocuments: number;
  offers: number;
  redemptionsThisMonth: number;
}

export type PendingDocumentUser = PublicUser & { documentFile: string | null };

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

export const DOCUMENT_LABELS: Record<string, string> = {
  driving_licence: "Driving licence",
  bank_statement: "Bank statement",
  utility_bill: "Utility bill",
  council_tax: "Council tax letter",
};

export function fullName(u: { firstName?: string | null; surname?: string | null; username?: string | null; email?: string | null }): string {
  return [u.firstName, u.surname].filter(Boolean).join(" ") || u.username || u.email || "Unknown";
}
