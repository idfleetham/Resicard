export interface EmailService {
  sendPasswordReset(email: string, resetUrl: string, userDisplayName?: string): Promise<void>;
}

export class ConsoleEmailService implements EmailService {
  async sendPasswordReset(email: string, resetUrl: string, userDisplayName?: string): Promise<void> {
    console.log('='.repeat(60));
    console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
    console.log('='.repeat(60));
    console.log(`To: ${email}`);
    if (userDisplayName) {
      console.log(`For: ${userDisplayName}`);
    }
    console.log(`Reset URL: ${resetUrl}`);
    console.log('='.repeat(60));
    console.log('⚠️  In production, this would be sent via email service');
    console.log('='.repeat(60));
  }
}

// Export a configured instance for development
export const emailService: EmailService = new ConsoleEmailService();