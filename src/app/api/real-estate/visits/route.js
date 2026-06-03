import connectToDatabase from '@/lib/db';
import SiteVisit from '@/lib/models/SiteVisit';
import Lead from '@/lib/models/Lead';
import Property from '@/lib/models/Property';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapSiteVisitToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/visits - Fetch dynamic tenant-isolated site visits listing
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let visits = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_site_visits')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price), users(id, name, email)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Order by closest dates first
      queryBuilder = queryBuilder.order('visit_date', { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch site visits error:', error);
        throw error;
      }

      visits = (data || []).map(mapSiteVisitToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoVisits = await SiteVisit.find(filter)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title location price')
        .populate('assignedTo', 'name email')
        .sort({ visitDate: 1 });

      visits = mongoVisits.map(v => ({
        id: v._id,
        _id: v._id,
        visitDate: v.visitDate,
        status: v.status,
        feedback: v.feedback,
        leadId: v.leadId ? {
          id: v.leadId._id,
          _id: v.leadId._id,
          firstName: v.leadId.firstName,
          lastName: v.leadId.lastName,
          phone: v.leadId.phone,
          company: v.leadId.company
        } : null,
        propertyId: v.propertyId ? {
          id: v.propertyId._id,
          _id: v.propertyId._id,
          title: v.propertyId.title,
          location: v.propertyId.location,
          price: v.propertyId.price
        } : null,
        assignedTo: v.assignedTo ? {
          id: v.assignedTo._id,
          _id: v.assignedTo._id,
          name: v.assignedTo.name,
          email: v.assignedTo.email
        } : null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }));
    }

    return NextResponse.json({ success: true, visits });
  } catch (error) {
    console.error('GET site visits error:', error);
    return NextResponse.json({ error: 'Internal server error while retrieving site visits.' }, { status: 500 });
  }
}

// POST /api/real-estate/visits - Schedule a new client property site visit
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
    const { leadId, propertyId, visitDate, assignedTo } = body;

    if (!leadId || !propertyId || !visitDate) {
      return NextResponse.json({ error: 'Missing required parameters (leadId, propertyId, and visitDate are required).' }, { status: 400 });
    }

    let newVisit = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_site_visits')
        .insert({
          org_id: decodedUser.orgId,
          lead_id: leadId,
          property_id: propertyId,
          visit_date: new Date(visitDate).toISOString(),
          assigned_to: assignedTo || null,
          status: 'Scheduled'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase insert site visit error:', error);
        throw error;
      }

      // Fetch join data to map correctly
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_site_visits')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price), users(id, name, email)')
        .eq('id', data.id)
        .single();
      
      if (!joinError && joinedData) {
        newVisit = mapSiteVisitToFrontend(joinedData);
      } else {
        newVisit = mapSiteVisitToFrontend(data);
      }

      // Dynamically auto-create a Task in CRM
      try {
        const leadName = joinedData?.leads ? `${joinedData.leads.first_name} ${joinedData.leads.last_name || ''}`.trim() : 'Client';
        const propertyTitle = joinedData?.real_estate_properties ? joinedData.real_estate_properties.title : 'Property';
        await supabase.from('tasks').insert({
          org_id: decodedUser.orgId,
          subject: `Site Visit: ${leadName} - ${propertyTitle}`,
          due_date: new Date(visitDate).toISOString(),
          priority: 'High',
          status: 'Pending',
          notes: `Site visit scheduled for lead ${leadName} to check property "${propertyTitle}". Make sure coordinates are sent!`,
          assigned_to: assignedTo || decodedUser.id,
          lead_id: leadId
        });
      } catch (taskErr) {
        console.error('Failed to create auto task for site visit:', taskErr);
      }
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const createdVisit = await SiteVisit.create({
        orgId: decodedUser.orgId,
        leadId,
        propertyId,
        visitDate: new Date(visitDate),
        assignedTo: assignedTo || null,
        status: 'Scheduled'
      });

      newVisit = {
        id: createdVisit._id,
        _id: createdVisit._id,
        visitDate: createdVisit.visitDate,
        status: createdVisit.status,
        feedback: createdVisit.feedback
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Site visit booked successfully!',
      visit: newVisit
    });
  } catch (error) {
    console.error('POST site visit error:', error);
    return NextResponse.json({ error: 'Internal server error while booking site visit.' }, { status: 500 });
  }
}
