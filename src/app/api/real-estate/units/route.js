import connectToDatabase from '@/lib/db';
import Unit from '@/lib/models/Unit';
import { supabase } from '@/lib/supabaseClient';
import { mapUnitToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/units - Retrieve dynamic tenant-isolated list of inventory units
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let units = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_units')
        .select('*, real_estate_projects(project_name)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch units error:', error);
        throw error;
      }

      units = (data || []).map(mapUnitToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoUnits = await Unit.find(filter)
        .populate('projectId', 'projectName')
        .sort({ createdAt: -1 });

      units = mongoUnits.map(u => ({
        id: u._id,
        _id: u._id,
        projectId: u.projectId ? u.projectId._id : null,
        unitNumber: u.unitNumber,
        tower: u.tower,
        floor: u.floor,
        propertyType: u.propertyType,
        area: u.area,
        price: u.price,
        facing: u.facing,
        status: u.status,
        description: u.description,
        projectName: u.projectId ? u.projectId.projectName : null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));
    }

    return NextResponse.json({ success: true, units });
  } catch (error) {
    console.error('GET units error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching units directory.' }, { status: 500 });
  }
}

// POST /api/real-estate/units - Register a new inventory unit
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
    const { projectId, unitNumber, tower, floor, propertyType, area, price, facing, status, description } = body;

    if (!unitNumber) {
      return NextResponse.json({ error: 'Missing required parameters: unitNumber is required.' }, { status: 400 });
    }

    const unitStatusValue = status || 'Available';
    const allowedStatuses = ['Available', 'Blocked', 'Booked', 'Sold'];
    if (!allowedStatuses.includes(unitStatusValue)) {
      return NextResponse.json({ error: `Invalid unit status. Must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    const unitTypeValue = propertyType || 'Apartment';
    const allowedTypes = ['Apartment', 'Villa', 'Plot', 'Commercial', 'Office', 'Shop', 'Warehouse'];
    if (!allowedTypes.includes(unitTypeValue)) {
      return NextResponse.json({ error: `Invalid property type. Must be one of: ${allowedTypes.join(', ')}` }, { status: 400 });
    }

    let newUnit = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_units')
        .insert({
          org_id: decodedUser.orgId,
          project_id: projectId || null,
          unit_number: unitNumber.trim(),
          tower: tower ? tower.trim() : '',
          floor: floor ? floor.trim() : '',
          property_type: unitTypeValue,
          area: area ? Number(area) : 0,
          price: price ? Number(price) : 0,
          facing: facing ? facing.trim() : '',
          status: unitStatusValue,
          description: description ? description.trim() : ''
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create unit error:', error);
        throw error;
      }

      // Fetch joined data to return cleanly mapped with project name
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_units')
        .select('*, real_estate_projects(project_name)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        newUnit = mapUnitToFrontend(joinedData);
      } else {
        newUnit = mapUnitToFrontend(data);
      }
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const createdUnit = await Unit.create({
        orgId: decodedUser.orgId,
        projectId: projectId || null,
        unitNumber: unitNumber.trim(),
        tower: tower ? tower.trim() : '',
        floor: floor ? floor.trim() : '',
        propertyType: unitTypeValue,
        area: area ? Number(area) : 0,
        price: price ? Number(price) : 0,
        facing: facing ? facing.trim() : '',
        status: unitStatusValue,
        description: description ? description.trim() : ''
      });

      // Populate project name if exists
      let pName = null;
      if (projectId) {
        const ProjectFallback = mongoose.models.Project || mongoose.model('Project');
        const pObj = await ProjectFallback.findById(projectId);
        pName = pObj ? pObj.projectName : null;
      }

      newUnit = {
        id: createdUnit._id,
        _id: createdUnit._id,
        projectId: createdUnit.projectId,
        unitNumber: createdUnit.unitNumber,
        tower: createdUnit.tower,
        floor: createdUnit.floor,
        propertyType: createdUnit.propertyType,
        area: createdUnit.area,
        price: createdUnit.price,
        facing: createdUnit.facing,
        status: createdUnit.status,
        description: createdUnit.description,
        projectName: pName,
        createdAt: createdUnit.createdAt,
        updatedAt: createdUnit.updatedAt
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Inventory unit registered successfully!',
      unit: newUnit
    });

  } catch (error) {
    console.error('POST create unit error:', error);
    return NextResponse.json({ error: 'Internal server error while registering inventory unit.' }, { status: 500 });
  }
}
