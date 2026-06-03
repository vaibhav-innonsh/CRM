import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/patients - Fetch dynamic tenant-isolated patient catalog
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access patient records.' },
        { status: 401 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const gender = searchParams.get('gender') || '';
    const status = searchParams.get('status') || '';

    let patients = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_patients')
        .select('*');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Dropdown Filters
      if (gender && gender !== 'All') {
        queryBuilder = queryBuilder.eq('gender', gender);
      }
      if (status && status !== 'All') {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // Search (First name, Last name, Mobile, Email)
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(`first_name.ilike.${s},last_name.ilike.${s},mobile.ilike.${s},email.ilike.${s}`);
      }

      // Sort by newest by default
      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch patients error:', error);
        throw error;
      }

      patients = data || [];
    }

    return NextResponse.json({ success: true, patients });
  } catch (error) {
    console.error('GET patients error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching patient records.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/patients - Add a new patient record
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage patient records.' },
        { status: 401 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      first_name, 
      last_name, 
      mobile, 
      email, 
      gender, 
      dob, 
      blood_group, 
      address, 
      emergency_contact, 
      insurance_provider, 
      insurance_number 
    } = body;

    // Validation
    if (!first_name) {
      return NextResponse.json(
        { error: 'First name is required.' },
        { status: 400 }
      );
    }

    const final_last_name = last_name || '-';
    const final_mobile = mobile || '-';
    const final_gender = gender || 'Unknown';
    const final_dob = dob || '2000-01-01';
    const final_blood_group = blood_group || 'Unknown';

    let newPatient = null;

    if (supabase) {
      // 1. Generate sequential patient ID: PT-1001, PT-1002, etc. per organization
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

      // 2. Insert new patient
      const { data, error } = await supabase
        .from('healthcare_patients')
        .insert({
          org_id: decodedUser.orgId,
          patient_id_custom,
          first_name,
          last_name: final_last_name,
          mobile: final_mobile,
          email: email || '',
          gender: final_gender,
          dob: final_dob,
          blood_group: final_blood_group,
          address: address || '',
          emergency_contact: emergency_contact || '',
          insurance_provider: insurance_provider || '',
          insurance_number: insurance_number || '',
          status: 'Active'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase insert patient error:', error);
        throw error;
      }

      newPatient = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Patient registered successfully!',
      patient: newPatient
    });
  } catch (error) {
    console.error('POST patient error:', error);
    return NextResponse.json(
      { error: 'Internal server error while registering patient.' },
      { status: 500 }
    );
  }
}
