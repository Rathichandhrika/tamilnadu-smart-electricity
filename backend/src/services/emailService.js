const nodemailer = require('nodemailer');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const dns = require('dns');

// Force IPv4 DNS resolution first to avoid connect ENETUNREACH on IPv6
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Ensure environment variables are loaded regardless of how this module is invoked
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

/**
 * Filter non-deliverable / simulated domains to prevent Google Mailer-Daemon bounces
 */
const isDeliverableDomain = (email) => {
    if (!email || typeof email !== 'string') return false;
    const normalized = email.toLowerCase().trim();
    const domain = normalized.split('@')[1];
    if (!domain) return false;
    const nonDeliverable = ['smarttn.gov', 'example.com', 'test.com', 'localhost', 'invalid', 'dummy.com'];
    if (nonDeliverable.includes(domain)) return false;
    return true;
};

/**
 * Build array of transporter configs to attempt sequentially.
 * Primary: Gmail service with IPv4
 * Fallback 1: Direct SSL on port 465 with IPv4
 * Fallback 2: Direct STARTTLS on port 587 with IPv4
 */
const getTransporterCandidates = (user, pass, host, port) => {
    const candidates = [];
    const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');

    if (isGmail) {
        // Candidate 1: Direct SMTP SSL on port 465 (Most reliable for Gmail app passwords)
        candidates.push({
            name: 'Direct Gmail SMTP (SSL:465)',
            transporter: nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                family: 4, // Force IPv4 to prevent ENETUNREACH
                auth: { user, pass },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 20000,
                tls: { rejectUnauthorized: false }
            })
        });

        // Candidate 2: Standard Gmail service
        candidates.push({
            name: 'Gmail Service',
            transporter: nodemailer.createTransport({
                service: 'gmail',
                family: 4, // Force IPv4
                auth: { user, pass },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 20000
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
                family: 4, // Force IPv4
                auth: { user, pass },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 20000,
                tls: { rejectUnauthorized: false }
            })
        });
    } else {
        candidates.push({
            name: `Custom SMTP (${host}:${port})`,
            transporter: nodemailer.createTransport({
                host: host,
                port: port,
                secure: port === 465,
                family: 4,
                auth: { user, pass },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
                socketTimeout: 20000,
                tls: { rejectUnauthorized: false }
            })
        });
    }

    return candidates;
};

/**
 * Core Email Dispatcher across available SMTP transporters & Resend
 */
