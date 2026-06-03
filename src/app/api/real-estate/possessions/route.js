import connectToDatabase from '@/lib/db';
import Possession from '@/lib/models/Possession';
import { supabase } from '@/lib/supabaseClient';
import { mapPossessionToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/possessions - Retrieve dynamic list of tenant-isolated possessions
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let possessions = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_possessions')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch possessions error:', error);
        throw error;
      }

      possessions = (data || []).map(mapPossessionToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoPoss = await Possession.find(filter)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title')
        .sort({ createdAt: -1 });

      possessions = mongoPoss.map(p => ({
        id: p._id,
        _id: p._id,
        bookingId: p.bookingId,
        leadId: p.leadId ? p.leadId._id : null,
        propertyId: p.propertyId ? p.propertyId._id : null,
        possessionDate: p.possessionDate,
        status: p.status || 'Scheduled',
        remarks: p.remarks || '',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        leadName: p.leadId ? `${p.leadId.firstName} ${p.leadId.lastName || ''}`.trim() : 'Unknown Lead',
        phone: p.leadId ? p.leadId.phone : '',
        company: p.leadId ? p.leadId.company : '',
        propertyTitle: p.propertyId ? p.propertyId.title : 'Standalone Property'
      }));
    }

    return NextResponse.json({ success: true, possessions });
  } catch (error) {
    console.error('GET possessions error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching possessions list.' }, { status: 500 });
  }
}

// POST /api/real-estate/possessions - Register/Schedule a new possession handover
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
    const { bookingId, leadId, propertyId, possessionDate, status, remarks } = body;

    if (!leadId || !propertyId) {
      return NextResponse.json({ error: 'Missing required parameters: leadId and propertyId are required.' }, { status: 400 });
    }

    const possessionStatusValue = status || 'Scheduled';
    const allowedStatuses = ['Scheduled', 'Handed Over', 'Delayed'];
    if (!allowedStatuses.includes(possessionStatusValue)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    let newPoss = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_possessions')
        .insert({
          org_id: decodedUser.orgId,
          booking_id: bookingId || null,
          lead_id: leadId,
          property_id: propertyId,
          possession_date: possessionDate ? new Date(possessionDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          status: possessionStatusValue,
          remarks: remarks || ''
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create possession error:', error);
        throw error;
      }

      // Fetch joined details
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_possessions')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        newPoss = mapPossessionToFrontend(joinedData);
      } else {
        newPoss = mapPossessionToFrontend(data);
      }
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const created = await Possession.create({
        orgId: decodedUser.orgId,
        bookingId: bookingId || null,
        leadId,
        propertyId,
        possessionDate: possessionDate ? new Date(possessionDate) : new Date(),
        status: possessionStatusValue,
        remarks: remarks || ''
      });

      const populated = await Possession.findById(created._id)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title');

      newPoss = {
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
      message: 'Possession schedule registered successfully!',
      possession: newPoss
    });

  } catch (error) {
    console.error('POST create possession error:', error);
    return NextResponse.json({ error: 'Internal server error while scheduling possession.' }, { status: 500 });
  }
}
