import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/real-estate/leads/[id]/convert - Convert RE Lead to RE Contact
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (supabase) {
      // 1. Fetch current lead
      const { data: lead, error: fetchError } = await supabase
        .from('real_estate_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !lead) {
        return NextResponse.json({ error: 'Real estate lead not found.' }, { status: 404 });
      }

      if (lead.org_id !== decodedUser.orgId) {
        return NextResponse.json({ error: 'Access forbidden.' }, { status: 403 });
      }

      if (lead.status === 'Converted') {
        return NextResponse.json({ error: 'Lead is already converted.' }, { status: 400 });
      }

      // 2. Register contact record in real_estate_contacts
      const { data: newContact, error: contactError } = await supabase
        .from('real_estate_contacts')
        .insert({
          org_id: decodedUser.orgId,
          first_name: lead.first_name,
          last_name: lead.last_name || '',
          company: lead.company || '',
          designation: lead.designation || '',
          email: lead.email || '',
          phone: lead.phone || '',
          whatsapp: lead.whatsapp || '',
          city: lead.city || '',
          state: lead.state || '',
          country: lead.country || 'India',
          assigned_to: lead.assigned_to || decodedUser.id,
          lead_id: lead.id,
          status: 'Active'
        })
        .select('*')
        .single();

      if (contactError) {
        console.error('Supabase RE contact insert from lead error:', contactError);
        throw contactError;
      }

      // 3. Update the lead status to "Converted"
      const { error: leadUpdateError } = await supabase
        .from('real_estate_leads')
        .update({ status: 'Converted' })
        .eq('id', id);

      if (leadUpdateError) {
        console.error('Supabase update RE lead status error:', leadUpdateError);
        throw leadUpdateError;
      }

      // 4. Create timeline audit log note
      await supabase
        .from('real_estate_lead_notes')
        .insert([
          {
            lead_id: id,
            text: `Lead converted to customer Contact profile by ${decodedUser.name}`,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name,
            org_id: decodedUser.orgId
          }
        ]);

      return NextResponse.json({
        success: true,
        message: 'Lead converted to Contact successfully!',
        contact: newContact
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Convert RE lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error during contact conversion.' },
      { status: 500 }
    );
  }
}
