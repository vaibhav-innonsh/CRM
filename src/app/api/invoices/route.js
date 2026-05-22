import connectToDatabase from '@/lib/db';
import Invoice from '@/lib/models/Invoice';
import Lead from '@/lib/models/Lead';
import { supabase } from '@/lib/supabaseClient';
import { mapInvoiceToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/invoices - Retrieve billing invoices with security bounds
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

    if (supabase) {
      let queryBuilder = supabase
        .from('invoices')
        .select(`
          *,
          users!assigned_to(id, name, email),
          leads!lead_id(id, first_name, last_name, company),
          contacts!contact_id(id, first_name, last_name, company, email),
          deals!deal_id(id, title, value)
        `);

      // 1. STRICT ROLE-BASED ACCESS CONTROL
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedTo) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedTo);
      }

      // Extra filters
      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // Text search matches invoiceNumber or title
      if (search) {
        queryBuilder = queryBuilder.or(`title.ilike.%${search}%,invoice_number.ilike.%${search}%`);
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch invoices error:', error);
        throw error;
      }

      const invoices = (data || []).map(mapInvoiceToFrontend);

      return NextResponse.json({
        success: true,
        invoices
      });
    } else {
      await connectToDatabase();

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
    }
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
    let serial;

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

    if (supabase) {
      const { count, error: countError } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Supabase invoices count error:', countError);
        throw countError;
      }

      serial = String((count || 0) + 1).padStart(4, '0');
      const invoiceNumber = `INV-${year}-${serial}`;

      const invoiceData = {
        invoice_number: invoiceNumber,
        title: title.trim(),
        quotation_id: null,
        contact_id: contactId || null,
        lead_id: leadId || null,
        deal_id: dealId || null,
        due_date: new Date(dueDate),
        line_items: computedLineItems,
        subtotal: Number(computedSubtotal.toFixed(2)),
        tax_rate: targetTaxRate,
        tax_amount: computedTaxAmount,
        grand_total: computedGrandTotal,
        amount_paid: 0,
        balance_due: computedGrandTotal,
        status: 'Unpaid',
        payments: [],
        notes: notes || '',
        assigned_to: decodedUser.id
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

      // 3. AUTO-TIMELINE AUDITING TRIGGER INSIDE LEAD
      if (leadId) {
        try {
          const currencyFormatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });
          const noteText = `🧾 Issued Corporate Tax Invoice: ${invoiceNumber} | Total Net Due: ${currencyFormatter.format(computedGrandTotal)} (Payment Deadline: ${new Date(dueDate).toLocaleDateString('en-IN')})`;

          await supabase.from('lead_notes').insert([{
            lead_id: leadId,
            text: noteText,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name
          }]);
        } catch (err) {
          console.error('Failed to log invoice audit inside lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Tax Invoice "${invoiceNumber}" compiled and issued successfully!`,
        invoice: mapInvoiceToFrontend(newInvoice)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      const count = await Invoice.countDocuments();
      serial = String(count + 1).padStart(4, '0');
      const invoiceNumber = `INV-${year}-${serial}`;

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
    }
  } catch (error) {
    console.error('Create invoice API error:', error);
    return NextResponse.json(
      { error: 'Internal server error compiling invoice sheet.', details: error.message },
      { status: 500 }
    );
  }
}
