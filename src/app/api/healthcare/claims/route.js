import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/claims - Fetch insurance claims with patient details
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access claims records.' },
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

    let claims = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_claims')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile)
        `);

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Filter by claim status
      if (statusFilter && statusFilter !== 'All') {
        queryBuilder = queryBuilder.eq('status', statusFilter);
      }

      // Sort by newest claim
      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch claims error:', error);
        throw error;
      }

      claims = data || [];
    }

    return NextResponse.json({ success: true, claims });
  } catch (error) {
    console.error('GET claims error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching claims records.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/claims - File an insurance claim
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage insurance claims.' },
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
      insurance_provider, 
      policy_number, 
      claim_amount
    } = body;

    // Validation
    if (!patient_id || !insurance_provider || !policy_number || !claim_amount) {
      return NextResponse.json(
        { error: 'Missing required fields (Patient, Insurance Provider, Policy Number, and Claim Amount are required).' },
        { status: 400 }
      );
    }

    const numericAmount = Number(claim_amount) || 0;
    if (numericAmount <= 0) {
      return NextResponse.json(
        { error: 'Claim amount must be greater than zero.' },
        { status: 400 }
      );
    }

    let newClaim = null;

    if (supabase) {
      // 1. Generate sequential claim number: CLM-1001, CLM-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_claims')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch claims count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const claim_number = `CLM-${nextIdNum}`;

      // 2. Insert claim record
      const { data, error } = await supabase
        .from('healthcare_claims')
        .insert({
          org_id: decodedUser.orgId,
          claim_number,
          patient_id,
          insurance_provider,
          policy_number,
          claim_amount: numericAmount,
          approved_amount: 0,
          status: 'Submitted'
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile)
        `)
        .single();

      if (error) {
        console.error('Supabase insert claim error:', error);
        throw error;
      }

      newClaim = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Insurance claim filed successfully!',
      claim: newClaim
    });
  } catch (error) {
    console.error('POST claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error while filing insurance claim.' },
      { status: 500 }
    );
  }
}

// PUT /api/healthcare/claims - Update claim status & approved amount
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage insurance claims.' },
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
    const { claimId, status, approved_amount } = body;

    if (!claimId || !status) {
      return NextResponse.json(
        { error: 'Claim ID and status are required.' },
        { status: 400 }
      );
    }

    let updatedClaim = null;

    if (supabase) {
      const updateData = { status, updated_at: new Date() };
      
      if (approved_amount !== undefined) {
        updateData.approved_amount = Number(approved_amount) || 0;
      }

      const { data, error } = await supabase
        .from('healthcare_claims')
        .update(updateData)
        .eq('id', claimId)
        .eq('org_id', decodedUser.orgId) // STRICT SECURITY BOUNDARY
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile)
        `)
        .single();

      if (error) {
        console.error('Supabase update claim error:', error);
        throw error;
      }

      updatedClaim = data;
    }

    return NextResponse.json({
      success: true,
      message: `Claim status successfully updated to ${status}!`,
      claim: updatedClaim
    });
  } catch (error) {
    console.error('PUT claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating insurance claim.' },
      { status: 500 }
    );
  }
}
