import connectToDatabase from '@/lib/db';
import BlockedUnit from '@/lib/models/BlockedUnit';
import Property from '@/lib/models/Property';
import Deal from '@/lib/models/Deal';
import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// DELETE /api/real-estate/blocking/[id] - Release Hold or Complete Booking (Sold)
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing blocked unit ID in parameters.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'release'; // either 'release' or 'sold'

    let targetPropertyId = null;
    let targetLeadId = null;
    let targetTokenAmount = 0;
    let targetNotes = '';

    if (supabase) {
      // 1. Fetch blocked unit details to identify the property and lead
      const { data: blockData, error: blockError } = await supabase
        .from('real_estate_blocked_units')
        .select('*, leads(id, first_name, last_name, company, email, phone), real_estate_properties(id, title, location, price)')
        .eq('id', id)
        .maybeSingle();

      if (blockError) throw blockError;
      if (!blockData) {
        return NextResponse.json({ error: 'Blocked unit hold record not found.' }, { status: 404 });
      }

      targetPropertyId = blockData.property_id;
      targetLeadId = blockData.lead_id;
      targetTokenAmount = Number(blockData.token_amount) || 0;
      targetNotes = blockData.notes || '';

      const propertyTitle = blockData.real_estate_properties?.title || 'Property';
      const propertyPrice = Number(blockData.real_estate_properties?.price) || 0;
      const leadName = blockData.leads ? `${blockData.leads.first_name} ${blockData.leads.last_name || ''}`.trim() : 'Client';

      // 2. Perform actions
      if (action === 'sold') {
        // Option A: Complete Sale & Convert to Won CRM Deal
        // Update Property Status to 'Sold'
        await supabase
          .from('real_estate_properties')
          .update({ status: 'Sold', updated_at: new Date().toISOString() })
          .eq('id', targetPropertyId);

        // Auto insert Deal in CRM Deals pipeline stage 'Closed Won'
        const { error: dealError } = await supabase
          .from('deals')
          .insert({
            org_id: decodedUser.orgId,
            title: `Sold: ${propertyTitle} to ${leadName}`,
            value: propertyPrice || targetTokenAmount,
            stage: 'Closed Won', // Closed Won stage represents a successfully completed booking!
            closing_date: new Date().toISOString(),
            lead_id: targetLeadId,
            assigned_to: decodedUser.id,
            company: blockData.leads?.company || 'Real Estate Client',
            contact_email: blockData.leads?.email || '',
            contact_phone: blockData.leads?.phone || '',
            custom_data: {
              real_estate_sale: {
                propertyId: targetPropertyId,
                propertyName: propertyTitle,
                tokenAmount: targetTokenAmount,
                notes: targetNotes
              }
            }
          });

        if (dealError) {
          console.error('Failed to auto create Won Deal on unit booking completion:', dealError);
        }

        // Close associated hold tasks
        try {
          await supabase
            .from('tasks')
            .update({ status: 'Completed', updated_at: new Date().toISOString() })
            .eq('lead_id', targetLeadId)
            .ilike('subject', `%Blocked Unit%`);
        } catch (taskErr) {
          console.error('Failed to close auto blocked task:', taskErr);
        }

      } else {
        // Option B: Release Hold back to Available
        await supabase
          .from('real_estate_properties')
          .update({ status: 'Available', updated_at: new Date().toISOString() })
          .eq('id', targetPropertyId);
      }

      // 3. Delete the blocked unit hold record
      const { error: deleteError } = await supabase
        .from('real_estate_blocked_units')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Failed to delete blocked unit hold:', deleteError);
        throw deleteError;
      }

    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const mongoBlock = await BlockedUnit.findById(id).populate('propertyId');
      if (!mongoBlock) {
        return NextResponse.json({ error: 'Blocked unit hold record not found.' }, { status: 404 });
      }

      targetPropertyId = mongoBlock.propertyId._id;
      const propertyPrice = mongoBlock.propertyId.price;

      if (action === 'sold') {
        await Property.findByIdAndUpdate(targetPropertyId, { status: 'Sold' });
        // Create Deal
        await Deal.create({
          orgId: decodedUser.orgId,
          title: `Sold: ${mongoBlock.propertyId.title}`,
          value: propertyPrice,
          stage: 'Closed Won',
          closingDate: new Date(),
          leadId: mongoBlock.leadId,
          assignedTo: decodedUser.id
        });
      } else {
        await Property.findByIdAndUpdate(targetPropertyId, { status: 'Available' });
      }

      await BlockedUnit.findByIdAndDelete(id);
    }

    return NextResponse.json({
      success: true,
      message: action === 'sold' 
        ? 'Booking successfully completed! Property unit marked Sold and Closed Won Deal registered in pipelines.'
        : 'Property unit successfully released back to available inventory.'
    });

  } catch (error) {
    console.error('DELETE blocked unit hold error:', error);
    return NextResponse.json({ error: 'Internal server error while releasing property unit hold.' }, { status: 550 });
  }
}
