import { supabase } from '@/lib/supabaseClient';
import { mapRELeadToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/leads/[id] - Fetch single real estate lead details
export async function GET(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .select('*, users:assigned_to(id, name, email), real_estate_lead_notes(*), real_estate_lead_attachments(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Supabase fetch single RE lead error:', error);
        throw error;
      }

      if (!data) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // Security check
      if (
        decodedUser.role === 'sales_rep' && 
        (data.assigned_to && data.assigned_to !== decodedUser.id)
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to view this lead.' },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, lead: mapRELeadToFrontend(data) });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Fetch single RE lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching lead.' },
      { status: 500 }
    );
  }
}

// PUT /api/real-estate/leads/[id] - Update real estate lead details
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      const { data: existingLead, error: fetchError } = await supabase
        .from('real_estate_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !existingLead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // Security Check
      if (
        decodedUser.role === 'sales_rep' && 
        (existingLead.assigned_to && existingLead.assigned_to !== decodedUser.id)
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to edit this lead.' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const {
        firstName,
        lastName,
        company,
        designation,
        email,
        phone,
        whatsapp,
        whatsappContacted,
        website,
        city,
        state,
        country,
        industry,
        employeeCount,
        annualRevenue,
        priority,
        status,
        lostReason,
        source,
        requirements,
        interestedProduct,
        followUpType,
        nextFollowUpDate,
        assignedTo,
        customFields,
      } = body;

      if (firstName !== undefined && !firstName) {
        return NextResponse.json({ error: 'First name cannot be empty.' }, { status: 400 });
      }

      // Duplicate checks
      if (email !== undefined && email.trim() && email.toLowerCase().trim() !== existingLead.email) {
        const { data: duplicateEmail } = await supabase
          .from('real_estate_leads')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .eq('org_id', decodedUser.orgId)
          .neq('id', id)
          .maybeSingle();

        if (duplicateEmail) {
          return NextResponse.json(
            { error: `Duplicate Check Warning: Another lead record with Email "${email.trim()}" already exists.` },
            { status: 400 }
          );
        }
      }

      if (phone !== undefined && phone.trim() && phone.trim() !== existingLead.phone) {
        const { data: duplicatePhone } = await supabase
          .from('real_estate_leads')
          .select('id')
          .eq('phone', phone.trim())
          .eq('org_id', decodedUser.orgId)
          .neq('id', id)
          .maybeSingle();

        if (duplicatePhone) {
          return NextResponse.json(
            { error: `Duplicate Check Warning: Another lead record with Phone "${phone.trim()}" already exists.` },
            { status: 400 }
          );
        }
      }

      const targetStatus = status !== undefined ? status : existingLead.status;
      const targetFollowUpDate = nextFollowUpDate !== undefined ? nextFollowUpDate : existingLead.next_follow_up_date;

      // Validations
      const requiredReminderStatuses = ['Contacted', 'Qualified', 'Attempted'];
      if (requiredReminderStatuses.includes(targetStatus) && !targetFollowUpDate) {
        return NextResponse.json(
          { error: `Validation Failure: Target Next Follow-Up Schedule is required when status is "${targetStatus}".` },
          { status: 400 }
        );
      }

      const targetLostReason = lostReason !== undefined ? lostReason : existingLead.lost_reason;
      if (targetStatus === 'Lost' && !targetLostReason) {
        return NextResponse.json(
          { error: 'Validation Failure: Lost Reason is mandatory when lead status is "Lost".' },
          { status: 400 }
        );
      }

      let finalAssignee = existingLead.assigned_to;
      if (assignedTo !== undefined) {
        if (decodedUser.role === 'sales_rep' && assignedTo !== decodedUser.id) {
          return NextResponse.json(
            { error: 'Forbidden. Only Owners and Sales Managers can assign leads.' },
            { status: 403 }
          );
        }
        finalAssignee = assignedTo === 'all' ? null : (assignedTo || null);
      }

      // Status audit logs
      if (status !== undefined && status !== existingLead.status) {
        await supabase.from('real_estate_lead_notes').insert([
          {
            lead_id: id,
            text: `System Status update: Lead status changed from "${existingLead.status}" to "${status}" by ${decodedUser.name}`,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name,
            org_id: decodedUser.orgId
          }
        ]);
      }

      if (whatsappContacted === true && existingLead.whatsapp_contacted !== true) {
        await supabase.from('real_estate_lead_notes').insert([
          {
            lead_id: id,
            text: `Outreach initiated via WhatsApp by ${decodedUser.name}`,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name,
            org_id: decodedUser.orgId
          }
        ]);
      }

      const updates = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (company !== undefined) updates.company = company;
      if (designation !== undefined) updates.designation = designation;
      if (email !== undefined) updates.email = email.toLowerCase().trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (whatsapp !== undefined) updates.whatsapp = whatsapp.trim();
      if (whatsappContacted !== undefined) updates.whatsapp_contacted = whatsappContacted;
      if (website !== undefined) updates.website = website.trim();
      if (city !== undefined) updates.city = city;
      if (state !== undefined) updates.state = state;
      if (country !== undefined) updates.country = country;
      if (industry !== undefined) updates.industry = industry;
      if (employeeCount !== undefined) updates.employee_count = Number(employeeCount) || 0;
      if (annualRevenue !== undefined) updates.annual_revenue = Number(annualRevenue) || 0;
      if (priority !== undefined) updates.priority = priority;
      if (requirements !== undefined) updates.requirements = requirements;
      if (interestedProduct !== undefined) updates.interested_product = interestedProduct;
      if (followUpType !== undefined) updates.follow_up_type = followUpType;
      if (customFields !== undefined) updates.custom_fields = customFields;
      if (body.custom_data !== undefined) updates.custom_data = body.custom_data;
      if (nextFollowUpDate !== undefined) {
        updates.next_follow_up_date = nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null;
      }
      updates.status = targetStatus;
      updates.lost_reason = targetStatus === 'Lost' ? targetLostReason : '';
      updates.assigned_to = finalAssignee;

      const { data: updatedLead, error: updateError } = await supabase
        .from('real_estate_leads')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Supabase update RE lead error:', updateError);
        throw updateError;
      }

      // Sync follow-up tasks (using real_estate_lead_id)
      if (nextFollowUpDate !== undefined && nextFollowUpDate) {
        try {
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id')
            .eq('real_estate_lead_id', id)
            .eq('status', 'Pending')
            .maybeSingle();

          if (existingTask) {
            await supabase
              .from('tasks')
              .update({
                due_date: new Date(nextFollowUpDate).toISOString(),
                subject: `RE Follow-up Call: ${firstName || existingLead.first_name} (${company || existingLead.company || 'Individual'})`,
                priority: (priority || existingLead.priority) === 'Hot' ? 'High' : ((priority || existingLead.priority) === 'Cold' ? 'Low' : 'Medium'),
                assigned_to: finalAssignee || decodedUser.id
              })
              .eq('id', existingTask.id);
          } else {
            await supabase
              .from('tasks')
              .insert([
                {
                  subject: `RE Follow-up Call: ${firstName || existingLead.first_name} (${company || existingLead.company || 'Individual'})`,
                  due_date: new Date(nextFollowUpDate).toISOString(),
                  priority: (priority || existingLead.priority) === 'Hot' ? 'High' : ((priority || existingLead.priority) === 'Cold' ? 'Low' : 'Medium'),
                  status: 'Pending',
                  assigned_to: finalAssignee || decodedUser.id,
                  real_estate_lead_id: id,
                  org_id: decodedUser.orgId
                }
              ]);
          }
        } catch (err) {
          console.error('Failed to sync follow-up task on RE lead edit:', err);
        }
      }

      if (assignedTo !== undefined) {
        try {
          await supabase
            .from('tasks')
            .update({ assigned_to: finalAssignee || decodedUser.id })
            .eq('real_estate_lead_id', id)
            .eq('status', 'Pending');
        } catch (err) {
          console.error('Failed to sync RE tasks assignee on lead edit:', err);
        }
      }

      // Fetch refreshed lead
      const { data: refreshedLead } = await supabase
        .from('real_estate_leads')
        .select('*, users:assigned_to(id, name, email), real_estate_lead_notes(*), real_estate_lead_attachments(*)')
        .eq('id', id)
        .single();

      return NextResponse.json({
        success: true,
        message: 'Real estate lead updated successfully',
        lead: mapRELeadToFrontend(refreshedLead),
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Update RE lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating lead.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/real-estate/leads/[id] - Delete a real estate lead (Admins/Owners only)
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives cannot delete leads. Please contact your manager.' },
        { status: 403 }
      );
    }

    if (supabase) {
      const { data: lead, error: fetchError } = await supabase
        .from('real_estate_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      const { error: deleteError } = await supabase
        .from('real_estate_leads')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete RE lead error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Real estate lead deleted successfully',
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Delete RE lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting lead.' },
      { status: 500 }
    );
  }
}
