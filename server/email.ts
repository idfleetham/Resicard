import { log } from "./vite";

export interface EmailService {
  sendPasswordReset(email: string, resetUrl: string, userDisplayName?: string): Promise<void>;
}

/** Development implementation: writes the message to the server log instead of sending it. */
export class ConsoleEmailService implements EmailService {
  async sendPasswordReset(email: string, resetUrl: string, userDisplayName?: string): Promise<void> {
    log(`Password reset requested for ${email}${userDisplayName ? ` (${userDisplayName})` : ""}`, "email");
    log(`Reset URL: ${resetUrl}`, "email");
  }
}

export const emailService: EmailService = new ConsoleEmailService();
