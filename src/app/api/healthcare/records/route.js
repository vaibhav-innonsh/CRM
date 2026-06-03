import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/records - Fetch dynamic tenant-isolated medical records
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access medical records.' },
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
    const search = searchParams.get('search') || '';

    let records = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_medical_records')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization, qualification)
        `);

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Filter by specific patient
      if (patientId) {
        queryBuilder = queryBuilder.eq('patient_id', patientId);
      }

      // Search by diagnosis or symptoms
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(`diagnosis.ilike.${s},symptoms.ilike.${s},treatment_plan.ilike.${s}`);
      }

      // Sort by newest visit date
      queryBuilder = queryBuilder.order('visit_date', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch medical records error:', error);
        throw error;
      }

      records = data || [];
    }

    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error('GET medical records error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching medical records.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/records - Add a new clinical diagnosis record
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to add medical records.' },
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
      diagnosis, 
      symptoms, 
      treatment_plan, 
      notes,
      visit_date
    } = body;

    // Validation
    if (!patient_id || !doctor_id || !diagnosis) {
      return NextResponse.json(
        { error: 'Missing required fields (Patient ID, Doctor ID, and Diagnosis are required).' },
        { status: 400 }
      );
    }

    let newRecord = null;

    if (supabase) {
      // 1. Generate sequential record number: REC-1001, REC-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_medical_records')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch records count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const record_number = `REC-${nextIdNum}`;

      // 2. Insert new record
      const { data, error } = await supabase
        .from('healthcare_medical_records')
        .insert({
          org_id: decodedUser.orgId,
          record_number,
          patient_id,
          doctor_id,
          diagnosis,
          symptoms: symptoms || '',
          treatment_plan: treatment_plan || '',
          notes: notes || '',
          visit_date: visit_date || new Date().toISOString().split('T')[0]
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization, qualification)
        `)
        .single();

      if (error) {
        console.error('Supabase insert medical record error:', error);
        throw error;
      }

      newRecord = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Medical record saved successfully!',
      record: newRecord
    });
  } catch (error) {
    console.error('POST medical record error:', error);
    return NextResponse.json(
      { error: 'Internal server error while saving medical record.' },
      { status: 500 }
    );
  }
}
