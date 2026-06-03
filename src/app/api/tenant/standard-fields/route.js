import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tenant/standard-fields
 * Returns the hidden_standard_fields array for the organization of the calling user.
 */
export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { data: org, error } = await supabase
      .from('organizations')
      .select('hidden_standard_fields')
      .eq('id', user.orgId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      hiddenFields: org?.hidden_standard_fields || [],
    });
  } catch (err) {
    console.error('GET standard-fields error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/standard-fields
 * Updates the hidden_standard_fields array for the organization (restricted to owner role).
 * Body: { hiddenFields }
 */
export async function PUT(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can modify standard field visibility.' }, { status: 403 });
    }

    const { hiddenFields } = await req.json();
    if (!Array.isArray(hiddenFields)) {
      return NextResponse.json({ error: 'hiddenFields must be an array of strings.' }, { status: 400 });
    }

    // Sanitize values
    const cleanFields = hiddenFields.map(f => String(f).trim()).filter(Boolean);

    const { error } = await supabase
      .from('organizations')
      .update({ hidden_standard_fields: cleanFields })
      .eq('id', user.orgId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      hiddenFields: cleanFields,
    });
  } catch (err) {
    console.error('PUT standard-fields error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
