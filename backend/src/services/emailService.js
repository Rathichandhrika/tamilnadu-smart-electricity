const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded regardless of how this module is invoked
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();



/**
 * Build array of transporter configs to attempt sequentially.
 * Primary: Gmail service
 * Fallback 1: Direct SSL on port 465
 * Fallback 2: Direct STARTTLS on port 587
 */
const getTransporterCandidates = (user, pass, host, port) => {
    const candidates = [];
    const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');

    if (isGmail) {
        // Candidate 1: Standard Gmail service
        candidates.push({
            name: 'Gmail Service',
            transporter: nodemailer.createTransport({
                service: 'gmail',
                auth: { user, pass },
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 30000
            })
        });

        // Candidate 2: Direct SMTP SSL on port 465
        candidates.push({
            name: 'Direct Gmail SMTP (SSL:465)',
            transporter: nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: { user, pass },
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 30000,
                tls: { rejectUnauthorized: false }
            })
        });

        // Candidate 3: Direct SMTP STARTTLS on port 587
        candidates.push({
            name: 'Direct Gmail SMTP (STARTTLS:587)',
            transporter: nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                requireTLS: true,
                auth: { user, pass },
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 30000,
                tls: { rejectUnauthorized: false }
            })
        });
    } else {
        // Custom SMTP server configuration
        candidates.push({
            name: `Custom SMTP (${host}:${port})`,
            transporter: nodemailer.createTransport({
                host: host,
                port: port,
                secure: port === 465,
                auth: { user, pass },
                connectionTimeout: 20000,
                greetingTimeout: 20000,
                socketTimeout: 30000,
                tls: { rejectUnauthorized: false }
            })
        });
    }

    return candidates;
};

/**
 * Send Password Reset Verification Code to Consumer's Email
 * @param {string} toEmail - Recipient email address
 * @param {string} resetCode - 6-digit verification code
 * @param {string} consumerName - Consumer's name
 */
