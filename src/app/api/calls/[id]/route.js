import connectToDatabase from '@/lib/db';
import Call from '@/lib/models/Call';
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
  } catch (error) {
    console.error('Delete call log error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
