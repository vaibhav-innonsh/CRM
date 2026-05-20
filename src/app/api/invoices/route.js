import connectToDatabase from '@/lib/db';
import Invoice from '@/lib/models/Invoice';
import Lead from '@/lib/models/Lead';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/invoices - Retrieve billing invoices with security bounds
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

    let query = {};

    // 1. STRICT ROLE-BASED ACCESS CONTROL
    if (decodedUser.role === 'sales_rep') {
      query.assignedTo = decodedUser.id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Extra filters
    if (status) {
      query.status = status;
    }

    // Text search matches invoiceNumber or title
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { invoiceNumber: searchRegex }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('assignedTo', 'name email role')
      .populate('leadId', 'firstName lastName company status')
      .populate('contactId', 'firstName lastName company status')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      invoices
    });
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching invoices.' },
      { status: 500 }
    );
  }
}

// POST /api/invoices - Compile and issue a new tax invoice manually
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const {
      title,
      contactId,
      leadId,
      dealId,
      dueDate,
      lineItems,
      taxRate,
      notes
    } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Invoice title is required.' }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ error: 'Payment due deadline is required.' }, { status: 400 });
    }
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one product line item is required.' }, { status: 400 });
    }

    // 1. GENERATE UNIQUE SEQUENTIAL INVOICE NUMBER
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments();
    const serial = String(count + 1).padStart(4, '0');
    const invoiceNumber = `INV-${year}-${serial}`;

    // 2. SERVER-SIDE FINANCIAL MATHEMATICS
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

    const targetTaxRate = taxRate !== undefined ? Number(taxRate) : 18; // Default 18% GST
    const computedTaxAmount = Number((computedSubtotal * (targetTaxRate / 100)).toFixed(2));
    const computedGrandTotal = Number((computedSubtotal + computedTaxAmount).toFixed(2));

    // Save invoice log
    const newInvoice = await Invoice.create({
      invoiceNumber,
      title: title.trim(),
      quotationId: null,
      contactId: contactId || null,
      leadId: leadId || null,
      dealId: dealId || null,
      dueDate: new Date(dueDate),
      lineItems: computedLineItems,
      subtotal: Number(computedSubtotal.toFixed(2)),
      taxRate: targetTaxRate,
      taxAmount: computedTaxAmount,
      grandTotal: computedGrandTotal,
      amountPaid: 0,
      balanceDue: computedGrandTotal,
      status: 'Unpaid',
      payments: [],
      notes: notes || '',
      assignedTo: decodedUser.id
    });

    // 3. AUTO-TIMELINE AUDITING TRIGGER INSIDE LEAD
    if (leadId) {
      try {
        const lead = await Lead.findById(leadId);
        if (lead) {
          const currencyFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });
          lead.notes.push({
            text: `🧾 Issued Corporate Tax Invoice: ${newInvoice.invoiceNumber} | Total Net Due: ${currencyFormatter.format(newInvoice.grandTotal)} (Payment Deadline: ${newInvoice.dueDate.toLocaleDateString('en-IN')})`,
            createdBy: decodedUser.id,
            createdByName: decodedUser.name
          });
          await lead.save();
        }
      } catch (err) {
        console.error('Failed to log invoice audit inside lead notes:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Tax Invoice "${newInvoice.invoiceNumber}" compiled and issued successfully!`,
      invoice: newInvoice
    }, { status: 201 });
  } catch (error) {
    console.error('Create invoice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error compiling invoice sheet.', details: error.message },
      { status: 500 }
    );
  }
}
