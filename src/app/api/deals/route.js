import connectToDatabase from '@/lib/db';
import Deal from '@/lib/models/Deal';
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

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage') || '';

    // 1. Build dynamic MongoDB query filters
    const query = {};

    // 2. STICT ROLE-BASED ACCESS CONTROL (Deals Isolation)
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
  } catch (error) {
    console.error('Fetch deals error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching deals.' },
      { status: 500 }
    );
  }
}
