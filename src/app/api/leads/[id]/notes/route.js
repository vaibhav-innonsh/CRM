import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/leads/[id]/notes - Add a dynamic interaction note to the lead's timeline
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Note text cannot be empty.' }, { status: 400 });
    }

    await connectToDatabase();

    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can only add notes to their own leads
    if (
      decodedUser.role === 'sales_rep' && 
      (!lead.assignedTo || lead.assignedTo.toString() !== decodedUser.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to log activities for this lead.' },
        { status: 403 }
      );
    }

    // Push new note to lead's notes array
    const newNote = {
      text: text.trim(),
      createdBy: decodedUser.id,
      createdByName: decodedUser.name,
    };

    lead.notes.push(newNote);
    await lead.save();

    // Get the newly added note (will be the last element)
    const savedNote = lead.notes[lead.notes.length - 1];

    return NextResponse.json({
      success: true,
      message: 'Follow-up note logged successfully',
      note: savedNote,
    }, { status: 201 });
  } catch (error) {
    console.error('Add note error:', error);
    return NextResponse.json(
      { error: 'Internal server error while adding follow-up note.' },
      { status: 500 }
    );
  }
}
