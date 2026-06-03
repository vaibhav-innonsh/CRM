import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/healthcare/leads/[id]/convert - Convert patient prospect to clinical patient record
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage records.' },
        { status: 401 }
      );
    }

    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    if (supabase) {
      // 1. Fetch current lead
      const { data: lead, error: fetchError } = await supabase
        .from('healthcare_leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !lead) {
        return NextResponse.json({ error: 'Patient prospect record not found.' }, { status: 404 });
      }

      if (lead.org_id !== decodedUser.orgId) {
        return NextResponse.json({ error: 'Access forbidden.' }, { status: 403 });
      }

      if (lead.status === 'Converted') {
        return NextResponse.json({ error: 'Patient prospect is already converted.' }, { status: 400 });
      }

      // 2. Fetch the patient count to generate the sequential Patient ID (PT-1001, PT-1002, etc.)
      const { count, error: countError } = await supabase
        .from('healthcare_patients')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch patients count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const patient_id_custom = `PT-${nextIdNum}`;

      // 3. Register patient record in healthcare_patients
      const { data: newPatient, error: patientError } = await supabase
        .from('healthcare_patients')
        .insert({
          org_id: decodedUser.orgId,
          patient_id_custom,
          first_name: lead.first_name,
          last_name: lead.last_name || '-',
          mobile: lead.mobile || '-',
          email: lead.email || '',
          gender: 'Female', // Default placeholder
          dob: '2000-01-01', // Default placeholder
          blood_group: 'Unknown', // Default placeholder
          address: '',
          status: 'Active'
        })
        .select('*')
        .single();

      if (patientError) {
        console.error('Supabase register patient from lead error:', patientError);
        throw patientError;
      }

      // 4. Update the healthcare lead status to "Converted"
      const { error: leadUpdateError } = await supabase
        .from('healthcare_leads')
        .update({ status: 'Converted' })
        .eq('id', id);

      if (leadUpdateError) {
        console.error('Supabase update lead status error:', leadUpdateError);
        throw leadUpdateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Patient registered successfully and prospect marked as Converted!',
        patient: newPatient
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Convert healthcare lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error during patient registration.' },
      { status: 500 }
    );
  }
}
