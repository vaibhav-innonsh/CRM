import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import Email from '@/lib/models/Email';
import { supabase } from '@/lib/supabaseClient';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';


// POST /api/auth/register - Self-signup endpoint for Sales Executives (requires Manager approval)
export async function POST(req) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required fields.' }, { status: 400 });
    }

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address syntax.' }, { status: 400 });
    }

    if (!['sales_rep', 'sales_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden. Invalid system role signup request.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Security password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const hashedPassword = await hashPassword(password);

    let newUser = null;
    let userId = null;
    let userName = null;
    let userEmail = null;
    let userApprovalStatus = 'Pending';

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      // Check if user already exists in Supabase
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (checkError) {
        console.error('Supabase user check error:', checkError);
      }

      if (existingUser) {
        return NextResponse.json({ error: 'An employee account with this email is already registered.' }, { status: 400 });
      }

      // Create user in Supabase
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role,
            approval_status: 'Pending',
            is_active: false
          }
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase user creation error:', insertError);
        throw insertError;
      }

      newUser = insertedUser;
      userId = insertedUser.id;
      userName = insertedUser.name;
      userEmail = insertedUser.email;
      userApprovalStatus = insertedUser.approval_status;

      // Send welcome email to applicant
      const roleName = role === 'sales_admin' ? 'Sales Manager' : 'Sales Representative';
      const welcomeSubject = '👋 Welcome to Innonsh CRM Suite - Registration Pending';
      const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Pending Approval</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                      <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Suite</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Welcome to the Team, ${userName}!</h2>
                      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                        Thank you for registering an employee account with Innonsh CRM Suite. Your request to join as a <b>${roleName}</b> is currently <b>Pending Approval</b> by a systems administrator.
                      </p>
                      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; font-size: 13px; color: #b45309; line-height: 1.5; margin-bottom: 20px;">
                        🔒 <b>Status: Pending Activation</b><br />
                        You will be notified by email as soon as an administrator approves your account. You will not be able to log in until then.
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #64748b;">
                        If you have any questions or did not initiate this request, please contact support.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                      © ${new Date().getFullYear()} Innonsh CRM Suite. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await sendEmail({
          toEmail: userEmail,
          toName: userName,
          subject: welcomeSubject,
          html: welcomeHtml,
          text: `Welcome to Innonsh CRM, ${userName}! Your account registration for the role of ${roleName} is currently pending manager approval.`
        });

        // Log welcome email in database outbox
        try {
          await supabase
            .from('emails')
            .insert([
              {
                subject: welcomeSubject,
                body: welcomeHtml,
                sent_by: userId,
                channel: 'email',
                opens_count: 0,
                opened_at: [],
                downloads_count: 0,
                downloaded_at: [],
                replied: false,
                reply_body: ''
              }
            ]);
        } catch (dbLogErr) {
          console.error('Failed to log welcome email in database:', dbLogErr);
        }
      } catch (welcomeErr) {
        console.error('Failed to send welcome email to applicant:', welcomeErr);
      }

      // Query active administrators to notify them of new access request
      try {
        const { data: admins, error: adminError } = await supabase
          .from('users')
          .select('name, email')
          .in('role', ['owner', 'sales_admin']);

        if (!adminError && admins && admins.length > 0) {
          const appUrl = process.env.APP_URL || 'http://localhost:5000';
          const approvalSubject = `⚡ Action Required: New CRM Account Request from ${userName}`;

          for (const admin of admins) {
            const approvalHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Access Request Moderation</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
                  <tr>
                    <td align="center">
                      <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                        <tr>
                          <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                            <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Suite</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Access Moderation Required</h2>
                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                              Hello ${admin.name},<br /><br />
                              A new employee has registered for a CRM account and requires administrative review to log in:
                            </p>
                            <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px;">
                              <tr>
                                <td style="font-weight: bold; color: #475569; width: 120px;">Name:</td>
                                <td style="color: #1e293b;">${userName}</td>
                              </tr>
                              <tr>
                                <td style="font-weight: bold; color: #475569;">Email:</td>
                                <td style="color: #1e293b;">${userEmail}</td>
                              </tr>
                              <tr>
                                <td style="font-weight: bold; color: #475569;">Requested Role:</td>
                                <td style="color: #10b981; font-weight: bold;">${roleName}</td>
                              </tr>
                            </table>
                            <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b;">
                              Either the CRM Owner or any Sales Manager can approve or reject this request. Click the button below to open the user moderation panel:
                            </p>
                            <div align="center">
                              <a href="${appUrl}/dashboard/users" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Moderate Access Request</a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                            © ${new Date().getFullYear()} Innonsh CRM Suite. All rights reserved.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `;

            await sendEmail({
              toEmail: admin.email,
              toName: admin.name,
              subject: approvalSubject,
              html: approvalHtml,
              text: `New registration request from ${userName} (${userEmail}) for the role of ${roleName}. Please approve at ${appUrl}/dashboard/users`
            });

            // Log admin approval notification in database outbox
            try {
              await supabase
                .from('emails')
                .insert([
                  {
                    subject: approvalSubject,
                    body: approvalHtml,
                    sent_by: userId,
                    channel: 'email',
                    opens_count: 0,
                    opened_at: [],
                    downloads_count: 0,
                    downloaded_at: [],
                    replied: false,
                    reply_body: ''
                  }
                ]);
            } catch (dbLogErr) {
              console.error(`Failed to log admin approval email to ${admin.email} in database:`, dbLogErr);
            }
          }
        }
      } catch (adminErr) {
        console.error('Failed to notify admins of registration request:', adminErr);
      }
    } else {

      // Graceful fallback to MongoDB
      await connectToDatabase();
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return NextResponse.json({ error: 'An employee account with this email is already registered.' }, { status: 400 });
      }

      // Create user in MongoDB
      const mongoUser = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role,
        approvalStatus: 'Pending',
        isActive: false
      });

      newUser = mongoUser;
      userId = mongoUser._id;
      userName = mongoUser.name;
      userEmail = mongoUser.email;
      userApprovalStatus = mongoUser.approvalStatus;

      // Send welcome email to applicant
      const roleName = role === 'sales_admin' ? 'Sales Manager' : 'Sales Representative';
      const welcomeSubject = '👋 Welcome to Innonsh CRM Suite - Registration Pending';
      const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Pending Approval</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  <tr>
                    <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                      <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Suite</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Welcome to the Team, ${userName}!</h2>
                      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                        Thank you for registering an employee account with Innonsh CRM Suite. Your request to join as a <b>${roleName}</b> is currently <b>Pending Approval</b> by a systems administrator.
                      </p>
                      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; font-size: 13px; color: #b45309; line-height: 1.5; margin-bottom: 20px;">
                        🔒 <b>Status: Pending Activation</b><br />
                        You will be notified by email as soon as an administrator approves your account. You will not be able to log in until then.
                      </div>
                      <p style="margin: 0; font-size: 13px; color: #64748b;">
                        If you have any questions or did not initiate this request, please contact support.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                      © ${new Date().getFullYear()} Innonsh CRM Suite. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        await sendEmail({
          toEmail: userEmail,
          toName: userName,
          subject: welcomeSubject,
          html: welcomeHtml,
          text: `Welcome to Innonsh CRM, ${userName}! Your account registration for the role of ${roleName} is currently pending manager approval.`
        });

        // Insert welcome email to MongoDB outbox
        try {
          await Email.create({
            subject: welcomeSubject,
            body: welcomeHtml,
            sentBy: userId,
            channel: 'email',
            opensCount: 0,
            openedAt: [],
            downloadsCount: 0,
            downloadedAt: [],
            replied: false,
            replyBody: ''
          });
        } catch (dbLogErr) {
          console.error('Failed to log MongoDB welcome email:', dbLogErr);
        }
      } catch (welcomeErr) {
        console.error('Failed to send welcome email to applicant:', welcomeErr);
      }

      // Query active administrators to notify them of new access request in MongoDB
      try {
        const admins = await User.find({ role: { $in: ['owner', 'sales_admin'] } });

        if (admins && admins.length > 0) {
          const appUrl = process.env.APP_URL || 'http://localhost:5000';
          const approvalSubject = `⚡ Action Required: New CRM Account Request from ${userName}`;

          for (const admin of admins) {
            const approvalHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Access Request Moderation</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
                  <tr>
                    <td align="center">
                      <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                        <tr>
                          <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                            <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Suite</span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Access Moderation Required</h2>
                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                              Hello ${admin.name},<br /><br />
                              A new employee has registered for a CRM account and requires administrative review to log in:
                            </p>
                            <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px;">
                              <tr>
                                <td style="font-weight: bold; color: #475569; width: 120px;">Name:</td>
                                <td style="color: #1e293b;">${userName}</td>
                              </tr>
                              <tr>
                                <td style="font-weight: bold; color: #475569;">Email:</td>
                                <td style="color: #1e293b;">${userEmail}</td>
                              </tr>
                               <tr style="font-weight: bold; color: #475569;">
                                <td style="font-weight: bold; color: #475569;">Requested Role:</td>
                                <td style="color: #10b981; font-weight: bold;">${roleName}</td>
                              </tr>
                            </table>
                            <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b;">
                              Either the CRM Owner or any Sales Manager can approve or reject this request. Click the button below to open the user moderation panel:
                            </p>
                            <div align="center">
                              <a href="${appUrl}/dashboard/users" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">Moderate Access Request</a>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                            © ${new Date().getFullYear()} Innonsh CRM Suite. All rights reserved.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `;

            await sendEmail({
              toEmail: admin.email,
              toName: admin.name,
              subject: approvalSubject,
              html: approvalHtml,
              text: `New registration request from ${userName} (${userEmail}) for the role of ${roleName}. Please approve at ${appUrl}/dashboard/users`
            });

            // Insert admin approval email to MongoDB outbox
            try {
              await Email.create({
                subject: approvalSubject,
                body: approvalHtml,
                sentBy: userId,
                channel: 'email',
                opensCount: 0,
                openedAt: [],
                downloadsCount: 0,
                downloadedAt: [],
                replied: false,
                replyBody: ''
              });
            } catch (dbLogErr) {
              console.error(`Failed to log admin approval email to ${admin.email} in database:`, dbLogErr);
            }
          }
        }
      } catch (adminErr) {
        console.error('Failed to notify admins of registration request:', adminErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Registration requested successfully! Your account is pending manager approval.',
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        approvalStatus: userApprovalStatus
      }
    });
  } catch (error) {
    console.error('Self registration API error:', error);
    return NextResponse.json({ error: 'Internal server error during registration.' }, { status: 500 });
  }
}
