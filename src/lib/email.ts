import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

  const resend = getResend();
  await resend.emails.send({
    from: "Toolfolk <onboarding@resend.dev>",
    to: email,
    subject: "Verify your email — Toolfolk",
    html: buildVerificationEmail(verifyUrl),
  });
}

function buildVerificationEmail(verifyUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">&#128295;</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Toolfolk</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Everyone Can Create</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #111827; text-align: center;">Verify your email</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b7280; text-align: center;">
                Thanks for joining Toolfolk! Click the button below to verify your email address and start sharing tools with the community.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${verifyUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-size: 16px; font-weight: 600; letter-spacing: 0.2px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #9ca3af; text-align: center;">
                This link expires in 24 hours. If you didn't create a Toolfolk account, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #d1d5db; text-align: center;">
                Button not working? Copy and paste this link:<br />
                <a href="${verifyUrl}" style="color: #6366f1; word-break: break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &#128295; Toolfolk — Share and discover simple tools<br />
                Ideas matter most.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
