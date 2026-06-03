import connectToDatabase from '@/lib/db';
import Partner from '@/lib/models/Partner';
import { supabase } from '@/lib/supabaseClient';
import { mapPartnerToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/real-estate/partners/[id] - Release partner payout (sets commission percentage to 0 to represent paid payout)
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
      return NextResponse.json({ error: 'Missing partner ID parameters.' }, { status: 400 });
    }

    let updatedPartner = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_partners')
        .update({
          commission_percentage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Supabase update partner error:', error);
        throw error;
      }

      updatedPartner = mapPartnerToFrontend(data);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const updated = await Partner.findByIdAndUpdate(
        id,
        { commissionPercentage: 0 },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json({ error: 'Partner not found.' }, { status: 404 });
      }

      updatedPartner = {
        id: updated._id,
        _id: updated._id,
        name: updated.partnerName,
        contactPerson: updated.company,
        phone: updated.mobile,
        email: updated.email,
        commissionPercentage: updated.commissionPercentage,
        commission: `0% commission on bookings`,
        referredLeads: 0,
        totalSales: '₹0',
        payoutsDue: '₹0',
        status: updated.status || 'Active',
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Commission payout released successfully!',
      partner: updatedPartner
    });

  } catch (error) {
    console.error('PUT release partner payout error:', error);
    return NextResponse.json({ error: 'Internal server error while releasing commission payout.' }, { status: 500 });
  }
}
