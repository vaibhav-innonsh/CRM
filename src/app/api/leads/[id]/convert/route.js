import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import Deal from '@/lib/models/Deal';
import Contact from '@/lib/models/Contact';
import { supabase } from '@/lib/supabaseClient';
import { mapDealToFrontend, mapContactToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/leads/[id]/convert - Convert lead to deal (Mark Qualified + Create Deal Card + Auto Create Contact Profile)
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { dealTitle, dealValue, closingDate } = await req.json();

    // Validate deal parameters
    if (!dealTitle || !dealTitle.trim()) {
      return NextResponse.json({ error: 'Deal title is required.' }, { status: 400 });
    }
    if (dealValue === undefined || dealValue < 0) {
      return NextResponse.json({ error: 'Deal value must be a positive number.' }, { status: 400 });
    }
    if (!closingDate) {
      return NextResponse.json({ error: 'Estimated closing date is required.' }, { status: 400 });
    }

    if (supabase) {
      const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase fetch lead error:', fetchError);
        throw fetchError;
      }

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Sales Rep can only convert their own leads OR shared leads (assigned_to is null)
      if (
        decodedUser.role === 'sales_rep' && 
        lead.assigned_to && 
        lead.assigned_to !== decodedUser.id
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to convert this lead.' },
          { status: 403 }
        );
      }

      const targetAssignedTo = lead.assigned_to || decodedUser.id;

      // 1. Create the Deal card in Supabase
      const { data: newDeal, error: dealError } = await supabase
        .from('deals')
        .insert([
          {
            title: dealTitle.trim(),
            value: Number(dealValue),
            stage: 'Prospecting', // New deals start at Prospecting stage
            closing_date: new Date(closingDate).toISOString(),
            lead_id: lead.id,
            assigned_to: targetAssignedTo, // Assign to current rep or owner
            company: lead.company,
            contact_email: lead.email || '',
            contact_phone: lead.phone || '',
          }
        ])
        .select('*')
        .single();

      if (dealError) {
        console.error('Supabase create deal error:', dealError);
        throw dealError;
      }

      // 2. Auto Create a Permanent Customer Contact Record
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert([
          {
            first_name: lead.first_name,
            last_name: lead.last_name || '',
            company: lead.company,
            designation: lead.designation || '',
            email: lead.email || '',
            phone: lead.phone || '',
            whatsapp: lead.whatsapp || '',
            city: lead.city || '',
            state: lead.state || '',
            country: lead.country || 'India',
            assigned_to: targetAssignedTo,
            lead_id: lead.id,
            status: 'Active'
          }
        ])
        .select('*')
        .single();

      if (contactError) {
        console.error('Supabase create contact error:', contactError);
        throw contactError;
      }

      // 3. Log conversion note inside lead's timeline
      const conversionNote = `🎉 Converted successfully! Created Deal "${newDeal.title}" (Valuation: ₹${newDeal.value.toLocaleString('en-IN')}) and permanent Customer Contact record for "${lead.first_name} ${lead.last_name || ''}".`;
      await supabase
        .from('lead_notes')
        .insert([
          {
            lead_id: lead.id,
            text: conversionNote,
            created_by: decodedUser.id,
            created_by_name: decodedUser.name,
          }
        ]);

      // 4. Update Lead Status to "Qualified"
      await supabase
        .from('leads')
        .update({ status: 'Qualified' })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'Lead successfully converted to an active Deal and permanent Contact!',
        deal: mapDealToFrontend(newDeal),
        contact: mapContactToFrontend(newContact)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      const lead = await Lead.findById(id);

      if (!lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Sales Rep can only convert their own leads OR shared leads (assignedTo is null)
      if (
        decodedUser.role === 'sales_rep' && 
        lead.assignedTo && 
        lead.assignedTo.toString() !== decodedUser.id
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to convert this lead.' },
          { status: 403 }
        );
      }

      // 1. Update Lead Status to "Qualified"
      lead.status = 'Qualified';

      const targetAssignedTo = lead.assignedTo || decodedUser.id;

      // 2. Create the Deal card in Mongoose
      const newDeal = await Deal.create({
        title: dealTitle.trim(),
        value: Number(dealValue),
        stage: 'Prospecting', // New deals start at Prospecting stage
        closingDate: new Date(closingDate),
        leadId: lead._id,
        assignedTo: targetAssignedTo, // Assign to current rep or owner
        company: lead.company,
        contactEmail: lead.email,
        contactPhone: lead.phone,
      });

      // 3. Auto Create a Permanent Customer Contact Record
      const newContact = await Contact.create({
        firstName: lead.firstName,
        lastName: lead.lastName || '',
        company: lead.company,
        designation: lead.designation || '',
        email: lead.email || '',
        phone: lead.phone || '',
        whatsapp: lead.whatsapp || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || 'India',
        assignedTo: targetAssignedTo,
        leadId: lead._id,
        status: 'Active'
      });

      // 4. Log conversion note inside lead's timeline
      lead.notes.push({
        text: `🎉 Converted successfully! Created Deal "${newDeal.title}" (Valuation: ₹${newDeal.value.toLocaleString('en-IN')}) and permanent Customer Contact record for "${lead.firstName} ${lead.lastName || ''}".`,
        createdBy: decodedUser.id,
        createdByName: decodedUser.name,
      });

      await lead.save();

      return NextResponse.json({
        success: true,
        message: 'Lead successfully converted to an active Deal and permanent Contact!',
        deal: newDeal,
        contact: newContact
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Lead conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error during lead conversion.', details: error.message },
      { status: 500 }
    );
  }
}