const sendPasswordResetEmail = async (toEmail, resetCode, consumerName = 'Consumer') => {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465');
    const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
    const pass = rawPass.replace(/\s+/g, ''); // Remove any spaces from Google App Password
    const hasSmtpConfigured = Boolean(user && pass);

    console.log('\n======================================================');
    console.log(`✉️ [EMAIL DISPATCH INITIATED] Target: ${toEmail} | Code: >>> ${resetCode} <<<`);
    console.log(`✉️ [SMTP CONFIG] User: ${user ? user : 'NOT SET'} | Host: ${host}:${port}`);
    console.log('======================================================\n');

    const subject = `Your TANGEDCO Password Reset Code: ${resetCode}`;

    const plainTextContent = `Hello ${consumerName},

We received a request to reset the password for your TANGEDCO Smart Electricity Consumer account (${toEmail}).

Your 6-Digit Verification Code is:
${resetCode}

This code is valid for 15 minutes. Enter this code on the verification screen to reset your password.

SECURITY NOTICE:
Never share this verification code with anyone. TANGEDCO officials will never ask for your verification code or password.

If you did not initiate this request, your account remains secure and you can safely ignore this email.

Warm regards,
TANGEDCO Smart Electricity Consumer Services
Government of Tamil Nadu
© 2026 TANGEDCO. All rights reserved.
`;

    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.3);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 10px 16px; margin-bottom: 12px;">
                <span style="font-size: 22px; color: #f59e0b; font-weight: 900; letter-spacing: 1px;">⚡ TANGEDCO</span>
            </div>
            <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: 0.5px;">தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மானக் கழகம்</h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Smart Tamil Nadu Electricity Consumer Portal</p>
        </div>

        <!-- Body Content -->
        <div style="padding: 32px 24px;">
            <h2 style="color: #ffffff; font-size: 16px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">
                Password Reset Verification
            </h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                Hello <strong>${consumerName}</strong>,<br>
                We received a request to reset the password for your account associated with <strong>${toEmail}</strong>. Use the verification code below to complete the reset:
            </p>

            <!-- Code Display Box -->
            <div style="background: rgba(15, 23, 42, 0.9); border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #f59e0b; letter-spacing: 2px; font-weight: 700; margin-bottom: 8px;">
                    6-Digit Verification Code
                </div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #ffffff; text-shadow: 0 0 15px rgba(245, 158, 11, 0.4);">
                    ${resetCode}
                </div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                    ⏱️ Code expires in <strong>15 minutes</strong>
                </div>
            </div>

            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                Enter this 6-digit code on the portal verification screen to set your new password.
            </p>

            <!-- Security Alert Notice -->
            <div style="background: rgba(30, 41, 59, 0.6); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;">
                <p style="color: #cbd5e1; font-size: 12px; margin: 0; line-height: 1.5;">
                    🔒 <strong>Security Warning:</strong> Never share this code with anyone. TANGEDCO officials will never ask for your verification code or password.
                </p>
            </div>

            <p style="color: #64748b; font-size: 12px; margin-top: 24px; margin-bottom: 0;">
                If you did not initiate this request, you can safely ignore this email. Your current password remains secure.
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #090d16; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <p style="color: #64748b; font-size: 11px; margin: 0;">
                © 2026 TANGEDCO | Government of Tamil Nadu. All rights reserved.
            </p>
        </div>
    </div>
    `;



    // 1. Try Resend HTTPS API if key is present (useful for cloud environments)
    if (process.env.RESEND_API_KEY) {
        try {
            const res = await axios.post('https://api.resend.com/emails', {
                from: process.env.EMAIL_FROM || 'Smart TN Electricity <onboarding@resend.dev>',
                to: [toEmail],
                subject: subject,
                text: plainTextContent,
                html: htmlContent
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 8000
            });
            return { success: true, sentOverSmtp: true, messageId: res.data.id, method: 'Resend API' };
        } catch (apiErr) {
            console.warn('[WARN] Resend API error:', apiErr.response ? apiErr.response.data : apiErr.message);
        }
    }

    if (!hasSmtpConfigured) {
        console.error('[EMAIL ERROR] SMTP credentials missing. EMAIL_USER or EMAIL_PASS not set.');
        return { 
            success: false, 
            sentOverSmtp: false, 
            error: 'SMTP credentials missing. Please set EMAIL_USER and EMAIL_PASS in environment.' 
        };
    }

    // 2. Cascade through available SMTP transporter configurations
    const candidates = getTransporterCandidates(user, pass, host, port);
    const fromAddress = `"Smart TN Electricity (TANGEDCO)" <${user}>`;
    let lastError = null;

    for (const candidate of candidates) {
        try {
            console.log(`[EMAIL] Attempting dispatch via candidate: ${candidate.name}...`);
            const mailOptions = {
                from: fromAddress,
                to: toEmail,
                replyTo: user,
                subject: subject,
                text: plainTextContent,
                html: htmlContent,
                headers: {
                    'X-Priority': '1',
                    'X-MSMail-Priority': 'High',
                    'Importance': 'high'
                }
            };

            const info = await candidate.transporter.sendMail(mailOptions);
            console.log(`[EMAIL SUCCESS] Dispatched to ${toEmail} via ${candidate.name}. MessageID: ${info.messageId}`);
            
            return {
                success: true,
                sentOverSmtp: true,
                messageId: info.messageId,
                method: candidate.name
            };
        } catch (err) {
            console.warn(`[WARN] Candidate ${candidate.name} failed:`, err.message);
            lastError = err;
        }
    }

    console.error(`[EMAIL ERROR] All SMTP dispatch candidates failed for ${toEmail}:`, lastError ? lastError.message : 'Unknown error');
    return {
        success: false,
        sentOverSmtp: false,
        error: lastError ? lastError.message : 'All SMTP delivery methods failed'
    };
};

module.exports = {
    sendPasswordResetEmail
};
