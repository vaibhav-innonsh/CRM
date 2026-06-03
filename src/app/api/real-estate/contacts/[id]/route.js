import { supabase } from '@/lib/supabaseClient';
import { mapREContactToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/real-estate/contacts/[id] - Update Real Estate Contact profile details
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (supabase) {
      let query = supabase.from('real_estate_contacts').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: contact, error: fetchError } = await query.maybeSingle();

      if (fetchError || !contact) {
        return NextResponse.json({ error: 'Contact profile not found.' }, { status: 404 });
      }

      // Security check
      if (
        decodedUser.role === 'sales_rep' &&
        (!contact.assigned_to || contact.assigned_to !== decodedUser.id)
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to modify this contact.' },
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

      if (firstName !== undefined && !firstName.trim()) {
        return NextResponse.json({ error: 'First Name is a required field.' }, { status: 400 });
      }

      // Duplicate checks
      if (email !== undefined && email.trim() !== '') {
        const cleanEmail = email.toLowerCase().trim();
        let emailQuery = supabase.from('real_estate_contacts').select('id').eq('email', cleanEmail).eq('org_id', decodedUser.orgId).neq('id', id);
        const { data: existingEmail } = await emailQuery.maybeSingle();

        if (existingEmail) {
          return NextResponse.json(
            { error: 'Duplicate Warning: Another customer contact already has this Email address.' },
            { status: 400 }
          );
        }
      }

      if (phone !== undefined && phone.trim() !== '') {
        const cleanPhone = phone.trim();
        let phoneQuery = supabase.from('real_estate_contacts').select('id').eq('phone', cleanPhone).eq('org_id', decodedUser.orgId).neq('id', id);
        const { data: existingPhone } = await phoneQuery.maybeSingle();

        if (existingPhone) {
          return NextResponse.json(
            { error: 'Duplicate Warning: Another customer contact already has this Phone number.' },
            { status: 400 }
          );
        }
      }

      const updates = {};
      if (firstName !== undefined) updates.first_name = firstName.trim();
      if (lastName !== undefined) updates.last_name = lastName.trim();
      if (company !== undefined) updates.company = company.trim();
      if (designation !== undefined) updates.designation = designation.trim();
      if (email !== undefined) updates.email = email.toLowerCase().trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (whatsapp !== undefined) updates.whatsapp = whatsapp.trim();
      if (city !== undefined) updates.city = city.trim();
      if (state !== undefined) updates.state = state.trim();
      if (country !== undefined) updates.country = country.trim();
      if (status !== undefined) updates.status = status;
      if (customData !== undefined) updates.custom_data = customData;

      if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
        updates.assigned_to = assignedTo || null;
      }

      const { data: updatedContact, error: updateError } = await supabase
        .from('real_estate_contacts')
        .update(updates)
        .eq('id', id)
        .select('*, users:assigned_to(id, name, email, role)')
        .single();

      if (updateError) {
        console.error('Supabase update RE contact error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Customer Contact details updated successfully.',
        contact: mapREContactToFrontend(updatedContact)
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Update RE contact details error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating contact details.' },
      { status: 500 }
    );
  }
}

// DELETE /api/real-estate/contacts/[id] - Permanently delete customer contact
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role !== 'owner' && decodedUser.role !== 'sales_admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only Owners or Sales Administrators can delete permanent customer records.' },
        { status: 403 }
      );
    }

    if (supabase) {
      let query = supabase.from('real_estate_contacts').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: contact, error: fetchError } = await query.maybeSingle();

      if (fetchError || !contact) {
        return NextResponse.json({ error: 'Contact profile not found.' }, { status: 404 });
      }

      await supabase.from('real_estate_contacts').delete().eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'Permanent customer contact record deleted successfully.'
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Delete RE contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting contact profile.' },
      { status: 500 }
    );
  }
}
