import connectToDatabase from '@/lib/db';
import Property from '@/lib/models/Property';
import { supabase } from '@/lib/supabaseClient';
import { mapPropertyToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/properties - Fetch dynamic tenant-isolated property catalog
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access properties.' },
        { status: 401 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';

    let properties = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_properties')
        .select('*');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Dropdown Filters
      if (type && type !== 'All') {
        queryBuilder = queryBuilder.eq('type', type);
      }
      if (status && status !== 'All') {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // Search (location or title)
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(`title.ilike.${s},location.ilike.${s}`);
      }

      // Sort by newest by default
      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch properties error:', error);
        throw error;
      }

      properties = (data || []).map(mapPropertyToFrontend);
    } else {
      // Fallback Mongoose query
      await connectToDatabase();
      let filter = {};

      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }
      if (type && type !== 'All') {
        filter.type = type;
      }
      if (status && status !== 'All') {
        filter.status = status;
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } }
        ];
      }

      const mongoProps = await Property.find(filter).sort({ createdAt: -1 });
      properties = mongoProps.map(p => ({
        _id: p._id,
        id: p._id,
        title: p.title,
        type: p.type,
        location: p.location,
        price: p.price,
        size: p.size,
        beds: p.beds,
        baths: p.baths,
        status: p.status,
        image: p.image,
        amenities: p.amenities,
        customData: p.customData,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    }

    return NextResponse.json({ success: true, properties });
  } catch (error) {
    console.error('GET properties error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching properties.' },
      { status: 500 }
    );
  }
}

// POST /api/real-estate/properties - Add a new property under dynamic tenant isolation
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage properties.' },
        { status: 401 }
      );
    }

    // Role-based check: managers and owners can manage properties
    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: '🔒 Only Owners and Sales Managers can add properties.' },
        { status: 403 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, type, location, price, size, beds, baths, image, amenities, customData } = body;

    // Validation
    if (!title || !type || !location || price === undefined || size === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (title, type, location, price, size are required).' },
        { status: 400 }
      );
    }

    let newProperty = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_properties')
        .insert({
          org_id: decodedUser.orgId,
          title,
          type,
          location,
          price: Number(price) || 0,
          size: Number(size) || 0,
          beds: Number(beds) || 0,
          baths: Number(baths) || 0,
          status: 'Available',
          image: image || '',
          amenities: amenities || [],
          custom_data: customData || {}
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase insert property error:', error);
        throw error;
      }

      newProperty = mapPropertyToFrontend(data);
    } else {
      // Fallback Mongoose create
      await connectToDatabase();
      const createdProp = await Property.create({
        orgId: decodedUser.orgId,
        title,
        type,
        location,
        price: Number(price) || 0,
        size: Number(size) || 0,
        beds: Number(beds) || 0,
        baths: Number(baths) || 0,
        status: 'Available',
        image: image || '',
        amenities: amenities || [],
        customData: customData || {}
      });

      newProperty = {
        _id: createdProp._id,
        id: createdProp._id,
        title: createdProp.title,
        type: createdProp.type,
        location: createdProp.location,
        price: createdProp.price,
        size: createdProp.size,
        beds: createdProp.beds,
        baths: createdProp.baths,
        status: createdProp.status,
        image: createdProp.image,
        amenities: createdProp.amenities,
        customData: createdProp.customData,
        createdAt: createdProp.createdAt,
        updatedAt: createdProp.updatedAt,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Property added successfully!',
      property: newProperty
    });
  } catch (error) {
    console.error('POST property error:', error);
    return NextResponse.json(
      { error: 'Internal server error while adding property.' },
      { status: 500 }
    );
  }
}
