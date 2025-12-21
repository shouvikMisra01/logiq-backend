import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// Check if we are in production
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Create a transporter
// For dev: we'll use Ethereal (or just simulate if keys aren't present)
// For prod: standard SMTP
let transporter: nodemailer.Transporter;

const setupTransporter = async () => {
    // If SMTP credentials are provided, use them (regardless of Env)
    if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        logger.info(`📧 [EmailService] Using Real SMTP Server: ${process.env.SMTP_HOST}`);
    } else {
        // Development fallback: Log to console
        logger.info('📧 [EmailService] No SMTP credentials found. Emails will be logged to console.');
        return;
    }
};

// Initialize transporter
setupTransporter().catch(err => logger.error('❌ Failed to setup email transporter:', err));

export class EmailService {
    /**
     * Send an email
     */
    static async sendEmail(to: string, subject: string, html: string, text?: string) {
        try {
            if (!transporter && !process.env.SMTP_HOST) {
                // Mock sending in dev without generic SMTP
                logger.info(`📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
                logger.info(`   Body: ${text || 'HTML Body'}`);
                return true;
            }

            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || '"LogiQ Support" <support@logiq.com>',
                to,
                subject,
                text: text || 'Please enable HTML to view this email.',
                html,
            });

            logger.info(`📧 Email sent: ${info.messageId}`);

            // If using Ethereal, log the URL
            if (!IS_PRODUCTION && info.messageId) {
                logger.info(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }

            return true;
        } catch (error: any) {
            logger.error('❌ Error sending email:', error);
            return false;
        }
    }

    /**
     * Send Password Reset Link
     */
    static async sendPasswordReset(email: string, token: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const link = `${frontendUrl}/reset-password?token=${token}`;

        const subject = 'Reset Your LogiQ Password';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your LogiQ account.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p>Or copy this link: <a href="${link}">${link}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't ask for this, you can safely ignore this email.</p>
      </div>
    `;

        return this.sendEmail(email, subject, html, `Reset your password here: ${link}`);
    }

    /**
     * Send Account Invite
     */
    static async sendInvite(email: string, token: string, role: string) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const link = `${frontendUrl}/setup-account?token=${token}`;

        const subject = 'Welcome to LogiQ - Setup Your Account';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to LogiQ!</h2>
        <p>You have been invited to join LogiQ as a <strong>${role}</strong>.</p>
        <p>Click the button below to set up your password and activate your account:</p>
        <a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Setup Account</a>
        <p>Or copy this link: <a href="${link}">${link}</a></p>
        <p>This invite expires in 72 hours.</p>
      </div>
    `;

        return this.sendEmail(email, subject, html, `Setup your account here: ${link}`);
    }
}
