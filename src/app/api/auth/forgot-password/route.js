import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { sendEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address syntax.' }, { status: 400 });
    }

    let user = null;

    // Generate a secure 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // DYNAMIC DATABASE DETECTOR
    if (supabase) {
      // 1. Verify user exists in Supabase
      const { data: supabaseUser, error: fetchError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase user check error:', fetchError);
        return NextResponse.json({ error: 'Database verification failed.' }, { status: 500 });
      }

      if (supabaseUser) {
        user = supabaseUser;

        // 3. Update otp_code and otp_expiry in Supabase
        const { error: updateError } = await supabase
          .from('users')
          .update({
            otp_code: otpCode,
            otp_expiry: otpExpiry.toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Supabase OTP update error:', updateError);
          return NextResponse.json({ error: 'Failed to generate verification OTP.' }, { status: 500 });
        }
      }
    } else {
      // Graceful fallback to MongoDB
      await connectToDatabase();
      const mongoUser = await User.findOne({ email: cleanEmail });

      if (mongoUser) {
        user = mongoUser;

        // Update otpCode and otpExpiry in MongoDB
        mongoUser.otpCode = otpCode;
        mongoUser.otpExpiry = otpExpiry;
        await mongoUser.save();
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'No employee account found with this email.' }, { status: 404 });
    }

    // 4. Send a premium styled HTML email using our sendEmail helper
    const emailSubject = `🔑 ${otpCode} is your CRM security verification code`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                
                <!-- Premium Sleek Brand Banner -->
                <tr>
                  <td style="background-color: #0f172a; padding: 24px 30px; text-align: left; border-bottom: 3px solid #10b981;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <span style="color: #ffffff; font-size: 18px; font-weight: 800; letter-spacing: -0.5px;">Innonsh CRM Suite</span>
                        </td>
                        <td align="right">
                          <span style="color: #10b981; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Security Verification</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #ffffff;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Forgot Password Verification</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Hi ${user.name || 'Team Member'},<br /><br />
                      We received a request to reset the password associated with your employee account. Use the verification code below to authorize this password change. This code is valid for <b>10 minutes</b>.
                    </p>

                    <!-- OTP Code Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center" style="padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #10b981; text-shadow: 1px 1px 1px rgba(0,0,0,0.05);">${otpCode}</span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                      If you did not request a password change, you can safely ignore this email. Your password will remain unchanged. For security, never share this code with anyone.
                    </p>
                  </td>
                </tr>

                <!-- Subtle Professional Footer -->
                <tr>
                  <td style="padding: 24px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                      This is an automated security transmission by Innonsh CRM Suite.<br />
                      If you have questions, please contact your systems administrator immediately.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 10px; color: #cbd5e1;">
                      © ${new Date().getFullYear()} Innonsh Technologies Private Limited. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const emailText = `Hi ${user.name},\n\nWe received a request to reset your password. Use the verification code below to authorize this change:\n\n${otpCode}\n\nThis code is valid for 10 minutes.\n\nBest regards,\nInnonsh CRM Suite`;

    // 5. Send Email
    await sendEmail({
      toEmail: cleanEmail,
      toName: user.name,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });

    return NextResponse.json({
      success: true,
      message: 'A security verification OTP code has been sent to your email.'
    });

  } catch (error) {
    console.error('Forgot password API error:', error);
    return NextResponse.json({ error: 'Internal server error during password reset request.' }, { status: 500 });
  }
}
