import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import Property from '@/lib/models/Property';
import { supabase } from '@/lib/supabaseClient';
import { mapPropertyToFrontend, mapLeadToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper: Match scoring engine
function computeMatchScore(prop, reqs) {
  let score = 0;
  
  if (!reqs) {
    return 100; // If no requirements specified, treat as 100% generic matching base
  }

  // 1. Property Type check (+25%)
  if (prop.type && reqs.type && prop.type.toLowerCase() === reqs.type.toLowerCase()) {
    score += 25;
  }

  // 2. Preferred Location substring check (+25%)
  if (reqs.location) {
    const pLoc = (prop.location || '').toLowerCase();
    const rLoc = (reqs.location || '').toLowerCase().trim();
    if (rLoc && pLoc.includes(rLoc)) {
      score += 25;
    }
  } else {
    // If no location preference, award full base
    score += 25;
  }

  // 3. Beds (BHK) configuration check (+25%)
  if (reqs.beds !== undefined) {
    const propBeds = Number(prop.beds) || 0;
    const reqBeds = Number(reqs.beds) || 0;
    if (propBeds === reqBeds || reqBeds === 0) {
      score += 25;
    }
  } else {
    score += 25;
  }

  // 4. Budget Range Proximity Match (Up to +25%)
  if (reqs.budgetMax) {
    const price = Number(prop.price) || 0;
    const budget = Number(reqs.budgetMax) || 0;
    if (price <= budget) {
      score += 25;
    } else if (price <= budget * 1.15) {
      // Award partial score if within 15% above budget
      score += 10;
    }
  } else {
    score += 25;
  }

  return score;
}

// GET /api/real-estate/matching - Retrieve matched properties list for a Lead
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'Missing required query parameter leadId.' }, { status: 400 });
    }

    let leadRequirements = {
      type: 'Apartment',
      budgetMax: 10000000,
      location: '',
      beds: 2
    };

    let properties = [];

    if (supabase) {
      // 1. Fetch the Lead to extract custom requirements
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (leadError) {
        console.error('Fetch lead failed:', leadError);
        throw leadError;
      }

      if (leadData) {
        const cData = leadData.custom_data || {};
        if (cData.real_estate_requirements) {
          leadRequirements = cData.real_estate_requirements;
        }
      }

      // 2. Fetch all properties for the tenant
      let queryBuilder = supabase.from('real_estate_properties').select('*');
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }
      const { data: propsData, error: propsError } = await queryBuilder;

      if (propsError) {
        console.error('Fetch properties for matching failed:', propsError);
        throw propsError;
      }

      properties = (propsData || []).map(mapPropertyToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const mongoLead = await Lead.findById(leadId);
      if (mongoLead) {
        const cData = mongoLead.customData || {};
        const reqs = cData.get ? cData.get('real_estate_requirements') : cData.real_estate_requirements;
        if (reqs) {
          leadRequirements = reqs;
        }
      }

      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }
      const mongoProps = await Property.find(filter);
      properties = mongoProps.map(p => ({
        id: p._id,
        _id: p._id,
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
        customData: p.customData
      }));
    }

    // 3. Run matching algorithm and score each property listing
    const recommendations = properties
      .map(prop => {
        const score = computeMatchScore(prop, leadRequirements);
        return {
          ...prop,
          matchScore: score
        };
      })
      // Filter out totally unrelated properties (e.g. 0% score) to keep catalog clean
      .filter(p => p.matchScore > 0)
      // Sort descending by match score percentage
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      requirements: leadRequirements,
      recommendations
    });
  } catch (error) {
    console.error('GET matching properties error:', error);
    return NextResponse.json({ error: 'Internal server error during matches generation.' }, { status: 500 });
  }
}

// POST /api/real-estate/matching - Update lead's real estate preferences and return new matches
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
    const { leadId, requirements } = body;

    if (!leadId || !requirements) {
      return NextResponse.json({ error: 'Missing required parameters leadId or requirements.' }, { status: 400 });
    }

    const targetReqs = {
      type: requirements.type || 'Apartment',
      budgetMax: Number(requirements.budgetMax) || 10000000,
      location: requirements.location || '',
      beds: Number(requirements.beds) || 2
    };

    let updatedLead = null;

    if (supabase) {
      // 1. Fetch current lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (leadError) throw leadError;
      if (!leadData) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // 2. Merge and update custom_data JSONB block
      const currentCustomData = leadData.custom_data || {};
      const updatedCustomData = {
        ...currentCustomData,
        real_estate_requirements: targetReqs
      };

      const { data: saveResult, error: saveError } = await supabase
        .from('leads')
        .update({
          custom_data: updatedCustomData,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select('*')
        .single();

      if (saveError) {
        console.error('Save lead requirements error:', saveError);
        throw saveError;
      }

      updatedLead = mapLeadToFrontend(saveResult);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const mongoLead = await Lead.findById(leadId);
      if (!mongoLead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      const cData = mongoLead.customData || {};
      cData.real_estate_requirements = targetReqs;
      mongoLead.customData = cData;
      mongoLead.markModified('customData');
      
      const saveResult = await mongoLead.save();
      updatedLead = mapLeadToFrontend(saveResult);
    }

    // 3. Immediately trigger dynamic re-match and return
    // Fetch all properties for this tenant
    let properties = [];
    if (supabase) {
      let queryBuilder = supabase.from('real_estate_properties').select('*');
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }
      const { data: propsData, error: propsError } = await queryBuilder;
      if (propsError) throw propsError;
      properties = (propsData || []).map(mapPropertyToFrontend);
    } else {
      let filter = {};
      if (decodedUser.orgId) filter.orgId = decodedUser.orgId;
      const mongoProps = await Property.find(filter);
      properties = mongoProps.map(p => ({
        id: p._id,
        _id: p._id,
        title: p.title,
        type: p.type,
        location: p.location,
        price: p.price,
        size: p.size,
        beds: p.beds,
        baths: p.baths,
        status: p.status,
        image: p.image,
        amenities: p.amenities
      }));
    }

    const recommendations = properties
      .map(prop => {
        const score = computeMatchScore(prop, targetReqs);
        return {
          ...prop,
          matchScore: score
        };
      })
      .filter(p => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      message: 'Client requirements updated successfully!',
      requirements: targetReqs,
      recommendations
    });

  } catch (error) {
    console.error('POST matching preferences error:', error);
    return NextResponse.json({ error: 'Internal server error while updating match preferences.' }, { status: 500 });
  }
}
