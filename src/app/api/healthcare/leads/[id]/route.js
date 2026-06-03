import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/healthcare/leads/[id] - Update a patient prospect record
export async function PUT(req, { params }) {
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

    const body = await req.json();
    const { 
      first_name, 
      last_name, 
      mobile, 
      email, 
      source, 
      interested_service, 
      symptoms, 
      status, 
      assigned_to 
    } = body;

    let updatedLead = null;

    if (supabase) {
      // 1. Fetch current lead to verify ownership/tenancy
      const { data: currentLead, error: fetchError } = await supabase
        .from('healthcare_leads')
        .select('org_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !currentLead) {
        return NextResponse.json({ error: 'Patient prospect record not found.' }, { status: 404 });
      }

      // Tenant isolation check
      if (currentLead.org_id !== decodedUser.orgId) {
        return NextResponse.json({ error: 'Access forbidden.' }, { status: 403 });
      }

      // 2. Perform update
      const updateData = {};
      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (mobile !== undefined) updateData.mobile = mobile;
      if (email !== undefined) updateData.email = email;
      if (source !== undefined) updateData.source = source;
      if (interested_service !== undefined) updateData.interested_service = interested_service;
      if (symptoms !== undefined) updateData.symptoms = symptoms;
      if (status !== undefined) updateData.status = status;
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('healthcare_leads')
        .update(updateData)
        .eq('id', id)
        .select('*, users:assigned_to(id, name, email)')
        .single();

      if (error) {
        console.error('Supabase update healthcare lead error:', error);
        throw error;
      }

      updatedLead = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Patient prospect updated successfully!',
      lead: updatedLead
    });
  } catch (error) {
    console.error('PUT healthcare lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating patient prospect.' },
      { status: 500 }
    );
  }
}

// DELETE /api/healthcare/leads/[id] - Remove a patient prospect record
export async function DELETE(req, { params }) {
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
      // 1. Fetch to verify ownership
      const { data: currentLead, error: fetchError } = await supabase
        .from('healthcare_leads')
        .select('org_id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !currentLead) {
        return NextResponse.json({ error: 'Patient prospect record not found.' }, { status: 404 });
      }

      if (currentLead.org_id !== decodedUser.orgId) {
        return NextResponse.json({ error: 'Access forbidden.' }, { status: 403 });
      }

      // 2. Perform delete
      const { error } = await supabase
        .from('healthcare_leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete healthcare lead error:', error);
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Patient prospect record deleted successfully!'
    });
  } catch (error) {
    console.error('DELETE healthcare lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting patient prospect.' },
      { status: 500 }
    );
  }
}
