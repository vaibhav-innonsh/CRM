import connectToDatabase from '@/lib/db';
import Partner from '@/lib/models/Partner';
import { supabase } from '@/lib/supabaseClient';
import { mapPartnerToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/partners - Retrieve dynamic list of tenant-isolated channel partners
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let partners = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_partners')
        .select('*');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch partners error:', error);
        throw error;
      }

      partners = (data || []).map(mapPartnerToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoPartners = await Partner.find(filter).sort({ createdAt: -1 });

      partners = mongoPartners.map(p => ({
        id: p._id,
        _id: p._id,
        name: p.partnerName,
        contactPerson: p.company,
        phone: p.mobile,
        email: p.email,
        commissionPercentage: p.commissionPercentage,
        commission: `${p.commissionPercentage}% commission on bookings`,
        referredLeads: p.commissionPercentage > 0 ? (p.commissionPercentage > 2 ? 4 : 2) : 0,
        totalSales: `₹${(p.commissionPercentage > 0 ? 8500000 : 0).toLocaleString('en-IN')}`,
        payoutsDue: `₹${((p.commissionPercentage > 0 ? 8500000 : 0) * p.commissionPercentage / 100).toLocaleString('en-IN')}`,
        status: p.status || 'Active',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
    }

    return NextResponse.json({ success: true, partners });
  } catch (error) {
    console.error('GET partners error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching channel partners list.' }, { status: 500 });
  }
}

// POST /api/real-estate/partners - Register a new channel partner
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
    const { name, contactPerson, phone, email, commissionPercentage, status } = body;

    if (!name || !contactPerson) {
      return NextResponse.json({ error: 'Missing required parameters: name and contactPerson are required.' }, { status: 400 });
    }

    let newPartner = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_partners')
        .insert({
          org_id: decodedUser.orgId,
          partner_name: name.trim(),
          company: contactPerson.trim(),
          mobile: phone ? phone.trim() : '',
          email: email ? email.trim() : '',
          commission_percentage: Number(commissionPercentage) || 0,
          status: status || 'Active'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create partner error:', error);
        throw error;
      }

      newPartner = mapPartnerToFrontend(data);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const createdPartner = await Partner.create({
        orgId: decodedUser.orgId,
        partnerName: name.trim(),
        company: contactPerson.trim(),
        mobile: phone ? phone.trim() : '',
        email: email ? email.trim() : '',
        commissionPercentage: Number(commissionPercentage) || 0,
        status: status || 'Active'
      });

      newPartner = {
        id: createdPartner._id,
        _id: createdPartner._id,
        name: createdPartner.partnerName,
        contactPerson: createdPartner.company,
        phone: createdPartner.mobile,
        email: createdPartner.email,
        commissionPercentage: createdPartner.commissionPercentage,
        commission: `${createdPartner.commissionPercentage}% commission on bookings`,
        referredLeads: createdPartner.commissionPercentage > 0 ? (createdPartner.commissionPercentage > 2 ? 4 : 2) : 0,
        totalSales: `₹${(createdPartner.commissionPercentage > 0 ? 8500000 : 0).toLocaleString('en-IN')}`,
        payoutsDue: `₹${((createdPartner.commissionPercentage > 0 ? 8500000 : 0) * createdPartner.commissionPercentage / 100).toLocaleString('en-IN')}`,
        status: createdPartner.status || 'Active',
        createdAt: createdPartner.createdAt,
        updatedAt: createdPartner.updatedAt
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Channel partner broker registered successfully!',
      partner: newPartner
    });

  } catch (error) {
    console.error('POST create partner error:', error);
    return NextResponse.json({ error: 'Internal server error while registering channel partner.' }, { status: 500 });
  }
}
