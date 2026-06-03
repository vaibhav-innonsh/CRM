import connectToDatabase from '@/lib/db';
import Team from '@/lib/models/Team';
import { supabase } from '@/lib/supabaseClient';
import { mapTeamToFrontend } from '@/lib/dbMapper';
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

    const { name, description, leader, members, region, targetAmount } = await req.json();

    if (supabase) {
      let query = supabase.from('teams').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: targetTeam, error: fetchError } = await query.maybeSingle();

      if (fetchError || !targetTeam) {
        return NextResponse.json({ error: 'Sales team not found.' }, { status: 404 });
      }

      // STRICT SECURITY GATE: Sales Manager can strictly only modify their own assigned team
      if (decodedUser.role === 'sales_admin' && targetTeam.leader !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You are restricted from editing another Sales Manager\'s team.' },
          { status: 403 }
        );
      }

      const updateData = {};

      // Check name uniqueness if team name is changed
      if (name && name.trim() !== targetTeam.name) {
        let uniquenessQuery = supabase.from('teams').select('id').eq('name', name.trim()).neq('id', id);
        if (decodedUser.orgId) {
          uniquenessQuery = uniquenessQuery.eq('org_id', decodedUser.orgId);
        }
        const { data: nameConflict } = await uniquenessQuery.maybeSingle();

        if (nameConflict) {
          return NextResponse.json({ error: `A team named "${name.trim()}" already exists in the system.` }, { status: 400 });
        }
        updateData.name = name.trim();
      }

      if (description !== undefined) updateData.description = description.trim();
      if (region !== undefined) updateData.region = region.trim();
      if (targetAmount !== undefined) updateData.target_amount = Number(targetAmount) || 0;
      if (members !== undefined) updateData.members = members;

      // Only Owner can transfer team leadership to another manager
      if (leader && decodedUser.role === 'owner') {
        updateData.leader = leader;
      }

      let updateQuery = supabase.from('teams').update(updateData).eq('id', id);
      if (decodedUser.orgId) {
        updateQuery = updateQuery.eq('org_id', decodedUser.orgId);
      }
      const { data: updatedTeam, error: updateError } = await updateQuery
        .select('*, leader_details:users!leader(id, name, email)')
        .single();

      if (updateError) {
        console.error('Supabase team update error:', updateError);
        throw updateError;
      }

      // Fetch member details
      const memberIds = Array.isArray(updatedTeam.members) ? updatedTeam.members : [];
      const { data: memberUsers } = memberIds.length > 0
        ? await supabase.from('users').select('id, name, email').in('id', memberIds)
        : { data: [] };

      const teamMapped = mapTeamToFrontend({
        ...updatedTeam,
        members_details: memberUsers || []
      });

      return NextResponse.json({
        success: true,
        message: `Sales team "${updatedTeam.name}" successfully updated!`,
        team: teamMapped
      });

    } else {
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
    }
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

    if (supabase) {
      let query = supabase.from('teams').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: targetTeam, error: fetchError } = await query.maybeSingle();

      if (fetchError || !targetTeam) {
        return NextResponse.json({ error: 'Sales team not found.' }, { status: 404 });
      }

      // STRICT SECURITY GATE: Sales Manager can strictly only disband their own team
      if (decodedUser.role === 'sales_admin' && targetTeam.leader !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You are restricted from deleting another Sales Manager\'s team.' },
          { status: 403 }
        );
      }

      let deleteQuery = supabase.from('teams').delete().eq('id', id);
      if (decodedUser.orgId) {
        deleteQuery = deleteQuery.eq('org_id', decodedUser.orgId);
      }
      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Supabase team delete error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: `Sales team "${targetTeam.name}" successfully disbanded/deleted.`
      });

    } else {
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
    }
  } catch (error) {
    console.error('Delete team API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
