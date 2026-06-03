import connectToDatabase from '@/lib/db';
import Project from '@/lib/models/Project';
import { supabase } from '@/lib/supabaseClient';
import { mapProjectToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/projects - Retrieve dynamic tenant-isolated list of builder projects
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let projects = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_projects')
        .select('*');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch projects error:', error);
        throw error;
      }

      projects = (data || []).map(mapProjectToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoProjects = await Project.find(filter).sort({ createdAt: -1 });
      projects = mongoProjects.map(p => ({
        id: p._id,
        _id: p._id,
        projectName: p.projectName,
        builderName: p.builderName,
        location: p.location,
        launchDate: p.launchDate,
        possessionDate: p.possessionDate,
        status: p.status,
        totalUnits: p.totalUnits,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
    }

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('GET projects error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching projects list.' }, { status: 500 });
  }
}

// POST /api/real-estate/projects - Create a new builder project
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    const body = await req.json();
    const { projectName, builderName, location, launchDate, possessionDate, status, totalUnits, description } = body;

    if (!projectName || !builderName || !location) {
      return NextResponse.json({ error: 'Missing required parameters (projectName, builderName, and location are required).' }, { status: 400 });
    }

    const projectStatusValue = status || 'Under Construction';
    const allowedStatuses = ['Upcoming', 'Under Construction', 'Ready To Move', 'Completed'];
    if (!allowedStatuses.includes(projectStatusValue)) {
      return NextResponse.json({ error: `Invalid project status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    let newProject = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_projects')
        .insert({
          org_id: decodedUser.orgId,
          project_name: projectName.trim(),
          builder_name: builderName.trim(),
          location: location.trim(),
          launch_date: launchDate ? new Date(launchDate).toISOString().split('T')[0] : null,
          possession_date: possessionDate ? new Date(possessionDate).toISOString().split('T')[0] : null,
          status: projectStatusValue,
          total_units: Number(totalUnits) || 0,
          description: description || ''
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create project error:', error);
        throw error;
      }

      newProject = mapProjectToFrontend(data);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const createdProj = await Project.create({
        orgId: decodedUser.orgId,
        projectName: projectName.trim(),
        builderName: builderName.trim(),
        location: location.trim(),
        launchDate: launchDate ? new Date(launchDate) : null,
        possessionDate: possessionDate ? new Date(possessionDate) : null,
        status: projectStatusValue,
        totalUnits: Number(totalUnits) || 0,
        description: description || ''
      });

      newProject = {
        id: createdProj._id,
        _id: createdProj._id,
        projectName: createdProj.projectName,
        builderName: createdProj.builderName,
        location: createdProj.location,
        launchDate: createdProj.launchDate,
        possessionDate: createdProj.possessionDate,
        status: createdProj.status,
        totalUnits: createdProj.totalUnits,
        description: createdProj.description,
        createdAt: createdProj.createdAt,
        updatedAt: createdProj.updatedAt
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Builder project registered successfully!',
      project: newProject
    });

  } catch (error) {
    console.error('POST create project error:', error);
    return NextResponse.json({ error: 'Internal server error while registering builder project.' }, { status: 500 });
  }
}
