import connectToDatabase from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapMeetingToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/meetings - Fetch scheduled customer meetings list
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const locationType = searchParams.get('locationType') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

    if (supabase) {
      let queryBuilder = supabase
        .from('meetings')
        .select('*, users(id, name, email, role), leads(id, first_name, last_name, company, status), contacts(id, first_name, last_name, company, status)');

      // 1. ROLE BOUNDS
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedTo) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedTo);
      }

      // 2. Extra filters
      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }
      if (locationType) {
        queryBuilder = queryBuilder.eq('location_type', locationType);
      }

      // 3. Search query matches meeting title
      if (search) {
        queryBuilder = queryBuilder.ilike('title', `%${search}%`);
      }

      const { data, error } = await queryBuilder.order('start_time', { ascending: true });

      if (error) {
        console.error('Supabase fetch meetings error:', error);
        throw error;
      }

      const meetings = (data || []).map(mapMeetingToFrontend);

      return NextResponse.json({
        success: true,
        meetings
      });

    } else {
      await connectToDatabase();

      // Query parameters
      let query = {};

      // 1. ROLE BOUNDS
      if (decodedUser.role === 'sales_rep') {
        query.assignedTo = decodedUser.id;
      } else if (assignedTo) {
        query.assignedTo = assignedTo;
      }

      // 2. Extra filters
      if (status) query.status = status;
      if (locationType) query.locationType = locationType;

      // 3. Search query matches meeting title
      if (search) {
        query.title = new RegExp(search, 'i');
      }

      // Fetch lists populated
      const meetings = await Meeting.find(query)
        .populate('assignedTo', 'name email role')
        .populate('leadId', 'firstName lastName company status')
        .populate('contactId', 'firstName lastName company status')
        .sort({ startTime: 1 }); // Soonest meetings first

      return NextResponse.json({
        success: true,
        meetings
      });
    }
  } catch (error) {
    console.error('Fetch meetings list API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching scheduled meetings.' },
      { status: 500 }
    );
  }
}

// POST /api/meetings - Schedule a new client meeting / sales demo
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      startTime,
      endTime,
      locationType,
      locationDetail,
      agenda,
      status,
      assignedTo,
      leadId,
      contactId
    } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting title is required.' }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'Start and End timings are required.' }, { status: 400 });
    }

    // Assignee validation
    let targetAssignee = decodedUser.id;
    if (decodedUser.role !== 'sales_rep' && assignedTo) {
      targetAssignee = assignedTo;
    }

    if (supabase) {
      const meetingData = {
        title: title.trim(),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        location_type: locationType || 'Online',
        location_detail: locationDetail || '',
        agenda: agenda || '',
        status: status || 'Scheduled',
        assigned_to: targetAssignee,
        lead_id: leadId || null,
        contact_id: contactId || null
      };

      const { data: newMeeting, error: insertError } = await supabase
        .from('meetings')
        .insert([meetingData])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase meeting insert error:', insertError);
        throw insertError;
      }

      // Auto-log inside Lead timeline
      if (leadId) {
        try {
          const formattedDate = new Date(startTime).toLocaleString('en-IN');
          await supabase
            .from('lead_notes')
            .insert([
              {
                lead_id: leadId,
                text: `📅 Scheduled Meeting Demo: "${newMeeting.title}" | Time: ${formattedDate}`,
                created_by: decodedUser.id,
                created_by_name: decodedUser.name
              }
            ]);
        } catch (err) {
          console.error('Failed to log meeting trigger in lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Meeting scheduled successfully!',
        meeting: mapMeetingToFrontend(newMeeting)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      // Create the meeting schedule
      const newMeeting = await Meeting.create({
        title: title.trim(),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        locationType: locationType || 'Online',
        locationDetail: locationDetail || '',
        agenda: agenda || '',
        status: status || 'Scheduled',
        assignedTo: targetAssignee,
        leadId: leadId || null,
        contactId: contactId || null
      });

      // Auto-log inside Lead timeline
      if (leadId) {
        try {
          const lead = await Lead.findById(leadId);
          if (lead) {
            lead.notes.push({
              text: `📅 Scheduled Meeting Demo: "${newMeeting.title}" | Time: ${newMeeting.startTime.toLocaleString('en-IN')}`,
              createdBy: decodedUser.id,
              createdByName: decodedUser.name
            });
            await lead.save();
          }
        } catch (err) {
          console.error('Failed to log meeting trigger in lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Meeting scheduled successfully!',
        meeting: newMeeting
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Schedule meeting API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while scheduling meeting.', details: error.message },
      { status: 500 }
    );
  }
}

