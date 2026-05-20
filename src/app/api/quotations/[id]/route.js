import connectToDatabase from '@/lib/db';
import Quotation from '@/lib/models/Quotation';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/quotations/[id] - Fetch single quotation proposal details
export async function GET(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const quotation = await Quotation.findById(id)
      .populate('assignedTo', 'name email role')
      .populate('leadId', 'firstName lastName company email phone city state address country')
      .populate('contactId', 'firstName lastName company email phone city state address country');

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation details not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Reps can only view their own quotations
    if (decodedUser.role === 'sales_rep' && quotation.assignedTo.toString() !== decodedUser.id) {
      return NextResponse.json({ error: 'Forbidden. You do not own this quotation.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      quotation
    });
  } catch (error) {
    console.error('Fetch single quotation error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// PUT /api/quotations/[id] - Reschedule status or modify proposal line items
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Reps can only edit their own quotations
    if (decodedUser.role === 'sales_rep' && quotation.assignedTo.toString() !== decodedUser.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      validUntil,
      lineItems,
      taxRate,
      notes,
      status
    } = body;

    // Apply basic property updates
    if (title !== undefined) quotation.title = title.trim();
    if (validUntil !== undefined) quotation.validUntil = new Date(validUntil);
    if (notes !== undefined) quotation.notes = notes.trim();
    if (status !== undefined) quotation.status = status;

    // RE-CALCULATE MATHEMATICS IF ITEMS ARE CHANGED
    if (lineItems !== undefined && Array.isArray(lineItems)) {
      if (lineItems.length === 0) {
        return NextResponse.json({ error: 'Quotation must have at least one line item product.' }, { status: 400 });
      }

      let computedSubtotal = 0;
      const computedLineItems = lineItems.map((item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 1;
        const discount = Number(item.discount) || 0;
        
        const itemSubtotal = price * quantity;
        const discountAmount = itemSubtotal * (discount / 100);
        const itemTotal = Number((itemSubtotal - discountAmount).toFixed(2));
        
        computedSubtotal += itemTotal;

        return {
          productId: item.productId,
          name: item.name,
          price,
          quantity,
          discount,
          total: itemTotal
        };
      });

      quotation.lineItems = computedLineItems;
      quotation.subtotal = Number(computedSubtotal.toFixed(2));
    }

    if (taxRate !== undefined) {
      quotation.taxRate = Number(taxRate);
    }

    // Always compile final totals after updates
    const finalTaxRate = quotation.taxRate || 18;
    quotation.taxAmount = Number((quotation.subtotal * (finalTaxRate / 100)).toFixed(2));
    quotation.grandTotal = Number((quotation.subtotal + quotation.taxAmount).toFixed(2));

    await quotation.save();

    return NextResponse.json({
      success: true,
      message: 'Quotation updated successfully.',
      quotation
    });
  } catch (error) {
    console.error('Update quotation error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/quotations/[id] - Remove a proposal record
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Reps can only delete their own quotations
    if (decodedUser.role === 'sales_rep' && quotation.assignedTo.toString() !== decodedUser.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await Quotation.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Quotation deleted successfully.'
    });
  } catch (error) {
    console.error('Delete quotation error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
