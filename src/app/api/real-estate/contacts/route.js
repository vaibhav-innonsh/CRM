import { supabase } from '@/lib/supabaseClient';
import { mapREContactToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/contacts - Retrieve real estate contacts lists
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json(
        { error: '🔒 Real Estate module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const assignedToFilter = searchParams.get('assignedTo') || '';
    const status = searchParams.get('status') || '';

    let contacts = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_contacts')
        .select('*, users:assigned_to(id, name, email, role)');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // ROLE-BASED ACCESS CONTROL (RBAC) SECURITY ENFORCEMENT
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedToFilter) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedToFilter);
      }

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(
          `first_name.ilike.${s},last_name.ilike.${s},company.ilike.${s},email.ilike.${s},phone.ilike.${s},city.ilike.${s}`
        );
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch RE contacts error:', error);
        throw error;
      }

      contacts = (data || []).map(mapREContactToFrontend);
    }

    return NextResponse.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Fetch RE contacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching contacts.' },
      { status: 500 }
    );
  }
}

// POST /api/real-estate/contacts - Manually create a real estate contact record
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      city,
      state,
      country,
      assignedTo,
      status,
      customData
    } = body;

    // Validation
    if (!firstName || !firstName.trim()) {
      return NextResponse.json({ error: 'First Name is a required field.' }, { status: 400 });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    let targetAssignee = decodedUser.id;
    if (decodedUser.role !== 'sales_rep' && assignedTo) {
      targetAssignee = assignedTo;
    }

    let finalContact = null;

    if (supabase) {
      // Duplicate checks
      if (cleanEmail) {
        const { data: existingEmail } = await supabase
          .from('real_estate_contacts')
          .select('id')
          .eq('email', cleanEmail)
          .eq('org_id', decodedUser.orgId)
          .maybeSingle();

        if (existingEmail) {
          return NextResponse.json(
            { error: 'Duplicate Protection Check: A customer contact record with this Email already exists.' },
            { status: 400 }
          );
        }
      }

      if (cleanPhone) {
        const { data: existingPhone } = await supabase
          .from('real_estate_contacts')
          .select('id')
          .eq('phone', cleanPhone)
          .eq('org_id', decodedUser.orgId)
          .maybeSingle();

        if (existingPhone) {
          return NextResponse.json(
            { error: 'Duplicate Protection Check: A customer contact record with this Phone number already exists.' },
            { status: 400 }
          );
        }
      }

      // Insert contact
      const { data: newContact, error: insertError } = await supabase
        .from('real_estate_contacts')
        .insert([
          {
            first_name: firstName.trim(),
            last_name: lastName || '',
            company: company || '',
            designation: designation || '',
            email: cleanEmail,
            phone: cleanPhone,
            whatsapp: whatsapp || '',
            city: city || '',
            state: state || '',
            country: country || 'India',
            assigned_to: targetAssignee,
            status: status || 'Active',
            org_id: decodedUser.orgId,
            custom_data: customData || {}
          }
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase create RE contact error:', insertError);
        throw insertError;
      }

      // Fetch refreshed contact
      const { data: refreshedContact } = await supabase
        .from('real_estate_contacts')
        .select('*, users:assigned_to(id, name, email, role)')
        .eq('id', newContact.id)
        .single();

      finalContact = mapREContactToFrontend(refreshedContact);
    }

    return NextResponse.json({
      success: true,
      message: 'Real estate contact record created successfully!',
      contact: finalContact
    }, { status: 201 });
  } catch (error) {
    console.error('Create RE contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating contact.', details: error.message },
      { status: 500 }
    );
  }
}
