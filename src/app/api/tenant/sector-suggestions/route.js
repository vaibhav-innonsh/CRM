import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { getSuggestionsForSector, getAllSectorNames } from '@/lib/sectorFieldSuggestions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tenant/sector-suggestions
 * Returns:
 *   - org's current sector
 *   - sector-specific field suggestions
 *   - all available sector names
 *   - already-added field keys (so UI can mark them)
 */
export async function GET(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module') || 'leads';

    // 1. Fetch org's current sector
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('sector')
      .eq('id', user.orgId)
      .maybeSingle();

    if (orgErr) throw orgErr;

    const sector = org?.sector || '';

    // 2. Get suggestions for this sector
    const suggestions = getSuggestionsForSector(sector);

    // 3. Fetch already-added field keys for this org+module
    const { data: existingFields } = await supabase
      .from('custom_field_definitions')
      .select('field_key')
      .eq('org_id', user.orgId)
      .eq('module', module);

    const addedKeys = (existingFields || []).map((f) => f.field_key);

    return NextResponse.json({
      success: true,
      sector,
      allSectors: getAllSectorNames(),
      suggestions,
      addedKeys,
    });
  } catch (err) {
    console.error('GET sector-suggestions error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * PUT /api/tenant/sector-suggestions
 * Updates the org's sector (owner only)
 * Body: { sector }
 */
export async function PUT(req) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can update organization sector.' }, { status: 403 });
    }

    const { sector } = await req.json();
    if (!sector) return NextResponse.json({ error: 'Sector is required.' }, { status: 400 });

    const { error } = await supabase
      .from('organizations')
      .update({ sector })
      .eq('id', user.orgId);

    if (error) throw error;

    const suggestions = getSuggestionsForSector(sector);

    return NextResponse.json({
      success: true,
      sector,
      suggestions,
    });
  } catch (err) {
    console.error('PUT sector-suggestions error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
