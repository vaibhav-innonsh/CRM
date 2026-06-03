import { getUserFromRequest } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser || !decodedUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Access restricted to Super Admins only.' }, { status: 403 });
    }

    if (supabase) {
      // Fetch all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch all users who are owners of these organizations
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, org_id')
        .eq('role', 'owner');

      if (usersError) throw usersError;

      // Map owner info to organizations
      const result = orgs.map(org => {
        const owner = users.find(u => u.org_id === org.id);
        return {
          ...org,
          ownerName: owner ? owner.name : 'Unknown Owner',
          ownerEmail: owner ? owner.email : 'Unknown Email',
        };
      });

      return NextResponse.json({ success: true, organizations: result });
    }

    return NextResponse.json({ success: true, organizations: [] });
  } catch (error) {
    console.error('Superadmin GET organizations error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
