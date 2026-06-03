import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/leads - Fetch tenant-isolated healthcare leads list
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access records.' },
        { status: 401 }
      );
    }

    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    let leads = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_leads')
        .select('*, users:assigned_to(id, name, email)');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      if (status && status !== 'All') {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // Search (First name, Last name, Mobile, Email, Symptoms)
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(`first_name.ilike.${s},last_name.ilike.${s},mobile.ilike.${s},email.ilike.${s},symptoms.ilike.${s}`);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch healthcare leads error:', error);
        throw error;
      }

      leads = data || [];
    }

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('GET healthcare leads error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching patient prospects.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/leads - Create a new patient prospect (healthcare lead)
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

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

    const body = await req.json();
    const { 
      first_name, 
      last_name, 
      mobile, 
      email, 
      source, 
      interested_service, 
      symptoms, 
      assigned_to 
    } = body;

    // Validation
    if (!first_name || !mobile) {
      return NextResponse.json(
        { error: 'Missing required fields (First name and Mobile number are required).' },
        { status: 400 }
      );
    }

    let newLead = null;

    if (supabase) {
      // 1. Generate sequential lead ID: HPL-1001, HPL-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch healthcare leads count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const lead_id_custom = `HPL-${nextIdNum}`;

      // 2. Insert new healthcare lead
      const { data, error } = await supabase
        .from('healthcare_leads')
        .insert({
          org_id: decodedUser.orgId,
          lead_id_custom,
          first_name,
          last_name: last_name || '',
          mobile,
          email: email || '',
          source: source || 'Website',
          interested_service: interested_service || '',
          symptoms: symptoms || '',
          status: 'New',
          assigned_to: assigned_to || decodedUser.id
        })
        .select('*, users:assigned_to(id, name, email)')
        .single();

      if (error) {
        console.error('Supabase insert healthcare lead error:', error);
        throw error;
      }

      newLead = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Patient prospect registered successfully!',
      lead: newLead
    });
  } catch (error) {
    console.error('POST healthcare lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while registering patient prospect.' },
      { status: 500 }
    );
  }
}
