import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/lab-tests - Fetch dynamic tenant-isolated lab tests list
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access lab records.' },
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
    const statusFilter = searchParams.get('status') || '';
    const patientIdFilter = searchParams.get('patient_id') || '';

    let labTests = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_lab_tests')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization)
        `);

      if (decodedUser.orgId) queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      if (statusFilter && statusFilter !== 'All') queryBuilder = queryBuilder.eq('status', statusFilter);
      if (patientIdFilter) queryBuilder = queryBuilder.eq('patient_id', patientIdFilter);

      queryBuilder = queryBuilder.order('test_date', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch lab tests error:', error);
        throw error;
      }

      labTests = data || [];
    }

    return NextResponse.json({ success: true, labTests });
  } catch (error) {
    console.error('GET lab tests error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching lab tests.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/lab-tests - Add a new diagnostic lab test request
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to create lab tests.' },
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
      test_type, 
      lab_technician,
      test_date,
      status: initialStatus
    } = body;

    // Validation
    if (!patient_id || !doctor_id || !test_type) {
      return NextResponse.json(
        { error: 'Missing required fields (Patient ID, Doctor ID, and Test Type are required).' },
        { status: 400 }
      );
    }

    let newLabTest = null;

    if (supabase) {
      // 1. Generate sequential test number: LAB-1001, LAB-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_lab_tests')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch lab tests count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const test_number = `LAB-${nextIdNum}`;

      // 2. Insert new lab test
      const validStatuses = ['Scheduled', 'Pending', 'In Progress', 'Completed'];
      const resolvedStatus = validStatuses.includes(initialStatus) ? initialStatus : 'Scheduled';

      const { data, error } = await supabase
        .from('healthcare_lab_tests')
        .insert({
          org_id: decodedUser.orgId,
          test_number,
          patient_id,
          doctor_id,
          test_type,
          lab_technician: lab_technician || '',
          test_date: test_date || new Date().toISOString().split('T')[0],
          status: resolvedStatus,
          result: ''
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization)
        `)
        .single();

      if (error) {
        console.error('Supabase insert lab test error:', error);
        throw error;
      }

      newLabTest = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Lab test request saved successfully!',
      labTest: newLabTest
    });
  } catch (error) {
    console.error('POST lab test error:', error);
    return NextResponse.json(
      { error: 'Internal server error while saving lab test request.' },
      { status: 500 }
    );
  }
}

// PUT /api/healthcare/lab-tests - Update diagnostic lab test status
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage lab records.' },
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
    const { testId, status, result } = body;

    if (!testId || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters (testId and status are required).' },
        { status: 400 }
      );
    }

    let updatedTest = null;

    if (supabase) {
      const updatePayload = { status, updated_at: new Date() };
      // Allow uploading result notes when marking Completed
      if (result !== undefined) {
        updatePayload.result = result;
      }

      const { data, error } = await supabase
        .from('healthcare_lab_tests')
        .update(updatePayload)
        .eq('id', testId)
        .eq('org_id', decodedUser.orgId) // STRICT SECURITY BOUNDARY
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization)
        `)
        .single();

      if (error) {
        console.error('Supabase update lab test status error:', error);
        throw error;
      }

      updatedTest = data;
    }

    return NextResponse.json({
      success: true,
      message: `Lab test status updated to ${status} successfully!`,
      labTest: updatedTest
    });
  } catch (error) {
    console.error('PUT lab test error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating lab test.' },
      { status: 500 }
    );
  }
}
