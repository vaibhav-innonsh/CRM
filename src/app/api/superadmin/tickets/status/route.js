import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser || !decodedUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { ticketId, status } = await req.json();
    if (!ticketId || !status) {
      return NextResponse.json({ error: 'Ticket ID and status are required' }, { status: 400 });
    }

    if (supabase) {
      const { data, error } = await supabase
        .from('saas_support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId)
        .select('*')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, ticket: data });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Superadmin tickets status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
