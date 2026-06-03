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
      // 1. Fetch Organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      if (orgsError) throw orgsError;

      // 2. Fetch Users (Owners)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, org_id')
        .eq('role', 'owner');
      if (usersError) throw usersError;

      const mappedOrgs = orgs.map(org => {
        const owner = users.find(u => u.org_id === org.id);
        return {
          ...org,
          ownerName: owner ? owner.name : 'Unknown Owner',
          ownerEmail: owner ? owner.email : 'Unknown Email',
        };
      });

      // 3. Fetch SaaS Billing Plans
      const { data: billingPlans, error: billingPlansError } = await supabase
        .from('saas_billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
      if (billingPlansError) {
        console.error('SaaS billing plans fetch error:', billingPlansError);
      }

      // 4. Fetch SaaS Sectors Config
      const { data: sectorsConfig, error: sectorsError } = await supabase
        .from('saas_sectors_config')
        .select('*')
        .order('name', { ascending: true });
      if (sectorsError) {
        console.error('SaaS sectors config fetch error:', sectorsError);
      }

      // 5. Fetch SaaS Support Tickets
      const { data: supportTickets, error: ticketsError } = await supabase
        .from('saas_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (ticketsError) {
        console.error('SaaS support tickets fetch error:', ticketsError);
      }

      // 6. Fetch SaaS Subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('saas_subscriptions')
        .select('*');
      if (subsError) {
        console.error('SaaS subscriptions fetch error:', subsError);
      }

      return NextResponse.json({
        success: true,
        organizations: mappedOrgs,
        billingPlans: billingPlans || [],
        sectorsConfig: sectorsConfig || [],
        supportTickets: supportTickets || [],
        subscriptions: subscriptions || []
      });
    }

    return NextResponse.json({
      success: true,
      organizations: [],
      billingPlans: [],
      sectorsConfig: [],
      supportTickets: [],
      subscriptions: []
    });
  } catch (error) {
    console.error('Superadmin dashboard data GET error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
