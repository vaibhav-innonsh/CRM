import connectToDatabase from '@/lib/db';
import BlockedUnit from '@/lib/models/BlockedUnit';
import Property from '@/lib/models/Property';
import Lead from '@/lib/models/Lead';
import { supabase } from '@/lib/supabaseClient';
import { mapBlockedUnitToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/blocking - Retrieve dynamic list of blocked property units
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let blockedUnits = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_blocked_units')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price, type)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Order by closest expiration deadline first
      queryBuilder = queryBuilder.order('expiration_date', { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch blocked units error:', error);
        throw error;
      }

      blockedUnits = (data || []).map(mapBlockedUnitToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoBlocks = await BlockedUnit.find(filter)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title location price type')
        .sort({ expirationDate: 1 });

      blockedUnits = mongoBlocks.map(b => ({
        id: b._id,
        _id: b._id,
        tokenAmount: b.tokenAmount,
        expirationDate: b.expirationDate,
        notes: b.notes,
        leadId: b.leadId ? {
          id: b.leadId._id,
          _id: b.leadId._id,
          firstName: b.leadId.firstName,
          lastName: b.leadId.lastName,
          phone: b.leadId.phone,
          company: b.leadId.company
        } : null,
        propertyId: b.propertyId ? {
          id: b.propertyId._id,
          _id: b.propertyId._id,
          title: b.propertyId.title,
          location: b.propertyId.location,
          price: b.propertyId.price,
          type: b.propertyId.type
        } : null,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      }));
    }

    return NextResponse.json({ success: true, blockedUnits });
  } catch (error) {
    console.error('GET blocked units error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching blocked units list.' }, { status: 500 });
  }
}

// POST /api/real-estate/blocking - Block a new property listing with token holds
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
    const { leadId, propertyId, tokenAmount, expirationDate, notes } = body;

    if (!leadId || !propertyId || !tokenAmount || !expirationDate) {
      return NextResponse.json({ error: 'Missing required parameters (leadId, propertyId, tokenAmount, expirationDate are required).' }, { status: 400 });
    }

    let newBlock = null;

    if (supabase) {
      // 1. Insert blocked unit hold
      const { data, error } = await supabase
        .from('real_estate_blocked_units')
        .insert({
          org_id: decodedUser.orgId,
          lead_id: leadId,
          property_id: propertyId,
          token_amount: Number(tokenAmount) || 0,
          expiration_date: new Date(expirationDate).toISOString(),
          notes: notes || ''
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'This property unit is already blocked by another hold.' }, { status: 400 });
        }
        console.error('Supabase block unit error:', error);
        throw error;
      }

      // 2. Synchronize Property Status to 'Blocked'
      const { error: propUpdateError } = await supabase
        .from('real_estate_properties')
        .update({ status: 'Blocked', updated_at: new Date().toISOString() })
        .eq('id', propertyId);

      if (propUpdateError) {
        console.error('Supabase sync property status error:', propUpdateError);
      }

      // Fetch joined data to return cleanly mapped
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_blocked_units')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price, type)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        newBlock = mapBlockedUnitToFrontend(joinedData);
      } else {
        newBlock = mapBlockedUnitToFrontend(data);
      }

      // 3. Dynamic Follow-up Expiry Task in CRM
      try {
        const leadName = joinedData?.leads ? `${joinedData.leads.first_name} ${joinedData.leads.last_name || ''}`.trim() : 'Client';
        const propertyTitle = joinedData?.real_estate_properties ? joinedData.real_estate_properties.title : 'Property';
        
        await supabase.from('tasks').insert({
          org_id: decodedUser.orgId,
          subject: `Blocked Unit Expiry Check: ${propertyTitle}`,
          due_date: new Date(expirationDate).toISOString(),
          priority: 'High',
          status: 'Pending',
          notes: `Check hold deposit status for property "${propertyTitle}" reserved by ${leadName}. Hold expires at ${new Date(expirationDate).toLocaleString('en-IN')}. Release or convert to sale.`,
          assigned_to: decodedUser.id,
          lead_id: leadId
        });
      } catch (taskErr) {
        console.error('Failed to create auto hold expiry task:', taskErr);
      }

    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const createdBlock = await BlockedUnit.create({
        orgId: decodedUser.orgId,
        leadId,
        propertyId,
        tokenAmount: Number(tokenAmount) || 0,
        expirationDate: new Date(expirationDate),
        notes: notes || ''
      });

      await Property.findByIdAndUpdate(propertyId, { status: 'Blocked' });

      newBlock = {
        id: createdBlock._id,
        _id: createdBlock._id,
        tokenAmount: createdBlock.tokenAmount,
        expirationDate: createdBlock.expirationDate,
        notes: createdBlock.notes
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Property unit blocked successfully!',
      block: newBlock
    });

  } catch (error) {
    console.error('POST block property unit error:', error);
    return NextResponse.json({ error: 'Internal server error while blocking property unit.' }, { status: 500 });
  }
}
