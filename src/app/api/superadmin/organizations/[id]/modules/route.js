import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser || !decodedUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Access restricted to Super Admins only.' }, { status: 403 });
    }

    const { id } = await params;
    const { enabledModules } = await req.json();

    if (!id || !Array.isArray(enabledModules)) {
      return NextResponse.json({ error: 'Organization ID and enabledModules array are required.' }, { status: 400 });
    }

    if (supabase) {
      const { data: updatedOrg, error: orgError } = await supabase
        .from('organizations')
        .update({
          enabled_modules: enabledModules,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (orgError) {
        console.error('Supabase update organization modules error:', orgError);
        throw orgError;
      }

      return NextResponse.json({
        success: true,
        message: `Organization modules updated successfully.`,
        organization: updatedOrg
      });
    }

    return NextResponse.json({ success: true, message: 'Supabase not configured.' });
  } catch (error) {
    console.error('Superadmin POST modules error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
