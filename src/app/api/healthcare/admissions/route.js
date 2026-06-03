import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/admissions - Fetch dynamic tenant-isolated admissions list
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access ward admissions.' },
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

    let admissions = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_admissions')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization)
        `);

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Filter by status
      if (statusFilter && statusFilter !== 'All') {
        queryBuilder = queryBuilder.eq('status', statusFilter);
      }

      // Sort by newest admission date
      queryBuilder = queryBuilder.order('admission_date', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch admissions error:', error);
        throw error;
      }

      admissions = data || [];
    }

    return NextResponse.json({ success: true, admissions });
  } catch (error) {
    console.error('GET admissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching ward admissions.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/admissions - Hospitalize a patient (Allocate Room & Bed)
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage admissions.' },
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
      room, 
      bed,
      admission_date
    } = body;

    // Validation
    if (!patient_id || !doctor_id || !room || !bed) {
      return NextResponse.json(
        { error: 'Missing required fields (Patient, Doctor, Room, and Bed are required).' },
        { status: 400 }
      );
    }

    let newAdmission = null;

    if (supabase) {
      // 1. Generate sequential admission number: ADM-1001, ADM-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_admissions')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch admissions count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const admission_number = `ADM-${nextIdNum}`;

      // 2. Insert new admission record
      const { data, error } = await supabase
        .from('healthcare_admissions')
        .insert({
          org_id: decodedUser.orgId,
          admission_number,
          patient_id,
          doctor_id,
          room,
          bed,
          admission_date: admission_date || new Date().toISOString(),
          status: 'Admitted'
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization)
        `)
        .single();

      if (error) {
        console.error('Supabase insert admission error:', error);
        throw error;
      }

      newAdmission = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Patient hospitalized successfully!',
      admission: newAdmission
    });
  } catch (error) {
    console.error('POST admission error:', error);
    return NextResponse.json(
      { error: 'Internal server error while saving admission.' },
      { status: 500 }
    );
  }
}

// PUT /api/healthcare/admissions - Manage Room transfer or Patient Discharge
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage admissions.' },
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
    const { admissionId, status, room, bed } = body;

    if (!admissionId || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters (admissionId and status are required).' },
        { status: 400 }
      );
    }

    let updatedAdmission = null;

    if (supabase) {
      let updateFields = { status, updated_at: new Date() };

      // If status is Discharged, automatically populate discharge date
      if (status === 'Discharged') {
        updateFields.discharge_date = new Date().toISOString();
      }

      // If transferring room/bed
      if (room) updateFields.room = room;
      if (bed) updateFields.bed = bed;

      const { data, error } = await supabase
        .from('healthcare_admissions')
        .update(updateFields)
        .eq('id', admissionId)
        .eq('org_id', decodedUser.orgId) // STRICT SECURITY BOUNDARY
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile),
          doctor:healthcare_doctors(id, doctor_name, department, specialization)
        `)
        .single();

      if (error) {
        console.error('Supabase update admission status error:', error);
        throw error;
      }

      updatedAdmission = data;
    }

    return NextResponse.json({
      success: true,
      message: `Admission successfully updated to ${status}!`,
      admission: updatedAdmission
    });
  } catch (error) {
    console.error('PUT admission error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating admission.' },
      { status: 500 }
    );
  }
}
