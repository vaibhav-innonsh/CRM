import connectToDatabase from '@/lib/db';
import Meeting from '@/lib/models/Meeting';
import { supabase } from '@/lib/supabaseClient';
import { mapMeetingToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/meetings/[id] - Reschedule or update meeting status
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      // Fetch meeting first to check ownership
      const { data: meeting, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !meeting) {
        return NextResponse.json({ error: 'Meeting details not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only update their own meetings
      if (decodedUser.role === 'sales_rep' && meeting.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this meeting.' }, { status: 403 });
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
        assignedTo
      } = body;

      // Apply updates
      if (title !== undefined && !title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 });
      }

      const updates = {};
      if (title !== undefined) updates.title = title.trim();
      if (startTime !== undefined) updates.start_time = new Date(startTime).toISOString();
      if (endTime !== undefined) updates.end_time = new Date(endTime).toISOString();
      if (locationType !== undefined) updates.location_type = locationType;
      if (locationDetail !== undefined) updates.location_detail = locationDetail.trim();
      if (agenda !== undefined) updates.agenda = agenda.trim();
      if (status !== undefined) updates.status = status;

      // Reassignment
      if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
        updates.assigned_to = assignedTo || decodedUser.id;
      }
      updates.updated_at = new Date().toISOString();

      const { data: updatedMeeting, error: updateError } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', id)
        .select('*, users(id, name, email, role), leads(id, first_name, last_name, company, status), contacts(id, first_name, last_name, company, status)')
        .single();

      if (updateError) {
        console.error('Supabase update meeting error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Meeting details updated successfully.',
        meeting: mapMeetingToFrontend(updatedMeeting)
      });

    } else {
      await connectToDatabase();

      const meeting = await Meeting.findById(id);

      if (!meeting) {
        return NextResponse.json({ error: 'Meeting details not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only update their own meetings
      if (decodedUser.role === 'sales_rep' && meeting.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this meeting.' }, { status: 403 });
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
        assignedTo
      } = body;

      // Apply updates
      if (title !== undefined && !title.trim()) {
        return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 });
      }

      if (title !== undefined) meeting.title = title.trim();
      if (startTime !== undefined) meeting.startTime = new Date(startTime);
      if (endTime !== undefined) meeting.endTime = new Date(endTime);
      if (locationType !== undefined) meeting.locationType = locationType;
      if (locationDetail !== undefined) meeting.locationDetail = locationDetail.trim();
      if (agenda !== undefined) meeting.agenda = agenda.trim();
      if (status !== undefined) meeting.status = status;

      // Reassignment
      if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
        meeting.assignedTo = assignedTo || decodedUser.id;
      }

      await meeting.save();

      return NextResponse.json({
        success: true,
        message: 'Meeting details updated successfully.',
        meeting
      });
    }
  } catch (error) {
    console.error('Update meeting error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/meetings/[id] - Remove scheduled meeting
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      // Fetch meeting first to check ownership
      const { data: meeting, error: fetchError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !meeting) {
        return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only delete their own meetings
      if (decodedUser.role === 'sales_rep' && meeting.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete meeting error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Meeting deleted successfully.'
      });

    } else {
      await connectToDatabase();

      const meeting = await Meeting.findById(id);

      if (!meeting) {
        return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only delete their own meetings
      if (decodedUser.role === 'sales_rep' && meeting.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      await Meeting.findByIdAndDelete(id);

      return NextResponse.json({
        success: true,
        message: 'Meeting deleted successfully.'
      });
    }
  } catch (error) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

