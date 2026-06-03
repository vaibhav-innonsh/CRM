import connectToDatabase from '@/lib/db';
import Team from '@/lib/models/Team';
import { supabase } from '@/lib/supabaseClient';
import { mapTeamToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/teams - List Sales Teams with hierarchical security controls
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);
    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'teams')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization. Please upgrade your subscription.' },
        { status: 403 }
      );
    }

    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives do not have access to Team configurations.' },
        { status: 403 }
      );
    }

    if (supabase) {
      let queryBuilder = supabase
        .from('teams')
        .select('*, leader_details:users!leader(id, name, email)');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // HIERARCHICAL GATES: 
      // - Sales Manager strictly only views the teams they lead.
      // - Owner views the global organization teams pool.
      if (decodedUser.role === 'sales_admin') {
        queryBuilder = queryBuilder.eq('leader', decodedUser.id);
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch teams error:', error);
        throw error;
      }

      // Fetch member user details in bulk to resolve members_details
      const allMemberIds = [...new Set((data || []).flatMap(t => Array.isArray(t.members) ? t.members : []))];
      const { data: memberUsers, error: usersError } = allMemberIds.length > 0
        ? await supabase.from('users').select('id, name, email').in('id', allMemberIds)
        : { data: [], error: null };

      if (usersError) {
        console.error('Supabase fetch member users error:', usersError);
      }

      const userMap = new Map((memberUsers || []).map(u => [u.id, u]));

      const teams = (data || []).map(team => {
        const members_details = (team.members || [])
          .map(id => userMap.get(id))
          .filter(Boolean);
        return mapTeamToFrontend({
          ...team,
          members_details
        });
      });

      return NextResponse.json({ success: true, teams });
    } else {
      await connectToDatabase();

      // HIERARCHICAL GATES: 
      const query = decodedUser.role === 'sales_admin' 
        ? { leader: decodedUser.id } 
        : {};

      const teams = await Team.find(query)
        .populate('leader', '_id name email role')
        .populate('members', '_id name email role')
        .sort({ createdAt: -1 });

      return NextResponse.json({ success: true, teams });
    }
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

    if (!checkModuleAccess(decodedUser, 'teams')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization. Please upgrade your subscription.' },
        { status: 403 }
      );
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

    // SECURITY GATE: Sales Manager can strictly only assign themselves as Team Leader
    let finalLeader = leader;
    if (decodedUser.role === 'sales_admin') {
      finalLeader = decodedUser.id;
    } else if (!leader) {
      return NextResponse.json({ error: 'Assigned Team Leader is required.' }, { status: 400 });
    }

    if (supabase) {
      // Check if team name already exists
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('name', name.trim())
        .maybeSingle();

      if (existingTeam) {
        return NextResponse.json({ error: `A team named "${name.trim()}" already exists in the system.` }, { status: 400 });
      }

      const teamData = {
        name: name.trim(),
        description: description ? description.trim() : '',
        leader: finalLeader,
        members: members || [],
        region: region ? region.trim() : 'General',
        target_amount: targetAmount || 0,
        org_id: decodedUser.orgId
      };

      const { data: newTeam, error: insertError } = await supabase
        .from('teams')
        .insert([teamData])
        .select('*, leader_details:users!leader(id, name, email)')
        .single();

      if (insertError) {
        console.error('Supabase team insert error:', insertError);
        throw insertError;
      }

      // Fetch member details
      const memberIds = Array.isArray(newTeam.members) ? newTeam.members : [];
      const { data: memberUsers } = memberIds.length > 0
        ? await supabase.from('users').select('id, name, email').in('id', memberIds)
        : { data: [] };

      const teamMapped = mapTeamToFrontend({
        ...newTeam,
        members_details: memberUsers || []
      });

      return NextResponse.json({
        success: true,
        message: `Sales team "${newTeam.name}" successfully created!`,
        team: teamMapped
      });

    } else {
      await connectToDatabase();

      // Check if team name already exists
      const existingTeam = await Team.findOne({ name: name.trim() });
      if (existingTeam) {
        return NextResponse.json({ error: `A team named "${name.trim()}" already exists in the system.` }, { status: 400 });
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
    }
  } catch (error) {
    console.error('Create team API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
