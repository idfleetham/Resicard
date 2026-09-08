import { createHmac, timingSafeEqual } from "crypto";
import { config } from "../config";
import { emailService } from "../email";
import { log } from "../vite";

/**
 * Campaign email, kept behind its own narrow interface.
 *
 * `EmailService` in server/email.ts covers the transactional messages and has no
 * campaign method. Rather than widen it from here, this module declares only
 * what a campaign needs and uses the shared service when it grows a matching
 * method. The moment `sendCampaign` appears on `EmailService`, this picks it up
 * with no change; until then it prints, exactly as the console service does.
 */
export interface CampaignEmail {
  to: string;
  firstName: string | null;
  merchantName: string;
  offerTitle: string;
  body: string;
  /** One click, no sign-in. Required: a campaign email without one must not go out. */
  unsubscribeUrl: string;
  offerUrl: string;
}

export interface CampaignEmailService {
  sendCampaign(message: CampaignEmail): Promise<void>;
}

/** Structural check, so the two halves join up without either module importing the other's shape. */
function sharedServiceSupportsCampaigns(
  service: unknown,
): service is CampaignEmailService {
  return typeof (service as { sendCampaign?: unknown } | null)?.sendCampaign === "function";
}

class LoggingCampaignEmailService implements CampaignEmailService {
  async sendCampaign(message: CampaignEmail): Promise<void> {
    log(`Would send a campaign to ${message.to}: ${message.merchantName} — ${message.body}`, "email");
  }
}

export const campaignEmailService: CampaignEmailService = sharedServiceSupportsCampaigns(emailService)
  ? emailService
  : new LoggingCampaignEmailService();

// Unsubscribe tokens -----------------------------------------------------------
//
// The link has to work with no session, from any mail client, so the token is a
// signed statement of "this user, for marketing email" rather than anything
// looked up. It grants nothing but turning marketing email off, so it does not
// expire: an old email is still a valid way to unsubscribe, which is the point.

const PURPOSE = "campaign-email";

function sign(userId: number): string {
  return createHmac("sha256", config.jwtSecret).update(`${PURPOSE}:${userId}`).digest("base64url");
}

export function unsubscribeToken(userId: number): string {
  return `${userId}.${sign(userId)}`;
}

export function unsubscribeUrl(userId: number): string {
  return `${config.publicBaseUrl}/api/unsubscribe/${unsubscribeToken(userId)}`;
}

/** The user id the token stands for, or null if it does not verify. */
export function readUnsubscribeToken(token: string): number | null {
  const [rawId, signature] = token.split(".");
  const userId = Number(rawId);
  if (!Number.isInteger(userId) || userId <= 0 || !signature) return null;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return userId;
}
