import { config } from "./config";
import { log } from "./vite";
import {
  campaignEmail,
  membershipLapsedEmail,
  merchantApprovedEmail,
  passwordResetEmail,
  postcardPostedEmail,
  renewalReminderEmail,
  trialEndingEmail,
  verifiedEmail,
  welcomeEmail,
  type EmailBrand,
  type EmailMessage,
} from "./lib/email-templates";

// Sending is behind an interface with two implementations: the console one, which
// is the default and prints what it would have sent, and Resend, used when
// RESEND_API_KEY is set. Nothing here opts into open or click tracking, and the
// templates carry no pixel and no wrapped links, so a Resicard email reports
// nothing back about the person reading it.

export interface EmailService {
  sendPasswordReset(email: string, resetUrl: string, userDisplayName?: string): Promise<void>;
  sendWelcome(email: string, firstName?: string | null): Promise<void>;
  sendPostcardPosted(email: string, firstName?: string | null, expiresAt?: Date | string | null): Promise<void>;
  sendVerified(email: string, firstName?: string | null): Promise<void>;
  sendTrialEnding(email: string, chargeDate: Date | string, firstName?: string | null): Promise<void>;
  /** `days` is 30 or 7: the two thresholds before the membership expiry. */
  sendRenewalReminder(email: string, days: number, expiry: Date | string, firstName?: string | null): Promise<void>;
  sendMembershipLapsed(email: string, expiry: Date | string, firstName?: string | null): Promise<void>;
  sendMerchantApproved(email: string, businessName: string, firstName?: string | null): Promise<void>;
}

export const emailBrand: EmailBrand = {
  baseUrl: config.publicBaseUrl,
  postalAddress: config.emailPostalAddress,
  replyTo: config.emailReplyTo,
  townName: config.townName,
};

/** Builds every message from the shared templates; subclasses only deliver. */
abstract class TemplatedEmailService implements EmailService {
  /**
   * A campaign from an outlet. Marketing, not transactional: it goes only to
   * residents who opted in, and it carries a one-click unsubscribe.
   * `server/lib/campaign-email.ts` finds this method by name.
   */
  async sendCampaign(m: {
    to: string;
    firstName: string | null;
    merchantName: string;
    offerTitle: string;
    body: string;
    unsubscribeUrl: string;
    offerUrl: string;
  }): Promise<void> {
    await this.deliver(m.to, campaignEmail(emailBrand, m, m.firstName));
  }

  protected abstract deliver(to: string, message: EmailMessage): Promise<void>;

  sendPasswordReset(email: string, resetUrl: string, userDisplayName?: string): Promise<void> {
    return this.deliver(email, passwordResetEmail(emailBrand, resetUrl, userDisplayName));
  }
  sendWelcome(email: string, firstName?: string | null): Promise<void> {
    return this.deliver(email, welcomeEmail(emailBrand, firstName));
  }
  sendPostcardPosted(email: string, firstName?: string | null, expiresAt?: Date | string | null): Promise<void> {
    return this.deliver(email, postcardPostedEmail(emailBrand, firstName, expiresAt));
  }
  sendVerified(email: string, firstName?: string | null): Promise<void> {
    return this.deliver(email, verifiedEmail(emailBrand, firstName));
  }
  sendTrialEnding(email: string, chargeDate: Date | string, firstName?: string | null): Promise<void> {
    return this.deliver(email, trialEndingEmail(emailBrand, chargeDate, firstName));
  }
  sendRenewalReminder(email: string, days: number, expiry: Date | string, firstName?: string | null): Promise<void> {
    return this.deliver(email, renewalReminderEmail(emailBrand, days, expiry, firstName));
  }
  sendMembershipLapsed(email: string, expiry: Date | string, firstName?: string | null): Promise<void> {
    return this.deliver(email, membershipLapsedEmail(emailBrand, expiry, firstName));
  }
  sendMerchantApproved(email: string, businessName: string, firstName?: string | null): Promise<void> {
    return this.deliver(email, merchantApprovedEmail(emailBrand, businessName, firstName));
  }
}

/** Development implementation: writes the message to the server log instead of sending it. */
export class ConsoleEmailService extends TemplatedEmailService {
  protected async deliver(to: string, message: EmailMessage): Promise<void> {
    log(`Would send to ${to}: ${message.subject}`, "email");
    for (const line of message.text.split("\n")) log(`  ${line}`, "email");
  }
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Resend over its HTTP API, so there is no SDK to keep up to date. Delivery
 * failures throw: the caller writes the email_log row in the same transaction as
 * the send, and a throw is what rolls that row back.
 */
export class ResendEmailService extends TemplatedEmailService {
  constructor(private readonly apiKey: string, private readonly from: string, private readonly replyTo: string) {
    super();
  }

  protected async deliver(to: string, message: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: [to],
        reply_to: this.replyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Resend rejected the message (${response.status}): ${detail.slice(0, 200)}`);
    }
  }
}

export const emailService: EmailService = config.resendApiKey
  ? new ResendEmailService(config.resendApiKey, config.emailFrom, config.emailReplyTo)
  : new ConsoleEmailService();
