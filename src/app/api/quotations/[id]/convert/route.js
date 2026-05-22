import connectToDatabase from '@/lib/db';
import Quotation from '@/lib/models/Quotation';
import Invoice from '@/lib/models/Invoice';
import Lead from '@/lib/models/Lead';
import { supabase } from '@/lib/supabaseClient';
import { mapInvoiceToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/quotations/[id]/convert - Convert commercial quotation to dynamic Tax Invoice
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (supabase) {
      const { data: quotation, error: fetchError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !quotation) {
        return NextResponse.json({ error: 'Quotation proposal not found.' }, { status: 404 });
      }

      // Security check: reps only convert their own quotes
      if (decodedUser.role === 'sales_rep' && quotation.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this quotation.' }, { status: 403 });
      }

      // 1. GENERATE SEQUENTIAL UNIQUE INVOICE NUMBER
      const year = new Date().getFullYear();
      const { count, error: countError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Supabase invoices count error:', countError);
        throw countError;
      }

      const serial = String((count || 0) + 1).padStart(4, '0');
      const invoiceNumber = `INV-${year}-${serial}`;

      // 2. DEFINE AUTOMATIC PAYMENT DUE DATE (15 Days from conversion date)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      // 3. COMPILE NEW TAX INVOICE OBJECT
      const invoiceData = {
        invoice_number: invoiceNumber,
        title: `Invoice for ${quotation.title}`,
        quotation_id: quotation.id,
        contact_id: quotation.contact_id || null,
        lead_id: quotation.lead_id || null,
        deal_id: quotation.deal_id || null,
        due_date: dueDate,
        line_items: quotation.line_items,
        subtotal: Number(quotation.subtotal) || 0,
        tax_rate: Number(quotation.tax_rate) || 18,
        tax_amount: Number(quotation.tax_amount) || 0,
        grand_total: Number(quotation.grand_total) || 0,
        amount_paid: 0,
        balance_due: Number(quotation.grand_total) || 0,
        status: 'Unpaid',
        payments: [],
        notes: quotation.notes || 'Generated from pricing proposal.',
        assigned_to: quotation.assigned_to
      };

      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select(`
          *,
          users!assigned_to(id, name, email),
          leads!lead_id(*),
          contacts!contact_id(*),
          deals!deal_id(id, title, value)
        `)
        .single();

      if (insertError) {
        console.error('Supabase invoice insert error:', insertError);
        throw insertError;
      }

      // 4. UPDATE QUOTATION STATUS TO ACCEPTED
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ status: 'Accepted' })
        .eq('id', id);

      if (updateError) {
        console.error('Supabase quotation update status error:', updateError);
      }

      // 5. AUTO-TIMELINE AUDITING TRIGGER INSIDE LEAD
      if (quotation.lead_id) {
        try {
          const currencyFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });
          const noteText = `🔄 Converted Pricing Proposal ${quotation.quote_number} to Tax Invoice ${invoiceNumber} | Cumulative Due: ${currencyFormatter.format(Number(quotation.grand_total))}`;

          await supabase.from('lead_notes').insert([{
            lead_id: quotation.lead_id,
            text: noteText,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name
          }]);
        } catch (err) {
          console.error('Failed to log conversion audit inside lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Quotation "${quotation.quote_number}" successfully converted to Invoice "${invoiceNumber}"!`,
        invoice: mapInvoiceToFrontend(newInvoice)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      const quotation = await Quotation.findById(id);

      if (!quotation) {
        return NextResponse.json({ error: 'Quotation proposal not found.' }, { status: 404 });
      }

      // Security check: reps only convert their own quotes
      if (decodedUser.role === 'sales_rep' && quotation.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this quotation.' }, { status: 403 });
      }

      // 1. GENERATE SEQUENTIAL UNIQUE INVOICE NUMBER
      const year = new Date().getFullYear();
      const count = await Invoice.countDocuments();
      const serial = String(count + 1).padStart(4, '0');
      const invoiceNumber = `INV-${year}-${serial}`;

      // 2. DEFINE AUTOMATIC PAYMENT DUE DATE (15 Days from conversion date)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      // 3. COMPILE NEW TAX INVOICE OBJECT
      const newInvoice = await Invoice.create({
        invoiceNumber,
        title: `Invoice for ${quotation.title}`,
        quotationId: quotation._id,
        contactId: quotation.contactId || null,
        leadId: quotation.leadId || null,
        dealId: quotation.dealId || null,
        dueDate,
        lineItems: quotation.lineItems,
        subtotal: quotation.subtotal,
        taxRate: quotation.taxRate,
        taxAmount: quotation.taxAmount,
        grandTotal: quotation.grandTotal,
        amountPaid: 0,
        balanceDue: quotation.grandTotal,
        status: 'Unpaid',
        payments: [],
        notes: quotation.notes || 'Generated from pricing proposal.',
        assignedTo: quotation.assignedTo
      });

      // 4. UPDATE QUOTATION STATUS TO ACCEPTED
      quotation.status = 'Accepted';
      await quotation.save();

      // 5. AUTO-TIMELINE AUDITING TRIGGER INSIDE LEAD
      if (quotation.leadId) {
        try {
          const lead = await Lead.findById(quotation.leadId);
          if (lead) {
            const currencyFormatter = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0
            });
            lead.notes.push({
              text: `🔄 Converted Pricing Proposal ${quotation.quoteNumber} to Tax Invoice ${newInvoice.invoiceNumber} | Cumulative Due: ${currencyFormatter.format(newInvoice.grandTotal)}`,
              createdBy: decodedUser.id,
              createdByName: decodedUser.name
            });
            await lead.save();
          }
        } catch (err) {
          console.error('Failed to log conversion audit inside lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Quotation "${quotation.quoteNumber}" successfully converted to Invoice "${newInvoice.invoiceNumber}"!`,
        invoice: newInvoice
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Convert proposal to invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error while converting quotation to tax invoice.', details: error.message },
      { status: 500 }
    );
  }
}
