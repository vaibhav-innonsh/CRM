import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/prescriptions - Fetch dynamic tenant-isolated prescriptions
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access prescriptions.' },
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
    const patientId = searchParams.get('patientId') || '';

    let prescriptions = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_prescriptions')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization),
          record:healthcare_medical_records(id, record_number, diagnosis)
        `);

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Filter by specific patient
      if (patientId) {
        queryBuilder = queryBuilder.eq('patient_id', patientId);
      }

      // Sort by newest prescription date
      queryBuilder = queryBuilder.order('prescription_date', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch prescriptions error:', error);
        throw error;
      }

      prescriptions = data || [];
    }

    return NextResponse.json({ success: true, prescriptions });
  } catch (error) {
    console.error('GET prescriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching prescriptions.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/prescriptions - Add a new clinical prescription
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to create prescriptions.' },
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
      patient_id, 
      doctor_id, 
      record_id, 
      instructions, 
      medicine_details,
      prescription_date
    } = body;

    // Validation
    if (!patient_id || !doctor_id || !medicine_details || !Array.isArray(medicine_details)) {
      return NextResponse.json(
        { error: 'Missing required fields (Patient ID, Doctor ID, and medicine list are required).' },
        { status: 400 }
      );
    }

    let newPrescription = null;

    if (supabase) {
      // 1. Generate sequential prescription number: PRX-1001, PRX-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch prescriptions count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const prescription_number = `PRX-${nextIdNum}`;

      // 2. Insert new prescription
      const { data, error } = await supabase
        .from('healthcare_prescriptions')
        .insert({
          org_id: decodedUser.orgId,
          prescription_number,
          patient_id,
          doctor_id,
          record_id: record_id || null,
          instructions: instructions || '',
          medicine_details: medicine_details,
          prescription_date: prescription_date || new Date().toISOString().split('T')[0]
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization),
          record:healthcare_medical_records(id, record_number, diagnosis)
        `)
        .single();

      if (error) {
        console.error('Supabase insert prescription error:', error);
        throw error;
      }

      newPrescription = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Prescription generated successfully!',
      prescription: newPrescription
    });
  } catch (error) {
    console.error('POST prescription error:', error);
    return NextResponse.json(
      { error: 'Internal server error while saving prescription.' },
      { status: 500 }
    );
  }
}
