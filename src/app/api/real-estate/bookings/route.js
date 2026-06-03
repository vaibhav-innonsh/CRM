import connectToDatabase from '@/lib/db';
import Booking from '@/lib/models/Booking';
import Unit from '@/lib/models/Unit';
import { supabase } from '@/lib/supabaseClient';
import { mapBookingToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/bookings - Retrieve dynamic list of tenant-isolated customer bookings
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let bookings = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_bookings')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_units(id, unit_number, tower, floor, price)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch bookings error:', error);
        throw error;
      }

      bookings = (data || []).map(mapBookingToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoBookings = await Booking.find(filter)
        .populate('leadId', 'firstName lastName phone company')
        .populate('unitId', 'unitNumber tower floor price')
        .sort({ createdAt: -1 });

      bookings = mongoBookings.map(b => ({
        id: b._id,
        _id: b._id,
        leadId: b.leadId ? b.leadId._id : null,
        unitId: b.unitId ? b.unitId._id : null,
        propertyId: b.propertyId,
        bookingAmount: b.bookingAmount,
        bookingDate: b.bookingDate,
        status: b.status,
        notes: b.notes,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        leadName: b.leadId ? `${b.leadId.firstName} ${b.leadId.lastName || ''}`.trim() : 'Unknown Lead',
        phone: b.leadId ? b.leadId.phone : '',
        company: b.leadId ? b.leadId.company : '',
        unitNumber: b.unitId ? b.unitId.unitNumber : 'Unknown Unit',
        tower: b.unitId ? b.unitId.tower : '',
        floor: b.unitId ? b.unitId.floor : '',
        price: b.unitId ? b.unitId.price : 0
      }));
    }

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('GET bookings error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching customer bookings.' }, { status: 500 });
  }
}

// POST /api/real-estate/bookings - Record a new unit booking hold
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    const body = await req.json();
    const { leadId, unitId, bookingAmount, bookingDate, status, notes } = body;

    if (!leadId || !unitId || !bookingAmount) {
      return NextResponse.json({ error: 'Missing required parameters: leadId, unitId, and bookingAmount are required.' }, { status: 400 });
    }

    const bookingStatusValue = status || 'Confirmed';
    const allowedStatuses = ['Pending', 'Confirmed', 'Cancelled'];
    if (!allowedStatuses.includes(bookingStatusValue)) {
      return NextResponse.json({ error: `Invalid booking status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    let newBooking = null;

    if (supabase) {
      // 1. Insert Booking Record
      const { data, error } = await supabase
        .from('real_estate_bookings')
        .insert({
          org_id: decodedUser.orgId,
          lead_id: leadId,
          unit_id: unitId,
          booking_amount: Number(bookingAmount) || 0,
          booking_date: bookingDate ? new Date(bookingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: bookingStatusValue,
          notes: notes || ''
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create booking error:', error);
        throw error;
      }

      // 2. Synchronize Unit Status in postgres to 'Booked'
      const { error: unitUpdateError } = await supabase
        .from('real_estate_units')
        .update({ status: 'Booked', updated_at: new Date().toISOString() })
        .eq('id', unitId);

      if (unitUpdateError) {
        console.error('Supabase sync unit status error:', unitUpdateError);
      }

      // Fetch joined data to return cleanly mapped with lead/unit properties
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_bookings')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_units(id, unit_number, tower, floor, price)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        newBooking = mapBookingToFrontend(joinedData);
      } else {
        newBooking = mapBookingToFrontend(data);
      }

      // 3. Dynamic Auto task follow-up creation
      try {
        const clientName = joinedData?.leads ? `${joinedData.leads.first_name} ${joinedData.leads.last_name || ''}`.trim() : 'Client';
        const unitName = joinedData?.real_estate_units ? joinedData.real_estate_units.unit_number : 'Unit';
        
        await supabase.from('tasks').insert({
          org_id: decodedUser.orgId,
          subject: `Booking Sale Agreement: ${unitName}`,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          priority: 'High',
          status: 'Pending',
          notes: `Prepare and verify the Sale Deed Agreement for ${clientName} reserving Unit ${unitName}. Collect KYC files and process first installment payments.`,
          assigned_to: decodedUser.id,
          lead_id: leadId
        });
      } catch (taskErr) {
        console.error('Failed to create auto task for booking:', taskErr);
      }

    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const createdBooking = await Booking.create({
        orgId: decodedUser.orgId,
        leadId,
        unitId,
        bookingAmount: Number(bookingAmount) || 0,
        bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
        status: bookingStatusValue,
        notes: notes || ''
      });

      // Synchronize Unit Status in MongoDB
      await Unit.findByIdAndUpdate(unitId, { status: 'Booked' });

      // Fetch join values
      const populated = await Booking.findById(createdBooking._id)
        .populate('leadId', 'firstName lastName phone company')
        .populate('unitId', 'unitNumber tower floor price');

      newBooking = {
        id: populated._id,
        _id: populated._id,
        leadId: populated.leadId ? populated.leadId._id : null,
        unitId: populated.unitId ? populated.unitId._id : null,
        propertyId: populated.propertyId,
        bookingAmount: populated.bookingAmount,
        bookingDate: populated.bookingDate,
        status: populated.status,
        notes: populated.notes,
        leadName: populated.leadId ? `${populated.leadId.firstName} ${populated.leadId.lastName || ''}`.trim() : 'Unknown Lead',
        phone: populated.leadId ? populated.leadId.phone : '',
        company: populated.leadId ? populated.leadId.company : '',
        unitNumber: populated.unitId ? populated.unitId.unitNumber : 'Unknown Unit',
        tower: populated.unitId ? populated.unitId.tower : '',
        floor: populated.unitId ? populated.unitId.floor : '',
        price: populated.unitId ? populated.unitId.price : 0
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Booking recorded successfully! Task scheduled.',
      booking: newBooking
    });

  } catch (error) {
    console.error('POST create booking error:', error);
    return NextResponse.json({ error: 'Internal server error while recording booking.' }, { status: 500 });
  }
}
