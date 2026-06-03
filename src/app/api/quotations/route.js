import connectToDatabase from '@/lib/db';
import Quotation from '@/lib/models/Quotation';
import Lead from '@/lib/models/Lead';
import { supabase } from '@/lib/supabaseClient';
import { mapQuotationToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/quotations - Query all sales proposals with dynamic roles isolation
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'quotations')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization. Please upgrade your subscription.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

    if (supabase) {
      let queryBuilder = supabase
        .from('quotations')
        .select(`
          *,
          users!assigned_to(id, name, email),
          leads!lead_id(id, first_name, last_name, company),
          contacts!contact_id(id, first_name, last_name, company, email),
          deals!deal_id(id, title, value)
        `);

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // 1. STRICT ROLE-BASED ACCESS CONTROL
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedTo) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedTo);
      }

      // 2. Extra filters
      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // 3. Search query matches proposal title or unique quote number
      if (search) {
        queryBuilder = queryBuilder.or(`title.ilike.%${search}%,quote_number.ilike.%${search}%`);
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch quotations error:', error);
        throw error;
      }

      const quotations = (data || []).map(mapQuotationToFrontend);

      return NextResponse.json({
        success: true,
        quotations
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
    }
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

    if (!checkModuleAccess(decodedUser, 'quotations')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization. Please upgrade your subscription.' },
        { status: 403 }
      );
    }

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
    let serial;

    // 2. SERVER-SIDE FINANCIAL MATHEMATICS CALCULATIONS
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

    if (supabase) {
      let countQuery = supabase.from('quotations').select('*', { count: 'exact', head: true });
      if (decodedUser.orgId) {
        countQuery = countQuery.eq('org_id', decodedUser.orgId);
      }
      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('Supabase quotations count error:', countError);
        throw countError;
      }

      serial = String((count || 0) + 1).padStart(4, '0');
      const quoteNumber = `QT-${year}-${serial}`;

      const quotationData = {
        quote_number: quoteNumber,
        title: title.trim(),
        contact_id: contactId || null,
        lead_id: leadId || null,
        deal_id: dealId || null,
        valid_until: new Date(validUntil),
        line_items: computedLineItems,
        subtotal: Number(computedSubtotal.toFixed(2)),
        tax_rate: targetTaxRate,
        tax_amount: computedTaxAmount,
        grand_total: computedGrandTotal,
        notes: notes || '',
        status: status || 'Draft',
        assigned_to: decodedUser.id,
        org_id: decodedUser.orgId
      };

      const { data: newQuotation, error: insertError } = await supabase
        .from('quotations')
        .insert([quotationData])
        .select(`
          *,
          users!assigned_to(id, name, email),
          leads!lead_id(id, first_name, last_name, company),
          contacts!contact_id(id, first_name, last_name, company, email),
          deals!deal_id(id, title, value)
        `)
        .single();

      if (insertError) {
        console.error('Supabase quotation insert error:', insertError);
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
          const noteText = `📝 Generated Commercial Proposal: ${quoteNumber} | Grand Total: ${currencyFormatter.format(computedGrandTotal)} (Valid until: ${new Date(validUntil).toLocaleDateString('en-IN')})`;

          await supabase.from('lead_notes').insert([{
            lead_id: leadId,
            text: noteText,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name
          }]);
        } catch (err) {
          console.error('Failed to log proposal audit inside lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Commercial Proposal "${quoteNumber}" compiled and logged!`,
        quotation: mapQuotationToFrontend(newQuotation)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      const count = await Quotation.countDocuments();
      serial = String(count + 1).padStart(4, '0');
      const quoteNumber = `QT-${year}-${serial}`;

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
    }
  } catch (error) {
    console.error('Create quotation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while compiling quotation invoice.', details: error.message },
      { status: 500 }
    );
  }
}