const dispatchEmail = async ({ toEmail, subject, plainTextContent, htmlContent }) => {
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465');
    const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const rawPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
    const pass = rawPass.replace(/\s+/g, ''); // Remove spaces
    const hasSmtpConfigured = Boolean(user && pass);

    console.log(`[EMAIL DISPATCH] Target: ${toEmail} | Subject: "${subject}"`);

    // Prevent Mailer-Daemon bounce by skipping external SMTP for mock / internal demo domains
    if (!isDeliverableDomain(toEmail)) {
        console.log(`[EMAIL SIMULATED] Skipping external SMTP dispatch for mock/internal domain: ${toEmail}. In-app alert created.`);
        return {
            success: true,
            sentOverSmtp: false,
            simulated: true,
            messageId: `simulated-${Date.now()}`,
            method: 'Internal Simulation'
        };
    }

    // 1. Try Resend HTTPS API if key is present
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
        console.warn('[EMAIL WARNING] SMTP credentials missing. EMAIL_USER or EMAIL_PASS not set.');
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

/**
 * Send Password Reset Verification Code to Consumer's Email
 */
const sendPasswordResetEmail = async (toEmail, resetCode, consumerName = 'Consumer') => {
    const subject = `Your TANGEDCO Password Reset Code: ${resetCode}`;

    const plainTextContent = `Hello ${consumerName},

We received a request to reset the password for your TANGEDCO Smart Electricity Consumer account (${toEmail}).

Your 6-Digit Verification Code is:
${resetCode}

This code is valid for 15 minutes. Enter this code on the verification screen to reset your password.

Warm regards,
TANGEDCO Smart Electricity Consumer Services
Government of Tamil Nadu
`;

    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.3);">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 10px 16px; margin-bottom: 12px;">
                <span style="font-size: 22px; color: #f59e0b; font-weight: 900; letter-spacing: 1px;">⚡ TANGEDCO</span>
            </div>
            <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 700;">தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மானக் கழகம்</h1>
            <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Smart Tamil Nadu Electricity Consumer Portal</p>
        </div>
        <div style="padding: 32px 24px;">
            <h2 style="color: #ffffff; font-size: 16px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">
                Password Reset Verification
            </h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                Hello <strong>${consumerName}</strong>,<br>
                Use the verification code below to reset your password:
            </p>
            <div style="background: rgba(15, 23, 42, 0.9); border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-family: monospace; letter-spacing: 8px; color: #f59e0b; font-weight: 900;">
                    ${resetCode}
                </span>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">Valid for 15 minutes.</p>
        </div>
        <div style="background: #090d16; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <p style="color: #64748b; font-size: 11px; margin: 0;">© 2026 TANGEDCO | Government of Tamil Nadu.</p>
        </div>
    </div>`;

    return dispatchEmail({ toEmail, subject, plainTextContent, htmlContent });
};

/**
 * Send Upcoming Bill Due Date Reminder to Consumer
 */
const sendDueDateReminderEmail = async ({
    toEmail,
    consumerName = 'Consumer',
    serviceNumber = 'N/A',
    amount = 0,
    dueDate = 'N/A',
    daysLeft = 2,
    billingMonth = 'Current Cycle',
    district = 'Tamil Nadu'
}) => {
    const payUrl = 'https://www.tnebnet.org/qpay/';
    const subject = `⏰ TANGEDCO Due Reminder: ₹${amount.toLocaleString()} due in ${daysLeft} days (Service: ${serviceNumber})`;

    const plainTextContent = `TANGEDCO - TAMIL NADU ELECTRICITY BOARD
BILL PAYMENT DUE DATE REMINDER

Dear ${consumerName},

This is an official statutory reminder that your electricity bill for ${billingMonth} is approaching its due date.

Bill Summary:
- Service Number: ${serviceNumber}
- District: ${district}
- Billing Cycle: ${billingMonth}
- Amount Payable: ₹${amount.toLocaleString()}
- Due Date: ${dueDate}
- Days Remaining: ${daysLeft} Days

Please pay online before the deadline via TANGEDCO Quick Pay:
${payUrl}

Note: Crossing the statutory due date will attract a late payment surcharge (LPSC) of ₹150.

Warm regards,
TANGEDCO Revenue & Billing Department
Government of Tamil Nadu
`;

    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.4);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 26px 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <div style="display: inline-block; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 8px 16px; margin-bottom: 10px;">
                <span style="font-size: 20px; color: #f59e0b; font-weight: 900; letter-spacing: 1px;">⚡ TANGEDCO</span>
            </div>
            <h1 style="color: #ffffff; font-size: 17px; margin: 0; font-weight: 700;">தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மானக் கழகம்</h1>
            <p style="color: #fbbf24; font-size: 12px; font-weight: 600; margin: 4px 0 0 0;">மின்கட்டணக் கடைசி நாள் நினைவூட்டல் (Due Date Reminder)</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px;">
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #fbbf24; font-weight: 700; margin: 0; font-size: 13px;">
                    ⏰ Attention: ${daysLeft} Days Remaining to Pay Without Penalty
                </p>
                <p style="color: #cbd5e1; font-size: 12px; margin: 4px 0 0 0;">
                    Hello <strong>${consumerName}</strong>, your electricity invoice for <strong>${billingMonth}</strong> is approaching the due date.
                </p>
            </div>

            <!-- Bill Details Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #1e293b; border-radius: 10px; overflow: hidden; font-size: 13px;">
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">Service Number:</td>
                    <td style="padding: 10px 16px; color: #f59e0b; font-weight: 700; font-family: monospace;">${serviceNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">District Circle:</td>
                    <td style="padding: 10px 16px; color: #ffffff; font-weight: 600;">${district}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">Billing Month:</td>
                    <td style="padding: 10px 16px; color: #ffffff;">${billingMonth}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">Statutory Due Date:</td>
                    <td style="padding: 10px 16px; color: #f87171; font-weight: 700;">${dueDate} (${daysLeft} Days Left)</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; color: #94a3b8; font-size: 14px;">Total Payable:</td>
                    <td style="padding: 12px 16px; color: #10b981; font-size: 20px; font-weight: 900; font-family: monospace;">₹${amount.toLocaleString()}</td>
                </tr>
            </table>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="${payUrl}" style="display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 14px; padding: 13px 32px; border-radius: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
                    Pay Electricity Bill Online (Quick Pay) →
                </a>
            </div>

            <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0;">
                Avoid late payment surcharge (₹150) and supply disconnection by settling before ${dueDate}.
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #090d16; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <p style="color: #64748b; font-size: 11px; margin: 0;">© 2026 TANGEDCO | Government of Tamil Nadu. All rights reserved.</p>
        </div>
    </div>`;

    return dispatchEmail({ toEmail, subject, plainTextContent, htmlContent });
};

