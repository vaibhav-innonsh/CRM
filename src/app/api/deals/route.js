import connectToDatabase from '@/lib/db';
import Deal from '@/lib/models/Deal';
import { supabase } from '@/lib/supabaseClient';
import { mapDealToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/deals - Fetch deals list with role-based access control
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage') || '';

    if (supabase) {
      let queryBuilder = supabase
        .from('deals')
        .select('*, users(id, name, email)');

      // STRICT ROLE-BASED ACCESS CONTROL (Deals Isolation)
      if (decodedUser.role === 'sales_rep') {
        // Sales Representative can ONLY see deals assigned directly to them
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      }

      if (stage) {
        queryBuilder = queryBuilder.eq('stage', stage);
      }

      const { data, error } = await queryBuilder.order('updated_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch deals error:', error);
        throw error;
      }

      const deals = (data || []).map(mapDealToFrontend);

      return NextResponse.json({
        success: true,
        count: deals.length,
        deals,
      });

    } else {
      await connectToDatabase();

      // 1. Build dynamic MongoDB query filters
      const query = {};

      // 2. STRICT ROLE-BASED ACCESS CONTROL (Deals Isolation)
      if (decodedUser.role === 'sales_rep') {
        // Sales Representative can ONLY see deals assigned directly to them
        query.assignedTo = decodedUser.id;
      }

      if (stage) {
        query.stage = stage;
      }

      // Fetch deals and populate assignee details
      const deals = await Deal.find(query)
        .populate('assignedTo', 'name email')
        .sort({ updatedAt: -1 });

      return NextResponse.json({
        success: true,
        count: deals.length,
        deals,
      });
    }
  } catch (error) {
    console.error('Fetch deals error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching deals.' },
      { status: 500 }
    );
  }
}

