import connectToDatabase from '@/lib/db';
import Invoice from '@/lib/models/Invoice';
import Lead from '@/lib/models/Lead';
import { supabase } from '@/lib/supabaseClient';
import { mapInvoiceToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// GET /api/invoices/[id] - Fetch detailed invoice metadata
export async function GET(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          users!assigned_to(id, name, email),
          leads!lead_id(*),
          contacts!contact_id(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      // Security check bounds: reps only see their own invoices
      if (decodedUser.role === 'sales_rep' && invoice.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this invoice.' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        invoice: mapInvoiceToFrontend(invoice)
      });

    } else {
      await connectToDatabase();

      const invoice = await Invoice.findById(id)
        .populate('assignedTo', 'name email role')
        .populate('leadId', 'firstName lastName company email phone city state address country')
        .populate('contactId', 'firstName lastName company email phone city state address country');

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      // Security check bounds: reps only see their own invoices
      if (decodedUser.role === 'sales_rep' && invoice.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this invoice.' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        invoice
      });
    }
  } catch (error) {
    console.error('Fetch invoice detail error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Update invoice or Record a new Payment receipt
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      dueDate,
      notes,
      status,
      // Payment receipt object
      paymentReceipt
    } = body;

    if (supabase) {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      // Security check bounds: reps only edit their own invoices
      if (decodedUser.role === 'sales_rep' && invoice.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      // A. EXTREME FEATURE: RECORD PAYMENT RECEIPTS TRANSACTION
      if (paymentReceipt) {
        const { amount, paymentMethod, transactionRef, notes: paymentNotes } = paymentReceipt;

        const paymentAmt = Number(amount) || 0;
        if (paymentAmt <= 0) {
          return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 });
        }

        const balanceDue = Number(invoice.balance_due) || 0;

        // Check if payment exceeds remaining balance
        if (paymentAmt > Number(balanceDue.toFixed(2))) {
          return NextResponse.json({
            error: `Payment Clash: Amount ₹${paymentAmt} exceeds the remaining balance due of ₹${balanceDue.toFixed(2)}.`
          }, { status: 400 });
        }

        // Append transaction receipt
        const currentPayments = Array.isArray(invoice.payments) ? invoice.payments : [];
        const newPayment = {
          id: crypto.randomUUID(),
          amount: paymentAmt,
          payment_date: new Date().toISOString(),
          payment_method: paymentMethod,
          transaction_ref: transactionRef || '',
          notes: paymentNotes || ''
        };

        // Update counters
        const amountPaid = Number((Number(invoice.amount_paid || 0) + paymentAmt).toFixed(2));
        let finalBalance = Number((Number(invoice.grand_total) - amountPaid).toFixed(2));
        let updatedStatus = invoice.status;

        if (finalBalance <= 0) {
          updatedStatus = 'Paid';
          finalBalance = 0;
        } else {
          updatedStatus = 'Partially Paid';
        }

        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({
            payments: [...currentPayments, newPayment],
            amount_paid: amountPaid,
            balance_due: finalBalance,
            status: updatedStatus
          })
          .eq('id', id)
          .select(`
            *,
            users!assigned_to(id, name, email),
            leads!lead_id(*),
            contacts!contact_id(*)
          `)
          .single();

        if (updateError) {
          console.error('Supabase invoice payment update error:', updateError);
          throw updateError;
        }

        // Trigger dynamic system notification alert
        try {
          const currencyFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });
          await createNotification(
            updatedInvoice.assigned_to,
            'Invoice',
            `Payment Logged - ${updatedInvoice.invoice_number}`,
            `Recovered ${currencyFormatter.format(paymentAmt)} via ${paymentMethod} for "${updatedInvoice.title}". Remaining balance due: ${currencyFormatter.format(finalBalance)}.`,
            '/dashboard/invoices',
            decodedUser.id
          );
        } catch (noticeErr) {
          console.error('Failed to issue payment notification alert:', noticeErr);
        }

        // AUTO-TIMELINE AUDITING TRIGGER INSIDE LEAD
        if (updatedInvoice.lead_id) {
          try {
            const currencyFormatter = new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0
            });
            const noteText = `💳 Payment Received: ${currencyFormatter.format(paymentAmt)} via ${paymentMethod} for Invoice ${updatedInvoice.invoice_number} | Remaining Balance: ${currencyFormatter.format(finalBalance)}`;

            await supabase.from('lead_notes').insert([{
              lead_id: updatedInvoice.lead_id,
              text: noteText,
              created_by: decodedUser.id,
              created_by_name: decodedUser.name
            }]);
          } catch (err) {
            console.error('Failed to log payment audit inside lead notes:', err);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Payment transaction successfully recorded and balance updated!',
          invoice: mapInvoiceToFrontend(updatedInvoice)
        });
      }

      // B. STANDARD EDITS PROPERTIES UPDATE
      const updateData = {};
      if (title !== undefined) updateData.title = title.trim();
      if (dueDate !== undefined) updateData.due_date = new Date(dueDate);
      if (notes !== undefined) updateData.notes = notes.trim();
      if (status !== undefined) updateData.status = status;

      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          users!assigned_to(id, name, email),
          leads!lead_id(*),
          contacts!contact_id(*)
        `)
        .single();

      if (updateError) {
        console.error('Supabase invoice update error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice updated successfully.',
        invoice: mapInvoiceToFrontend(updatedInvoice)
      });

    } else {
      await connectToDatabase();

      const invoice = await Invoice.findById(id);

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      // Security check bounds: reps only edit their own invoices
      if (decodedUser.role === 'sales_rep' && invoice.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      // A. EXTREME FEATURE: RECORD PAYMENT RECEIPTS TRANSACTION
      if (paymentReceipt) {
        const { amount, paymentMethod, transactionRef, notes: paymentNotes } = paymentReceipt;

        const paymentAmt = Number(amount) || 0;
        if (paymentAmt <= 0) {
          return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 });
        }

        // Check if payment exceeds remaining balance
        if (paymentAmt > Number(invoice.balanceDue.toFixed(2))) {
          return NextResponse.json({
            error: `Payment Clash: Amount ₹${paymentAmt} exceeds the remaining balance due of ₹${invoice.balanceDue.toFixed(2)}.`
          }, { status: 400 });
        }

        // Append transaction receipt
        invoice.payments.push({
          amount: paymentAmt,
          paymentDate: new Date(),
          paymentMethod,
          transactionRef: transactionRef || '',
          notes: paymentNotes || ''
        });

        // Update counters
        invoice.amountPaid = Number((invoice.amountPaid + paymentAmt).toFixed(2));
        invoice.balanceDue = Number((invoice.grandTotal - invoice.amountPaid).toFixed(2));

        // Calculate status transition
        if (invoice.balanceDue <= 0) {
          invoice.status = 'Paid';
          invoice.balanceDue = 0;
        } else {
          invoice.status = 'Partially Paid';
        }

        await invoice.save();

        // Trigger dynamic system notification alert
        try {
          const currencyFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });
          await createNotification(
            invoice.assignedTo,
            'Invoice',
            `Payment Logged - ${invoice.invoiceNumber}`,
            `Recovered ${currencyFormatter.format(paymentAmt)} via ${paymentMethod} for "${invoice.title}". Remaining balance due: ${currencyFormatter.format(invoice.balanceDue)}.`,
            '/dashboard/invoices',
            decodedUser.id
          );
        } catch (noticeErr) {
          console.error('Failed to issue payment notification alert:', noticeErr);
        }

        // AUTO-TIMELINE AUDITING TRIGGER INSIDE LEAD
        if (invoice.leadId) {
          try {
            const lead = await Lead.findById(invoice.leadId);
            if (lead) {
              const currencyFormatter = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
              });
              lead.notes.push({
                text: `💳 Payment Received: ${currencyFormatter.format(paymentAmt)} via ${paymentMethod} for Invoice ${invoice.invoiceNumber} | Remaining Balance: ${currencyFormatter.format(invoice.balanceDue)}`,
                createdBy: decodedUser.id,
                createdByName: decodedUser.name
              });
              await lead.save();
            }
          } catch (err) {
            console.error('Failed to log payment audit inside lead notes:', err);
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Payment transaction successfully recorded and balance updated!',
          invoice
        });
      }

      // B. STANDARD EDITS PROPERTIES UPDATE
      if (title !== undefined) invoice.title = title.trim();
      if (dueDate !== undefined) invoice.dueDate = new Date(dueDate);
      if (notes !== undefined) invoice.notes = notes.trim();
      if (status !== undefined) invoice.status = status;

      await invoice.save();

      return NextResponse.json({
        success: true,
        message: 'Invoice updated successfully.',
        invoice
      });
    }
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/invoices/[id] - Delete invoice record
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      // Security bounds: reps only delete their own invoices
      if (decodedUser.role === 'sales_rep' && invoice.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase invoice delete error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Invoice deleted successfully.'
      });
    } else {
      await connectToDatabase();

      const invoice = await Invoice.findById(id);

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      // Security bounds: reps only delete their own invoices
      if (decodedUser.role === 'sales_rep' && invoice.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      await Invoice.findByIdAndDelete(id);

      return NextResponse.json({
        success: true,
        message: 'Invoice deleted successfully.'
      });
    }
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
