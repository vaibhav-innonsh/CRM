import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/appointments - Fetch dynamic tenant-isolated appointments list
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access appointments scheduler.' },
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
    const dateFilter = searchParams.get('date') || '';
    const statusFilter = searchParams.get('status') || '';
    const patientIdFilter = searchParams.get('patient_id') || '';

    let appointments = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_appointments')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile, email),
          doctor:healthcare_doctors(id, doctor_name, department, specialization, consultation_fee)
        `);

      if (decodedUser.orgId) queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      if (statusFilter && statusFilter !== 'All') queryBuilder = queryBuilder.eq('status', statusFilter);
      if (dateFilter) queryBuilder = queryBuilder.eq('appointment_date', dateFilter);
      if (patientIdFilter) queryBuilder = queryBuilder.eq('patient_id', patientIdFilter);

      queryBuilder = queryBuilder.order('appointment_date', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch appointments error:', error);
        throw error;
      }

      appointments = data || [];
    }

    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    console.error('GET appointments error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching appointments.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/appointments - Book a new consultation appointment
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to book appointments.' },
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
      department, 
      appointment_date, 
      appointment_time, 
      reason_for_visit,
      notes 
    } = body;

    // Validation
    if (!patient_id || !doctor_id || !department || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'Missing required fields (Patient ID, Doctor ID, Department, Date, and Time are required).' },
        { status: 400 }
      );
    }

    let newAppointment = null;

    if (supabase) {
      // 1. Generate sequential appointment number: APT-1001, APT-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_appointments')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch appointments count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const appointment_number = `APT-${nextIdNum}`;

      // 2. Insert new appointment
      const { data, error } = await supabase
        .from('healthcare_appointments')
        .insert({
          org_id: decodedUser.orgId,
          appointment_number,
          patient_id,
          doctor_id,
          department,
          appointment_date,
          appointment_time,
          status: 'Scheduled', // Initial default
          reason_for_visit: reason_for_visit || '',
          notes: notes || ''
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile, email),
          doctor:healthcare_doctors(id, doctor_name, department, specialization, consultation_fee)
        `)
        .single();

      if (error) {
        console.error('Supabase insert appointment error:', error);
        throw error;
      }

      newAppointment = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: newAppointment
    });
  } catch (error) {
    console.error('POST appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while booking appointment.' },
      { status: 500 }
    );
  }
}

// PUT /api/healthcare/appointments - Update appointment status
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage appointments.' },
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
    const { appointmentId, status } = body;

    if (!appointmentId || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters (appointmentId and status are required).' },
        { status: 400 }
      );
    }

    let updatedAppointment = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('healthcare_appointments')
        .update({ status, updated_at: new Date() })
        .eq('id', appointmentId)
        .eq('org_id', decodedUser.orgId) // STRICT SECURITY BOUNDARY Check
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile, email),
          doctor:healthcare_doctors(id, doctor_name, department, specialization, consultation_fee)
        `)
        .single();

      if (error) {
        console.error('Supabase update appointment status error:', error);
        throw error;
      }

      updatedAppointment = data;
    }

    return NextResponse.json({
      success: true,
      message: `Appointment status successfully updated to ${status}!`,
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('PUT appointment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating appointment.' },
      { status: 500 }
    );
  }
}
