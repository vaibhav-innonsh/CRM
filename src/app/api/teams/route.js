import connectToDatabase from '@/lib/db';
import Team from '@/lib/models/Team';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/teams - List Sales Teams with hierarchical security controls
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives do not have access to Team configurations.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    // HIERARCHICAL GATES: 
    // - Sales Manager strictly only views the teams they lead.
    // - Owner views the global organization teams pool.
    const query = decodedUser.role === 'sales_admin' 
      ? { leader: decodedUser.id } 
      : {};

    const teams = await Team.find(query)
      .populate('leader', '_id name email role')
      .populate('members', '_id name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Fetch teams API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// POST /api/teams - Create a new Sales Team
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives cannot configure teams.' },
        { status: 403 }
      );
    }

    const { name, description, leader, members, region, targetAmount } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return NextResponse.json({ error: `A team named "${name.trim()}" already exists in the system.` }, { status: 400 });
    }

    // SECURITY GATE: Sales Manager can strictly only assign themselves as Team Leader
    let finalLeader = leader;
    if (decodedUser.role === 'sales_admin') {
      finalLeader = decodedUser.id;
    } else if (!leader) {
      return NextResponse.json({ error: 'Assigned Team Leader is required.' }, { status: 400 });
    }

    const newTeam = await Team.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      leader: finalLeader,
      members: members || [],
      region: region ? region.trim() : 'General',
      targetAmount: targetAmount || 0
    });

    const populatedTeam = await Team.findById(newTeam._id)
      .populate('leader', '_id name email role')
      .populate('members', '_id name email role');

    return NextResponse.json({
      success: true,
      message: `Sales team "${newTeam.name}" successfully created!`,
      team: populatedTeam
    });
  } catch (error) {
    console.error('Create team API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
