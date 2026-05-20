import connectToDatabase from '@/lib/db';
import Quotation from '@/lib/models/Quotation';
import Lead from '@/lib/models/Lead';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/quotations - Query all sales proposals with dynamic roles isolation
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

    // 1. STICT ROLE-BASED ACCESS CONTROL
    if (decodedUser.role === 'sales_rep') {
      query.assignedTo = decodedUser.id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // 2. Extra filters
    if (status) query.status = status;

    // 3. Search query matches proposal title or unique quote number
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { quoteNumber: searchRegex }
      ];
    }

    // Populate metadata
    const quotations = await Quotation.find(query)
      .populate('assignedTo', 'name email role')
      .populate('leadId', 'firstName lastName company status')
      .populate('contactId', 'firstName lastName company status')
      .sort({ createdAt: -1 }); // Latest proposals first

    return NextResponse.json({
      success: true,
      quotations
    });
  } catch (error) {
    console.error('Fetch quotations error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching quotations list.' },
      { status: 500 }
    );
  }
}

// POST /api/quotations - Create a professional proposal and calculate server-side mathematics
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
      validUntil,
      lineItems,
      taxRate,
      notes,
      status
    } = body;

    // Basic Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Quotation/Proposal title is required.' }, { status: 400 });
    }
    if (!validUntil) {
      return NextResponse.json({ error: 'Validity deadline is required.' }, { status: 400 });
    }
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one pricing product line item is required.' }, { status: 400 });
    }

    // 1. GENERATE UNIQUE SEQUENTIAL QUOTATION NUMBER
    const year = new Date().getFullYear();
    const count = await Quotation.countDocuments();
    const serial = String(count + 1).padStart(4, '0');
    const quoteNumber = `QT-${year}-${serial}`;

    // 2. SERVER-SIDE FINANCIAL MATEMATICS CALCULATIONS
    let computedSubtotal = 0;
    const computedLineItems = lineItems.map((item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const discount = Number(item.discount) || 0; // Discount percentage
      
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

    // Save quotation record
    const newQuotation = await Quotation.create({
      quoteNumber,
      title: title.trim(),
      contactId: contactId || null,
      leadId: leadId || null,
      dealId: dealId || null,
      validUntil: new Date(validUntil),
      lineItems: computedLineItems,
      subtotal: Number(computedSubtotal.toFixed(2)),
      taxRate: targetTaxRate,
      taxAmount: computedTaxAmount,
      grandTotal: computedGrandTotal,
      notes: notes || '',
      status: status || 'Draft',
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
            text: `📝 Generated Commercial Proposal: ${newQuotation.quoteNumber} | Grand Total: ${currencyFormatter.format(newQuotation.grandTotal)} (Valid until: ${newQuotation.validUntil.toLocaleDateString('en-IN')})`,
            createdBy: decodedUser.id,
            createdByName: decodedUser.name
          });
          await lead.save();
        }
      } catch (err) {
        console.error('Failed to log proposal audit inside lead notes:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Commercial Proposal "${newQuotation.quoteNumber}" compiled and logged!`,
      quotation: newQuotation
    }, { status: 201 });
  } catch (error) {
    console.error('Create quotation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while compiling quotation invoice.', details: error.message },
      { status: 500 }
    );
  }
}
