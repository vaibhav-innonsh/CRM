import connectToDatabase from '@/lib/db';
import PaymentPlan from '@/lib/models/PaymentPlan';
import Property from '@/lib/models/Property';
import Lead from '@/lib/models/Lead';
import { supabase } from '@/lib/supabaseClient';
import { mapPaymentPlanToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/payments - Retrieve tenant-isolated list of active payment plans
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let paymentPlans = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_payment_plans')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price, type, status)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch payment plans error:', error);
        throw error;
      }

      paymentPlans = (data || []).map(mapPaymentPlanToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoPlans = await PaymentPlan.find(filter)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title location price type status')
        .sort({ createdAt: -1 });

      paymentPlans = mongoPlans.map(p => ({
        id: p._id,
        _id: p._id,
        planTitle: p.planTitle,
        totalValuation: p.totalValuation,
        milestones: p.milestones || [],
        leadId: p.leadId ? {
          id: p.leadId._id,
          _id: p.leadId._id,
          firstName: p.leadId.firstName,
          lastName: p.leadId.lastName,
          phone: p.leadId.phone,
          company: p.leadId.company
        } : null,
        propertyId: p.propertyId ? {
          id: p.propertyId._id,
          _id: p.propertyId._id,
          title: p.propertyId.title,
          location: p.propertyId.location,
          price: p.propertyId.price,
          type: p.propertyId.type,
          status: p.propertyId.status
        } : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
    }

    return NextResponse.json({ success: true, paymentPlans });
  } catch (error) {
    console.error('GET payment plans error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching payment plans.' }, { status: 500 });
  }
}

// POST /api/real-estate/payments - Create a new construction-linked payment plan
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
    const { leadId, propertyId, planTitle, milestones } = body;

    if (!leadId || !propertyId || !planTitle || !milestones || !Array.isArray(milestones) || milestones.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters (leadId, propertyId, planTitle, milestones array are required).' }, { status: 400 });
    }

    // Validate milestone percentages sum to 100%
    const totalPercentage = milestones.reduce((sum, m) => sum + Number(m.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json({ error: 'Validation Error: Milestones percentages must sum up to exactly 100%.' }, { status: 400 });
    }

    let newPlan = null;

    if (supabase) {
      // 1. Fetch property details to retrieve pricing/valuation
      const { data: property, error: propError } = await supabase
        .from('real_estate_properties')
        .select('price')
        .eq('id', propertyId)
        .single();

      if (propError || !property) {
        return NextResponse.json({ error: 'Selected property unit not found.' }, { status: 404 });
      }

      // 2. In-memory exact amount calculations for each milestone
      const calculatedMilestones = milestones.map((m, idx) => {
        const pct = Number(m.percentage);
        const amount = Math.round((pct / 100) * property.price * 100) / 100;
        return {
          name: m.name,
          percentage: pct,
          amount: amount,
          status: m.status || 'Pending', // Pending, Pending Alert, Cleared, Future
          cleared_date: m.cleared_date || null,
          due_date: m.dueDate || m.due_date || null
        };
      });

      // 3. Insert payment plan
      const { data, error } = await supabase
        .from('real_estate_payment_plans')
        .insert({
          org_id: decodedUser.orgId,
          lead_id: leadId,
          property_id: propertyId,
          plan_title: planTitle,
          total_valuation: property.price,
          milestones: calculatedMilestones
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json({ error: 'A payment plan already exists for this property unit.' }, { status: 400 });
        }
        console.error('Supabase create payment plan error:', error);
        throw error;
      }

      // Fetch joined data to return cleanly mapped
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_payment_plans')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price, type, status)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        newPlan = mapPaymentPlanToFrontend(joinedData);
      } else {
        newPlan = mapPaymentPlanToFrontend(data);
      }
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const mongoProperty = await Property.findById(propertyId);
      if (!mongoProperty) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }

      const calculatedMilestones = milestones.map((m) => {
        const pct = Number(m.percentage);
        const amount = Math.round((pct / 100) * mongoProperty.price * 100) / 100;
        return {
          name: m.name,
          percentage: pct,
          amount: amount,
          status: m.status || 'Pending',
          cleared_date: m.cleared_date || null,
          due_date: m.dueDate || m.due_date || null
        };
      });

      const createdPlan = await PaymentPlan.create({
        orgId: decodedUser.orgId,
        leadId,
        propertyId,
        planTitle,
        totalValuation: mongoProperty.price,
        milestones: calculatedMilestones
      });

      newPlan = {
        id: createdPlan._id,
        _id: createdPlan._id,
        planTitle: createdPlan.planTitle,
        totalValuation: createdPlan.totalValuation,
        milestones: createdPlan.milestones,
        createdAt: createdPlan.createdAt,
        updatedAt: createdPlan.updatedAt
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Payment plan generated and initialized successfully!',
      paymentPlan: newPlan
    });

  } catch (error) {
    console.error('POST create payment plan error:', error);
    return NextResponse.json({ error: 'Internal server error while creating payment plan.' }, { status: 500 });
  }
}
