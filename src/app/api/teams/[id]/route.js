import connectToDatabase from '@/lib/db';
import Team from '@/lib/models/Team';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/teams/[id] - Update sales team details
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives cannot configure teams.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const targetTeam = await Team.findById(id);
    if (!targetTeam) {
      return NextResponse.json({ error: 'Sales team not found.' }, { status: 404 });
    }

    // STRICT SECURITY GATE: Sales Manager can strictly only modify their own assigned team
    if (decodedUser.role === 'sales_admin' && targetTeam.leader.toString() !== decodedUser.id) {
      return NextResponse.json(
        { error: 'Forbidden. You are restricted from editing another Sales Manager\'s team.' },
        { status: 403 }
      );
    }

    const { name, description, leader, members, region, targetAmount } = await req.json();

    // Check name uniqueness if team name is changed
    if (name && name.trim() !== targetTeam.name) {
      const nameConflict = await Team.findOne({ name: name.trim() });
      if (nameConflict) {
        return NextResponse.json({ error: `A team named "${name.trim()}" already exists in the system.` }, { status: 400 });
      }
      targetTeam.name = name.trim();
    }

    if (description !== undefined) targetTeam.description = description.trim();
    if (region !== undefined) targetTeam.region = region.trim();
    if (targetAmount !== undefined) targetTeam.targetAmount = Number(targetAmount) || 0;
    if (members !== undefined) targetTeam.members = members;

    // Only Owner can transfer team leadership to another manager
    if (leader && decodedUser.role === 'owner') {
      targetTeam.leader = leader;
    }

    await targetTeam.save();

    const populatedTeam = await Team.findById(targetTeam._id)
      .populate('leader', '_id name email role')
      .populate('members', '_id name email role');

    return NextResponse.json({
      success: true,
      message: `Sales team "${targetTeam.name}" successfully updated!`,
      team: populatedTeam
    });
  } catch (error) {
    console.error('Update team API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/teams/[id] - Permanently disband/delete a Sales Team
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives cannot delete teams.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const targetTeam = await Team.findById(id);
    if (!targetTeam) {
      return NextResponse.json({ error: 'Sales team not found.' }, { status: 404 });
    }

    // STRICT SECURITY GATE: Sales Manager can strictly only disband their own team
    if (decodedUser.role === 'sales_admin' && targetTeam.leader.toString() !== decodedUser.id) {
      return NextResponse.json(
        { error: 'Forbidden. You are restricted from deleting another Sales Manager\'s team.' },
        { status: 403 }
      );
    }

    await Team.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Sales team "${targetTeam.name}" successfully disbanded/deleted.`
    });
  } catch (error) {
    console.error('Delete team API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
