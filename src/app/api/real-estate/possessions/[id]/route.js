import connectToDatabase from '@/lib/db';
import Possession from '@/lib/models/Possession';
import Booking from '@/lib/models/Booking';
import Unit from '@/lib/models/Unit';
import Property from '@/lib/models/Property';
import { supabase } from '@/lib/supabaseClient';
import { mapPossessionToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/real-estate/possessions/[id] - Update possession status (e.g. Complete Handover) and sync sold states
export async function PUT(req, { params }) {
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
      return NextResponse.json({ error: 'Missing possession ID parameter.' }, { status: 400 });
    }

    const body = await req.json();
    const { status, remarks } = body;

    let updatedPoss = null;

    if (supabase) {
      // 1. Update possession record
      const { data, error } = await supabase
        .from('real_estate_possessions')
        .update({
          status: status || 'Handed Over',
          remarks: remarks || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, real_estate_bookings(unit_id)')
        .single();

      if (error) {
        console.error('Supabase update possession error:', error);
        throw error;
      }

      // 2. State synchronization: If handed over, update Unit status and Property status to 'Sold'
      if (status === 'Handed Over') {
        const unitId = data.real_estate_bookings ? data.real_estate_bookings.unit_id : null;
        if (unitId) {
          await supabase
            .from('real_estate_units')
            .update({ status: 'Sold', updated_at: new Date().toISOString() })
            .eq('id', unitId);
        }

        if (data.property_id) {
          await supabase
            .from('real_estate_properties')
            .update({ status: 'Sold', updated_at: new Date().toISOString() })
            .eq('id', data.property_id);
        }

        // Auto high-priority notification to welcoming customer
        try {
          await supabase.from('notifications').insert({
            recipient_id: decodedUser.id,
            sender_id: decodedUser.id,
            type: 'system',
            title: '🎉 Handover Complete',
            message: `Possession checklist finalized. Keys safely handed over to buyer. Property unit is now officially Sold!`,
            is_read: false
          });
        } catch (notifErr) {
          console.error('Failed to create handover notification:', notifErr);
        }
      }

      // Fetch joined data
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_possessions')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        updatedPoss = mapPossessionToFrontend(joinedData);
      } else {
        updatedPoss = mapPossessionToFrontend(data);
      }
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      
      const updated = await Possession.findByIdAndUpdate(
        id,
        { status: status || 'Handed Over', remarks: remarks || '' },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Possession record not found.' }, { status: 404 });
      }

      if (status === 'Handed Over') {
        // Sync Booking Unit
        if (updated.bookingId) {
          const bookingObj = await Booking.findById(updated.bookingId);
          if (bookingObj && bookingObj.unitId) {
            await Unit.findByIdAndUpdate(bookingObj.unitId, { status: 'Sold' });
          }
        }
        if (updated.propertyId) {
          await Property.findByIdAndUpdate(updated.propertyId, { status: 'Sold' });
        }
      }

      const populated = await Possession.findById(updated._id)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title');

      updatedPoss = {
        id: populated._id,
        _id: populated._id,
        bookingId: populated.bookingId,
        leadId: populated.leadId ? populated.leadId._id : null,
        propertyId: populated.propertyId ? populated.propertyId._id : null,
        possessionDate: populated.possessionDate,
        status: populated.status,
        remarks: populated.remarks,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
        leadName: populated.leadId ? `${populated.leadId.firstName} ${populated.leadId.lastName || ''}`.trim() : 'Unknown Lead',
        phone: populated.leadId ? populated.leadId.phone : '',
        company: populated.leadId ? populated.leadId.company : '',
        propertyTitle: populated.propertyId ? populated.propertyId.title : 'Standalone Property'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Possession handover updated successfully! Occupancy synchronized.',
      possession: updatedPoss
    });

  } catch (error) {
    console.error('PUT possession error:', error);
    return NextResponse.json({ error: 'Internal server error while updating possession status.' }, { status: 500 });
  }
}
