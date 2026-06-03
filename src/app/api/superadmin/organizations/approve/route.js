import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { sendEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser || !decodedUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Access restricted to Super Admins only.' }, { status: 403 });
    }

    const { orgId, status } = await req.json();

    if (!orgId || !['Approved', 'Pending', 'Suspended'].includes(status)) {
      return NextResponse.json({ error: 'Organization ID and valid status are required.' }, { status: 400 });
    }

    if (supabase) {
      // Update organization approval status and set is_active
      const isActive = status === 'Approved';
      const { data: updatedOrg, error: orgError } = await supabase
        .from('organizations')
        .update({
          approval_status: status,
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId)
        .select('*')
        .single();

      if (orgError) throw orgError;

      // Get owner user of this organization to notify them
      const { data: owner, error: ownerError } = await supabase
        .from('users')
        .select('name, email')
        .eq('org_id', orgId)
        .eq('role', 'owner')
        .maybeSingle();

      if (owner && !ownerError) {
        // Send email notification about status change
        const emailSubject = status === 'Approved' 
          ? '🎉 Congratulations! Your Innonsh CRM Company Has Been Approved!' 
          : '⚠️ Your Innonsh CRM Company Status Has Been Updated';

        const statusDescription = status === 'Approved' 
          ? 'has been <b>Approved and Activated</b> by the platform administrator. You can now log in and set up your team!' 
          : `status has been changed to <b>${status}</b> by the platform administrator. Please contact support for any questions.`;

        const welcomeHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Company Approval Notification</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Platform</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Hello ${owner.name},</h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                          We are pleased to inform you that your company <b>${updatedOrg.name}</b> ${statusDescription}
                        </p>
                        ${status === 'Approved' ? `
                        <div align="center" style="margin: 30px 0;">
                          <a href="${process.env.APP_URL || 'http://localhost:5000'}/login" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">Log In to CRM Dashboard</a>
                        </div>
                        ` : ''}
                        <p style="margin: 0; font-size: 13px; color: #64748b;">
                          If you have any questions, please contact support.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                        © ${new Date().getFullYear()} Innonsh CRM Platform. All rights reserved.
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
            toEmail: owner.email,
            toName: owner.name,
            subject: emailSubject,
            html: welcomeHtml,
            text: `Your company ${updatedOrg.name} status is now ${status}. Log in at ${process.env.APP_URL || 'http://localhost:5000'}/login`
          });
        } catch (emailErr) {
          console.error('Failed to send status update email to owner:', emailErr);
        }
      }

      return NextResponse.json({ success: true, message: `Organization status updated to ${status} successfully.`, organization: updatedOrg });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Superadmin POST approve error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
