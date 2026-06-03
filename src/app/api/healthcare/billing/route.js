import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/billing - Fetch invoices with patient details
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access billing data.' },
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

    let invoices = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_billing')
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile)
        `);

      if (decodedUser.orgId) queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      if (statusFilter && statusFilter !== 'All') queryBuilder = queryBuilder.eq('payment_status', statusFilter);
      if (patientIdFilter) queryBuilder = queryBuilder.eq('patient_id', patientIdFilter);

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch billing invoices error:', error);
        throw error;
      }

      invoices = data || [];
    }

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error('GET billing error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching billing invoices.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/billing - Generate a new patient invoice
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to generate invoices.' },
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
      amount, 
      tax, 
      discount,
      payment_status,
      line_items    // Gap 6: itemized billing lines [{description, amount}]
    } = body;

    // Validation
    if (!patient_id) {
      return NextResponse.json(
        { error: 'Patient selection is required.' },
        { status: 400 }
      );
    }

    const baseAmount = Number(amount) || 0;
    const taxAmount = Number(tax) || 0;
    const discountAmount = Number(discount) || 0;

    if (baseAmount < 0 || taxAmount < 0 || discountAmount < 0) {
      return NextResponse.json(
        { error: 'Amounts cannot be negative.' },
        { status: 400 }
      );
    }

    const final_amount = baseAmount + taxAmount - discountAmount;

    let newInvoice = null;

    if (supabase) {
      // 1. Generate sequential invoice number: INV-1001, INV-1002, etc. per organization
      const { count, error: countError } = await supabase
        .from('healthcare_billing')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', decodedUser.orgId);

      if (countError) {
        console.error('Supabase fetch billing count error:', countError);
        throw countError;
      }

      const nextIdNum = (count || 0) + 1001;
      const invoice_number = `INV-${nextIdNum}`;

      // 2. Insert invoice record
      const { data, error } = await supabase
        .from('healthcare_billing')
        .insert({
          org_id: decodedUser.orgId,
          invoice_number,
          patient_id,
          amount: baseAmount,
          tax: taxAmount,
          discount: discountAmount,
          final_amount: final_amount >= 0 ? final_amount : 0,
          payment_status: payment_status || 'Pending',
          line_items: Array.isArray(line_items) ? line_items : []
        })
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile)
        `)
        .single();

      if (error) {
        console.error('Supabase insert billing invoice error:', error);
        throw error;
      }

      newInvoice = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice generated successfully!',
      invoice: newInvoice
    });
  } catch (error) {
    console.error('POST billing error:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating invoice.' },
      { status: 500 }
    );
  }
}

// PUT /api/healthcare/billing - Update invoice payment status
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage billing.' },
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
    const { invoiceId, payment_status } = body;

    if (!invoiceId || !payment_status) {
      return NextResponse.json(
        { error: 'Invoice ID and payment status are required.' },
        { status: 400 }
      );
    }

    let updatedInvoice = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('healthcare_billing')
        .update({ payment_status, updated_at: new Date() })
        .eq('id', invoiceId)
        .eq('org_id', decodedUser.orgId) // STRICT SECURITY BOUNDARY
        .select(`
          *,
          patient:healthcare_patients(id, first_name, last_name, patient_id_custom, mobile)
        `)
        .single();

      if (error) {
        console.error('Supabase update billing status error:', error);
        throw error;
      }

      updatedInvoice = data;
    }

    return NextResponse.json({
      success: true,
      message: `Invoice status successfully updated to ${payment_status}!`,
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('PUT billing error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating invoice.' },
      { status: 500 }
    );
  }
}
