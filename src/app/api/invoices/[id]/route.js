import connectToDatabase from '@/lib/db';
import Invoice from '@/lib/models/Invoice';
import Lead from '@/lib/models/Lead';
import { getUserFromRequest } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { NextResponse } from 'next/server';

// GET /api/invoices/[id] - Fetch detailed invoice metadata
export async function GET(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    await connectToDatabase();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    // Security check bounds: reps only edit their own invoices
    if (decodedUser.role === 'sales_rep' && invoice.assignedTo.toString() !== decodedUser.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
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
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
