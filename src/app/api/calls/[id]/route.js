import connectToDatabase from '@/lib/db';
import Call from '@/lib/models/Call';
import { supabase } from '@/lib/supabaseClient';
import { mapCallToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/calls/[id] - Update call details
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      // Fetch call first to check ownership
      const { data: call, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !call) {
        return NextResponse.json({ error: 'Call log not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only edit their own call logs
      if (decodedUser.role === 'sales_rep' && call.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this call log.' }, { status: 403 });
      }

      const body = await req.json();
      const { subject, notes } = body;

      const updates = {};
      if (subject !== undefined) updates.subject = subject.trim();
      if (notes !== undefined) updates.notes = notes.trim();
      updates.updated_at = new Date().toISOString();

      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update(updates)
        .eq('id', id)
        .select('*, users(id, name, email, role), leads(id, first_name, last_name, company, status), contacts(id, first_name, last_name, company, status)')
        .single();

      if (updateError) {
        console.error('Supabase update call error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Call log details updated successfully.',
        call: mapCallToFrontend(updatedCall)
      });

    } else {
      await connectToDatabase();

      const call = await Call.findById(id);

      if (!call) {
        return NextResponse.json({ error: 'Call log not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only edit their own call logs
      if (decodedUser.role === 'sales_rep' && call.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden. You do not own this call log.' }, { status: 403 });
      }

      const body = await req.json();
      const { subject, notes } = body;

      if (subject !== undefined) call.subject = subject.trim();
      if (notes !== undefined) call.notes = notes.trim();

      await call.save();

      return NextResponse.json({
        success: true,
        message: 'Call log details updated successfully.',
        call
      });
    }
  } catch (error) {
    console.error('Update call log error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/calls/[id] - Purge call log
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      // Fetch call first to check ownership
      const { data: call, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !call) {
        return NextResponse.json({ error: 'Call log not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only delete their own call logs
      if (decodedUser.role === 'sales_rep' && call.assigned_to !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('calls')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete call error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Call log deleted successfully.'
      });

    } else {
      await connectToDatabase();

      const call = await Call.findById(id);

      if (!call) {
        return NextResponse.json({ error: 'Call log not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Reps can only delete their own call logs
      if (decodedUser.role === 'sales_rep' && call.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      await Call.findByIdAndDelete(id);

      return NextResponse.json({
        success: true,
        message: 'Call log deleted successfully.'
      });
    }
  } catch (error) {
    console.error('Delete call log error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

