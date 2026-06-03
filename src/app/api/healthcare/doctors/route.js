import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/doctors - Fetch dynamic tenant-isolated doctors catalog
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access doctors directory.' },
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
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';

    let doctors = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_doctors')
        .select('*');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Dropdown Filters
      if (department && department !== 'All') {
        queryBuilder = queryBuilder.eq('department', department);
      }
      if (status && status !== 'All') {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // Search (Doctor name, Specialization)
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(`doctor_name.ilike.${s},specialization.ilike.${s}`);
      }

      // Sort by newest by default
      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch doctors error:', error);
        throw error;
      }

      doctors = data || [];
    }

    return NextResponse.json({ success: true, doctors });
  } catch (error) {
    console.error('GET doctors error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching doctors directory.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/doctors - Add a new doctor record
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage doctors directory.' },
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
      doctor_name, 
      specialization, 
      department, 
      email, 
      mobile, 
      qualification, 
      experience, 
      consultation_fee,
      availability 
    } = body;

    // Validation
    if (!doctor_name || !specialization || !department || consultation_fee === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (Doctor name, Specialization, Department, and Consultation fee are required).' },
        { status: 400 }
      );
    }

    let newDoctor = null;

    if (supabase) {
      // 1. Generate sequential doctor ID: DOC-1001, DOC-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_doctors')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch doctors count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const doctor_id_custom = `DOC-${nextIdNum}`;

      // 2. Insert new doctor
      const { data, error } = await supabase
        .from('healthcare_doctors')
        .insert({
          org_id: decodedUser.orgId,
          doctor_id_custom,
          doctor_name,
          specialization,
          department,
          email: email || '',
          mobile: mobile || '',
          qualification: qualification || '',
          experience: experience || '',
          consultation_fee: Number(consultation_fee) || 0,
          availability: availability || [],
          status: 'Active'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase insert doctor error:', error);
        throw error;
      }

      newDoctor = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Doctor added successfully!',
      doctor: newDoctor
    });
  } catch (error) {
    console.error('POST doctor error:', error);
    return NextResponse.json(
      { error: 'Internal server error while adding doctor.' },
      { status: 500 }
    );
  }
}
