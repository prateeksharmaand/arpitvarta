const nodemailer = require('nodemailer');

// SMTP is configured via env. Without it (local dev) emails are printed to
// the console instead of sent, so onboarding flows still work end to end.
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true });

const FROM = process.env.SMTP_FROM || '"ArpitVarta" <support@arpitvarta.com>';

exports.sendProfessionalWelcome = async ({ to, name, email, password, loginUrl }) => {
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: '🎉 Welcome to ArpitVarta — Your Professional Account is Ready',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0D0D0D;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#7C3AED;padding:28px 32px;">
          <h1 style="margin:0;font-size:22px;">Welcome to ArpitVarta, ${name}!</h1>
          <p style="margin:8px 0 0;opacity:0.85;font-size:14px;">Your professional account has been activated.</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#aaa;font-size:14px;">Your application has been reviewed and approved. Here are your login credentials:</p>
          <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:10px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 10px;color:#aaa;font-size:13px;">Login Email</p>
            <p style="margin:0 0 18px;font-size:16px;font-weight:bold;">${email}</p>
            <p style="margin:0 0 10px;color:#aaa;font-size:13px;">Temporary Password</p>
            <p style="margin:0;font-size:20px;font-weight:bold;color:#7C3AED;letter-spacing:2px;">${password}</p>
          </div>
          <p style="color:#aaa;font-size:14px;">Sign in to the ArpitVarta Pro app or the professional portal${loginUrl ? ` at <a style="color:#7C3AED" href="${loginUrl}">${loginUrl}</a>` : ''} and change your password on first login.</p>
          <p style="margin-top:28px;color:#666;font-size:12px;">If you have any questions, reply to this email.</p>
        </div>
      </div>
    `,
  });
  if (!process.env.SMTP_HOST) console.log(`[mailer] SMTP not configured — would have emailed ${to} (temp password: ${password})`);
  return info;
};
