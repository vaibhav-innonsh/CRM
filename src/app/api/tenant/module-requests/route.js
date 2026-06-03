import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { sendEmail } from '@/lib/mailer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/tenant/module-requests - Submit a request to activate a gated module
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    // Role gate: Only Organization Owners are permitted to request subscription changes
    if (decodedUser.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden. Only organization owners can request feature module activations.' },
        { status: 403 }
      );
    }

    const { moduleName } = await req.json();

    if (!moduleName) {
      return NextResponse.json({ error: 'Missing parameter: moduleName is required.' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client is not configured.' }, { status: 500 });
    }

    // 1. Fetch organization details to check if the module is already active
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name, enabled_modules')
      .eq('id', decodedUser.orgId)
      .maybeSingle();

    if (orgError || !orgData) {
      console.error('Failed to verify tenant organization:', orgError);
      return NextResponse.json({ error: 'Could not verify your organization profile.' }, { status: 500 });
    }

    const enabledModules = orgData.enabled_modules || [];
    if (enabledModules.includes(moduleName)) {
      return NextResponse.json(
        { error: `The ${moduleName} module is already active for your organization.` },
        { status: 400 }
      );
    }

    // 2. Check if a pending activation request already exists
    const { data: existingRequest, error: checkError } = await supabase
      .from('module_requests')
      .select('id')
      .eq('org_id', decodedUser.orgId)
      .eq('module_name', moduleName)
      .eq('status', 'Pending')
      .maybeSingle();

    if (checkError) {
      console.error('Check existing request failed:', checkError);
    }

    if (existingRequest) {
      return NextResponse.json(
        { error: `An activation request for the ${moduleName} module is already pending Super Admin approval.` },
        { status: 400 }
      );
    }

    // 3. Insert the activation request
    const { data: newRequest, error: insertError } = await supabase
      .from('module_requests')
      .insert([
        {
          org_id: decodedUser.orgId,
          requested_by: decodedUser.id,
          module_name: moduleName,
          status: 'Pending'
        }
      ])
      .select('*')
      .single();

    if (insertError) {
      console.error('Insert module request failed:', insertError);
      throw insertError;
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

    const moduleDisplayName = getModuleDisplayName(moduleName);

    // 4. Send Email Notification to Platform Super Admins
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('name, email')
        .eq('role', 'superadmin');

      const recipients = (admins && admins.length > 0)
        ? admins
        : [{ name: 'Innonsh Super Admin', email: 'admin@innonsh.com' }];

      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      const emailSubject = `⚡ Module Request: ${orgData.name} wants ${moduleDisplayName}`;

      for (const admin of recipients) {
        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Module Activation Request</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table border="0" cellpadding="0" cellspacing="0" width="550" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    <tr>
                      <td style="background-color: #0f172a; padding: 24px 30px; border-bottom: 3px solid #10b981;">
                        <span style="color: #ffffff; font-size: 18px; font-weight: 800;">Innonsh SaaS Portal</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 45px 30px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b;">Module Access Requested</h2>
                        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                          Hi ${admin.name},<br /><br />
                          An organization owner has requested access to a locked feature module. Details:
                        </p>
                        <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px;">
                          <tr>
                            <td style="font-weight: bold; color: #475569; width: 140px;">Company Profile:</td>
                            <td style="color: #1e293b; font-weight: bold;">${orgData.name}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: bold; color: #475569;">Requested Module:</td>
                            <td style="color: #059669; font-weight: bold;">🔒 ${moduleDisplayName}</td>
                          </tr>
                          <tr>
                            <td style="font-weight: bold; color: #475569;">Requested By:</td>
                            <td style="color: #1e293b;">${decodedUser.name} (${decodedUser.email})</td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b;">
                          Please log in to your Super Admin panel to review and approve this subscription change:
                        </p>
                        <div align="center">
                          <a href="${appUrl}/super-admin" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(16,185,129,0.2);">Moderate Request</a>
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
          toEmail: admin.email,
          toName: admin.name,
          subject: emailSubject,
          html: htmlBody,
          text: `Module requested: ${moduleDisplayName} for organization ${orgData.name} by ${decodedUser.name}. Approve at ${appUrl}/super-admin`
        });
      }
    } catch (emailErr) {
      console.error('Failed to notify admins of module request:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully requested activation for ${moduleDisplayName}.`,
      request: newRequest
    });

  } catch (error) {
    console.error('Post module request error:', error);
    return NextResponse.json({ error: 'Internal server error while submitting request.' }, { status: 500 });
  }
}

// GET /api/tenant/module-requests - Fetch current organization module requests
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client is not configured.' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('module_requests')
      .select('*')
      .eq('org_id', decodedUser.orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch tenant module requests failed:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      requests: data
    });

  } catch (error) {
    console.error('Get tenant module requests error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