/**
 * Send Overdue Surcharge Notice & Disconnection Warning to Consumer
 */
const sendOverdueFineNoticeEmail = async ({
    toEmail,
    consumerName = 'Consumer',
    serviceNumber = 'N/A',
    amount = 0,
    fineAmount = 150,
    totalPayable = 0,
    billingMonth = 'Current Cycle',
    dueDate = 'N/A',
    district = 'Tamil Nadu',
    fineReason = 'TANGEDCO Late Payment Surcharge (LPSC)'
}) => {
    const payUrl = 'https://www.tnebnet.org/qpay/';
    const subject = `⚠️ URGENT: TANGEDCO Overdue Notice & Fine Imposed (Service: ${serviceNumber}) - Total Due: ₹${totalPayable.toLocaleString()}`;

    const plainTextContent = `TANGEDCO - TAMIL NADU ELECTRICITY BOARD
STATUTORY OVERDUE NOTICE & LATE SURCHARGE IMPOSED

Dear ${consumerName},

Your electricity bill of ₹${amount.toLocaleString()} for ${billingMonth} (Service Number: ${serviceNumber}, District: ${district}) is past its statutory due date (${dueDate}).

A late payment surcharge (LPSC) of ₹${fineAmount} has been imposed.

Statement of Dues:
- Service Number: ${serviceNumber}
- District: ${district}
- Billing Month: ${billingMonth}
- Original Bill: ₹${amount.toLocaleString()}
- Late Surcharge (Fine): +₹${fineAmount.toLocaleString()}
- Total Amount Payable: ₹${totalPayable.toLocaleString()}
- Surcharge Reason: ${fineReason}

IMPORTANT DISCONNECTION WARNING:
Under Tamil Nadu Electricity Supply Code regulations, failure to pay immediately may result in temporary power disconnection.

Pay immediately online via TANGEDCO Quick Pay:
${payUrl}

TANGEDCO Revenue Collection & Enforcement
Government of Tamil Nadu
`;

    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 2px solid #ef4444;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #450a0a 0%, #0f172a 100%); padding: 26px 24px; text-align: center; border-bottom: 2px solid #ef4444;">
            <div style="display: inline-block; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 12px; padding: 8px 16px; margin-bottom: 10px;">
                <span style="font-size: 20px; color: #f87171; font-weight: 900; letter-spacing: 1px;">⚡ TANGEDCO ENFORCEMENT</span>
            </div>
            <h1 style="color: #ffffff; font-size: 17px; margin: 0; font-weight: 700;">தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மானக் கழகம்</h1>
            <p style="color: #f87171; font-size: 12px; font-weight: 700; margin: 4px 0 0 0;">தாமத அபராதக் கட்டணம் மற்றும் துண்டிப்பு எச்சரிக்கை (Overdue Notice)</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px;">
            <div style="background: rgba(239, 68, 68, 0.12); border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #f87171; font-weight: 800; margin: 0; font-size: 13px;">
                    ⚠️ STATUTORY NOTICE: PAYMENT PAST DUE DATE
                </p>
                <p style="color: #cbd5e1; font-size: 12px; margin: 6px 0 0 0; line-height: 1.5;">
                    Consumer <strong>${consumerName}</strong>, your electricity invoice for <strong>${billingMonth}</strong> crossed its deadline of <strong>${dueDate}</strong> without payment. An administrative surcharge has been levied.
                </p>
            </div>

            <!-- Dues Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #1e293b; border-radius: 10px; overflow: hidden; font-size: 13px;">
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">Service Number:</td>
                    <td style="padding: 10px 16px; color: #f59e0b; font-weight: 700; font-family: monospace;">${serviceNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">District Circle:</td>
                    <td style="padding: 10px 16px; color: #ffffff; font-weight: 600;">${district}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #94a3b8;">Original Energy Bill:</td>
                    <td style="padding: 10px 16px; color: #ffffff;">₹${amount.toLocaleString()}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <td style="padding: 10px 16px; color: #f87171;">Late Payment Surcharge:</td>
                    <td style="padding: 10px 16px; color: #f87171; font-weight: 700;">+₹${fineAmount.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; color: #94a3b8; font-size: 14px;">Total Payable Immediately:</td>
                    <td style="padding: 12px 16px; color: #f87171; font-size: 22px; font-weight: 900; font-family: monospace;">₹${totalPayable.toLocaleString()}</td>
                </tr>
            </table>

            <!-- Warning Notice -->
            <div style="background: #0f172a; border: 1px dashed rgba(239, 68, 68, 0.4); border-radius: 10px; padding: 12px 16px; margin-bottom: 22px; text-align: center;">
                <p style="color: #fca5a5; font-size: 11px; margin: 0;">
                    Reason: <em>${fineReason}</em>. Power line disconnection protocol will be initiated if not settled promptly.
                </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 16px;">
                <a href="${payUrl}" style="display: inline-block; background: #ef4444; color: #ffffff; font-weight: 800; font-size: 14px; padding: 14px 34px; border-radius: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);">
                    Pay Overdue Bill Now (Quick Pay) →
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #090d16; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <p style="color: #64748b; font-size: 11px; margin: 0;">© 2026 TANGEDCO | Government of Tamil Nadu. All rights reserved.</p>
        </div>
    </div>`;

    return dispatchEmail({ toEmail, subject, plainTextContent, htmlContent });
};

/**
 * Send Notification to Administrator regarding consumer e-KYC document upload
 */
const sendAdminKycNotificationEmail = async ({
    adminEmail,
    consumerName = 'Consumer',
    serviceNumber = 'N/A',
    documentType = 'Identity / Property Tax Proof',
    consumerEmail = 'N/A',
    district = 'Tamil Nadu'
}) => {
    const adminUrl = `${process.env.FRONTEND_URL || 'https://tamilnadu-smart-electricity.vercel.app'}/admin?tab=VERIFICATION`;
    const subject = `📄 Action Required: New e-KYC Upload by ${consumerName} (${serviceNumber} - ${district})`;

    const plainTextContent = `TANGEDCO EXECUTIVE ADMIN ALERT
NEW e-KYC DOCUMENT UPLOADED FOR VERIFICATION

Consumer ${consumerName} has uploaded a new document for administrative accreditation.

Details:
- Consumer Name: ${consumerName}
- Email: ${consumerEmail}
- Service Number: ${serviceNumber}
- District Circle: ${district}
- Document Type: ${documentType}

Please inspect and approve/reject the document in the Admin Portal:
${adminUrl}

TANGEDCO Central Management System
`;

    const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.4);">
        <div style="background: #1e293b; padding: 22px 24px; text-align: center; border-bottom: 2px solid #f59e0b;">
            <span style="font-size: 20px; color: #f59e0b; font-weight: 900;">⚡ TANGEDCO ADMIN HUB</span>
            <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">New Consumer Accreditation Upload</p>
        </div>
        <div style="padding: 24px;">
            <p style="color: #cbd5e1; font-size: 13px; margin-top: 0;">
                A new e-KYC document has been submitted and is waiting for your administrative inspection:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #1e293b; border-radius: 8px; font-size: 12px;">
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 8px 12px; color: #94a3b8;">Consumer:</td>
                    <td style="padding: 8px 12px; color: #ffffff; font-weight: 700;">${consumerName} (${consumerEmail})</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 8px 12px; color: #94a3b8;">Service Number:</td>
                    <td style="padding: 8px 12px; color: #f59e0b; font-weight: 700; font-family: monospace;">${serviceNumber}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 8px 12px; color: #94a3b8;">District:</td>
                    <td style="padding: 8px 12px; color: #ffffff;">${district}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 12px; color: #94a3b8;">Document Type:</td>
                    <td style="padding: 8px 12px; color: #10b981; font-weight: 600;">${documentType}</td>
                </tr>
            </table>
            <div style="text-align: center;">
                <a href="${adminUrl}" style="display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 13px; padding: 11px 26px; border-radius: 10px; text-decoration: none;">
                    Inspect & Approve in Admin Portal →
                </a>
            </div>
        </div>
    </div>`;

    return dispatchEmail({ toEmail: adminEmail, subject, plainTextContent, htmlContent });
};

module.exports = {
    sendPasswordResetEmail,
    sendDueDateReminderEmail,
    sendOverdueFineNoticeEmail,
    sendAdminKycNotificationEmail
};
