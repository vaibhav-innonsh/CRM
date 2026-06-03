import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/superadmin/module-requests - Fetch all module requests (Super Admins only)
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!decodedUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden. Access restricted to platform administrators.' }, { status: 403 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client is not configured.' }, { status: 500 });
    }

    // Query requests joined with organization and requester details
    const { data, error } = await supabase
      .from('module_requests')
      .select(`
        *,
        organizations ( id, name ),
        users:requested_by ( id, name, email )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Superadmin fetch module requests failed:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      requests: data
    });

  } catch (error) {
    console.error('Superadmin get requests error:', error);
    return NextResponse.json({ error: 'Internal server error while retrieving requests.' }, { status: 500 });
  }
}

// PUT /api/superadmin/module-requests - Approve or Decline a module request
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!decodedUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden. Access restricted to platform administrators.' }, { status: 403 });
    }

    const { requestId, action, notes } = await req.json();

    if (!requestId || !action || !['Approve', 'Decline'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid parameters. requestId and action (Approve/Decline) are required.' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client is not configured.' }, { status: 500 });
    }

    // 1. Fetch the request details to verify
    const { data: request, error: fetchError } = await supabase
      .from('module_requests')
      .select(`
        *,
        organizations ( id, name, enabled_modules ),
        users:requested_by ( id, name, email )
      `)
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError || !request) {
      console.error('Fetch request detail failed:', fetchError);
      return NextResponse.json({ error: 'Activation request profile not found.' }, { status: 404 });
    }

    if (request.status !== 'Pending') {
      return NextResponse.json({ error: `This request has already been processed with status: ${request.status}.` }, { status: 400 });
    }

    // Helper display name resolver
    const getModuleDisplayName = (slug) => {
      switch (slug) {
        case 'leads': return 'Leads Directory';
        case 'contacts': return 'Contacts Directory';
        case 'deals': return 'Deals Pipeline';
        case 'emails': return 'Email Hub';
        case 'tasks': return 'Tasks Manager & Reminders';
        case 'calls': return 'Call Logs & Record Suite';
        case 'meetings': return 'Meetings & Calendar Scheduler';
        case 'products': return 'Products Catalogue';
        case 'quotations': return 'Quotations Builder';
        case 'invoices': return 'Invoices & Billing Hub';
        case 'reports': return 'Sales Reports Builder';
        case 'analytics': return 'BI Analytics & Forecasting';
        case 'users': return 'Users & Employee Directory';
        case 'roles': return 'Roles & Permission Gates';
        case 'teams': return 'Teams & Department Manager';
        default: return slug.charAt(0).toUpperCase() + slug.slice(1);
      }
    };

    const moduleDisplayName = getModuleDisplayName(request.module_name);

    if (action === 'Approve') {
      // A. Append module_name to organization's enabled_modules
      const currentModules = request.organizations.enabled_modules || [];
      const updatedModules = Array.from(new Set([...currentModules, request.module_name]));

      const { error: orgUpdateError } = await supabase
        .from('organizations')
        .update({ enabled_modules: updatedModules })
        .eq('id', request.org_id);

      if (orgUpdateError) {
        console.error('Update org modules failed:', orgUpdateError);
        return NextResponse.json({ error: 'Failed to update organization modules licensing.' }, { status: 500 });
      }

      // B. Update request status to 'Approved'
      const { error: requestUpdateError } = await supabase
        .from('module_requests')
        .update({
          status: 'Approved',
          admin_notes: notes || 'Approved by Super Admin.',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestUpdateError) {
        console.error('Update request status failed:', requestUpdateError);
      }

      // C. Dispatch system notification to tenant owner
      await createNotification(
        request.requested_by,
        'System',
        '🎉 Feature Module Approved!',
        `Super Admin has approved your request to activate the "${moduleDisplayName}" module! Please reload to access it.`,
        `/dashboard/${request.module_name}`,
        decodedUser.id
      );

      // D. Send automated email notification to tenant owner
      try {
        const appUrl = process.env.APP_URL || 'http://localhost:5000';
        const emailSubject = `🟢 Feature Activated: "${moduleDisplayName}" is now ready!`;
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Module Activation Approved</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Suite</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 45px 30px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Subscription Module Activated!</h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                          Hi ${request.users.name},<br /><br />
                          We are excited to inform you that your request to activate the **${moduleDisplayName}** module has been **approved**!
                        </p>
                        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; font-size: 13px; color: #065f46; line-height: 1.5; margin-bottom: 24px;">
                          🚀 <b>Module Name:</b> ${moduleDisplayName}<br />
                          🟢 <b>Status:</b> Active & Licensed<br />
                          Please refresh your browser window to see the new feature in your dashboard sidebar!
                        </div>
                        <div align="center">
                          <a href="${appUrl}/dashboard/${request.module_name}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;">Go to Dashboard</a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                        © ${new Date().getFullYear()} Innonsh Technologies Private Limited. All rights reserved.
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
          toEmail: request.users.email,
          toName: request.users.name,
          subject: emailSubject,
          html: htmlBody,
          text: `Congratulations! Super Admin approved access to the ${moduleDisplayName} module for your organization. Go to ${appUrl}/dashboard`
        });
      } catch (emailErr) {
        console.error('Failed to send activation success email:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Activation request for ${moduleDisplayName} has been successfully approved.`
      });

    } else if (action === 'Decline') {
      // A. Update request status to 'Declined'
      const { error: requestUpdateError } = await supabase
        .from('module_requests')
        .update({
          status: 'Declined',
          admin_notes: notes || 'Declined by Super Admin.',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestUpdateError) {
        console.error('Update request status failed:', requestUpdateError);
        return NextResponse.json({ error: 'Failed to process request status update.' }, { status: 500 });
      }

      // B. Dispatch system notification to tenant owner
      await createNotification(
        request.requested_by,
        'System',
        '🔒 Activation Request Update',
        `Super Admin reviewed and declined your request to activate the "${moduleDisplayName}" module. Notes: ${notes || 'No reason provided.'}`,
        '/dashboard/settings',
        decodedUser.id
      );

      // C. Send automated email notification to tenant owner
      try {
        const emailSubject = `🔒 Update: Request to activate "${moduleDisplayName}" module`;
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Module Activation Request Update</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh CRM Suite</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 45px 30px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Module Request Declined</h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                          Hi ${request.users.name},<br /><br />
                          We have reviewed your request to activate the **${moduleDisplayName}** module. Unfortunately, the request has been **declined** at this time.
                        </p>
                        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; font-size: 13px; color: #9f1239; line-height: 1.5; margin-bottom: 24px;">
                          ❌ <b>Module Name:</b> ${moduleDisplayName}<br />
                          📌 <b>Reason / Notes:</b> ${notes || 'No reason provided by administrator.'}<br />
                          If you have any questions, please contact billing support or try requesting again later.
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 10px; color: #cbd5e1;">
                        © ${new Date().getFullYear()} Innonsh Technologies Private Limited. All rights reserved.
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
          toEmail: request.users.email,
          toName: request.users.name,
          subject: emailSubject,
          html: htmlBody,
          text: `Update: Super Admin declined your request to activate the ${moduleDisplayName} module. Notes: ${notes || 'None'}`
        });
      } catch (emailErr) {
        console.error('Failed to send decline notification email:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Activation request for ${moduleDisplayName} has been successfully declined.`
      });
    }

  } catch (error) {
    console.error('Superadmin put request error:', error);
    return NextResponse.json({ error: 'Internal server error while processing request.' }, { status: 500 });
  }
}
