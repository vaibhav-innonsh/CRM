import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/real-estate/leads/[id]/notes - Add a note to the real estate lead's timeline
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

    if (supabase) {
      const { data: lead, error: fetchError } = await supabase
        .from('real_estate_leads')
        .select('id, assigned_to')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // Security check
      if (
        decodedUser.role === 'sales_rep' && 
        lead.assigned_to && 
        lead.assigned_to !== decodedUser.id
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to log activities for this lead.' },
          { status: 403 }
        );
      }

      // Insert note to real_estate_lead_notes
      const { data: newNote, error: insertError } = await supabase
        .from('real_estate_lead_notes')
        .insert([{
          lead_id: id,
          text: text.trim(),
          created_by: decodedUser.id,
          created_by_name: decodedUser.name,
          org_id: decodedUser.orgId
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert RE lead note error:', insertError);
        throw insertError;
      }

      const savedNote = {
        _id: newNote.id,
        id: newNote.id,
        text: newNote.text,
        createdBy: newNote.created_by,
        createdByName: newNote.created_by_name,
        createdAt: newNote.created_at,
        updatedAt: newNote.updated_at
      };

      return NextResponse.json({
        success: true,
        message: 'Follow-up note logged successfully',
        note: savedNote,
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Add RE note error:', error);
    return NextResponse.json(
      { error: 'Internal server error while adding follow-up note.' },
      { status: 500 }
    );
  }
}
