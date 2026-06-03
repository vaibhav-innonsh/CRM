import connectToDatabase from '@/lib/db';
import SiteVisit from '@/lib/models/SiteVisit';
import { supabase } from '@/lib/supabaseClient';
import { mapSiteVisitToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/real-estate/visits/[id] - Update site visit status & post-visit feedback
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
      return NextResponse.json({ error: 'Missing site visit ID in request parameters.' }, { status: 400 });
    }

    const body = await req.json();
    const { status, feedback } = body;

    if (!status) {
      return NextResponse.json({ error: 'Missing required parameter status.' }, { status: 400 });
    }

    let updatedVisit = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_site_visits')
        .update({
          status,
          feedback: feedback || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price), users(id, name, email)')
        .single();

      if (error) {
        console.error('Supabase update site visit error:', error);
        throw error;
      }

      updatedVisit = mapSiteVisitToFrontend(data);

      // If status is marked Completed, find linked auto-task in CRM and close it!
      try {
        await supabase
          .from('tasks')
          .update({ status: 'Completed', updated_at: new Date().toISOString() })
          .eq('lead_id', data.lead_id)
          .ilike('subject', `%Site Visit%`);
      } catch (taskErr) {
        console.error('Failed to auto-close task for completed visit:', taskErr);
      }

    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const mongoVisit = await SiteVisit.findById(id);
      if (!mongoVisit) {
        return NextResponse.json({ error: 'Site visit not found.' }, { status: 404 });
      }

      mongoVisit.status = status;
      mongoVisit.feedback = feedback || '';
      const saveResult = await mongoVisit.save();
      
      updatedVisit = {
        id: saveResult._id,
        _id: saveResult._id,
        status: saveResult.status,
        feedback: saveResult.feedback
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Site visit details updated successfully!',
      visit: updatedVisit
    });

  } catch (error) {
    console.error('PUT site visit error:', error);
    return NextResponse.json({ error: 'Internal server error while updating site visit.' }, { status: 500 });
  }
}
