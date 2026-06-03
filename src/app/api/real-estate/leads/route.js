import { supabase } from '@/lib/supabaseClient';
import { mapRELeadToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/leads - Fetch real estate lead list with role-based access & filters
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access leads.' },
        { status: 401 }
      );
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json(
        { error: '🔒 Real Estate module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const source = searchParams.get('source') || '';
    const priority = searchParams.get('priority') || '';
    const assignedToFilter = searchParams.get('assignedTo') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';

    let leads = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_leads')
        .select('*, users:assigned_to(id, name, email), real_estate_lead_notes(*), real_estate_lead_attachments(*)');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // ROLE-BASED ACCESS CONTROL (Leads Isolation)
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.or(`assigned_to.eq.${decodedUser.id},assigned_to.is.null`);
      } else if (assignedToFilter) {
        if (assignedToFilter === 'all') {
          queryBuilder = queryBuilder.is('assigned_to', null);
        } else {
          queryBuilder = queryBuilder.eq('assigned_to', assignedToFilter);
        }
      }

      // Status, Source, Priority filters
      if (status && status !== 'All') {
        queryBuilder = queryBuilder.eq('status', status);
      }
      if (source && source !== 'All') {
        queryBuilder = queryBuilder.eq('source', source);
      }
      if (priority && priority !== 'All') {
        queryBuilder = queryBuilder.eq('priority', priority);
      }

      // Search
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(
          `first_name.ilike.${s},last_name.ilike.${s},company.ilike.${s},email.ilike.${s},phone.ilike.${s},requirements.ilike.${s},city.ilike.${s}`
        );
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch RE leads error:', error);
        throw error;
      }

      leads = (data || []).map(mapRELeadToFrontend);

      // Sorting
      if (sortBy === 'latest_communication') {
        leads.sort((a, b) => {
          const aLatest = Math.max(
            new Date(a.createdAt || 0).getTime() || 0,
            ...(a.notes || []).map((n) => new Date(n.createdAt || 0).getTime() || 0)
          );
          const bLatest = Math.max(
            new Date(b.createdAt || 0).getTime() || 0,
            ...(b.notes || []).map((n) => new Date(n.createdAt || 0).getTime() || 0)
          );
          return bLatest - aLatest;
        });
      } else {
        leads.sort((a, b) => (new Date(b.createdAt || 0).getTime() || 0) - (new Date(a.createdAt || 0).getTime() || 0));
      }
    }

    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Fetch RE leads error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching real estate leads.' },
      { status: 500 }
    );
  }
}

// POST /api/real-estate/leads - Create a new real estate lead
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json(
        { error: '🔒 Real Estate module is not enabled for your organization.' },
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
      nextFollowUpDate,
      assignedTo,
      customFields,
      interestedProduct,
      followUpType,
    } = body;

    if (!firstName) {
      return NextResponse.json(
        { error: 'First name is required.' },
        { status: 400 }
      );
    }

    const leadStatusValue = status || 'New';

    // Business Rules validation
    const requiredReminderStatuses = ['Contacted', 'Qualified', 'Attempted'];
    if (requiredReminderStatuses.includes(leadStatusValue) && !nextFollowUpDate) {
      return NextResponse.json(
        { error: `Validation Failure: Target Next Follow-Up Schedule is required when status is "${leadStatusValue}".` },
        { status: 400 }
      );
    }

    if (leadStatusValue === 'Lost' && !lostReason) {
      return NextResponse.json(
        { error: 'Validation Failure: Lost Reason is mandatory when lead status is "Lost".' },
        { status: 400 }
      );
    }

    let finalLead = null;

    if (supabase) {
      // Duplicate checks
      if (email && email.trim()) {
        const { data: duplicateEmail } = await supabase
          .from('real_estate_leads')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .eq('org_id', decodedUser.orgId)
          .maybeSingle();

        if (duplicateEmail) {
          return NextResponse.json(
            { error: `Duplicate Check Warning: A lead record with Email "${email.trim()}" already exists.` },
            { status: 400 }
          );
        }
      }

      if (phone && phone.trim()) {
        const { data: duplicatePhone } = await supabase
          .from('real_estate_leads')
          .select('id')
          .eq('phone', phone.trim())
          .eq('org_id', decodedUser.orgId)
          .maybeSingle();

        if (duplicatePhone) {
          return NextResponse.json(
            { error: `Duplicate Check Warning: A lead record with Phone "${phone.trim()}" already exists.` },
            { status: 400 }
          );
        }
      }

      let finalAssignee = assignedTo || null;
      if (assignedTo === 'all' || !assignedTo) {
        finalAssignee = decodedUser.id;
      }

      // Insert Lead
      const { data: newLead, error: insertError } = await supabase
        .from('real_estate_leads')
        .insert([
          {
            first_name: firstName,
            last_name: lastName || '',
            company: company || '',
            designation: designation || '',
            email: email || '',
            phone: phone || '',
            whatsapp: whatsapp || '',
            website: website || '',
            city: city || '',
            state: state || '',
            country: country || 'India',
            industry: industry || '',
            employee_count: Number(employeeCount) || 0,
            annual_revenue: Number(annualRevenue) || 0,
            priority: priority || 'Warm',
            status: leadStatusValue,
            lost_reason: leadStatusValue === 'Lost' ? lostReason : '',
            source: source || 'Website',
            requirements: requirements || '',
            interested_product: interestedProduct || '',
            follow_up_type: followUpType || 'None',
            next_follow_up_date: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : null,
            assigned_to: finalAssignee,
            custom_fields: customFields || [],
            custom_data: body.custom_data || {},
            org_id: decodedUser.orgId
          }
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase RE lead insert error:', insertError);
        throw insertError;
      }

      // Create initial log note
      await supabase
        .from('real_estate_lead_notes')
        .insert([
          {
            lead_id: newLead.id,
            text: `Lead created by ${decodedUser.name}`,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name,
            org_id: decodedUser.orgId
          }
        ]);

      // Auto-create Task Reminder (Linked via real_estate_lead_id)
      if (newLead.next_follow_up_date) {
        try {
          await supabase
            .from('tasks')
            .insert([
              {
                subject: `RE Follow-up Call: ${newLead.first_name} (${newLead.company || 'Individual'})`,
                due_date: newLead.next_follow_up_date,
                priority: newLead.priority === 'Hot' ? 'High' : (newLead.priority === 'Cold' ? 'Low' : 'Medium'),
                status: 'Pending',
                assigned_to: newLead.assigned_to || decodedUser.id,
                real_estate_lead_id: newLead.id,
                org_id: decodedUser.orgId
              }
            ]);
        } catch (err) {
          console.error('Failed to auto-create follow-up task on Supabase RE lead save:', err);
        }
      }

      // Fetch refreshed joined lead
      const { data: refreshedLead } = await supabase
        .from('real_estate_leads')
        .select('*, users:assigned_to(id, name, email), real_estate_lead_notes(*), real_estate_lead_attachments(*)')
        .eq('id', newLead.id)
        .single();

      finalLead = mapRELeadToFrontend(refreshedLead);
    }

    return NextResponse.json({
      success: true,
      message: 'Real estate lead created successfully',
      lead: finalLead,
    }, { status: 201 });
  } catch (error) {
    console.error('Create RE lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating real estate lead.', details: error.message },
      { status: 500 }
    );
  }
}
