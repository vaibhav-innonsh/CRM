import connectToDatabase from '@/lib/db';
import PaymentPlan from '@/lib/models/PaymentPlan';
import Task from '@/lib/models/Task';
import { supabase } from '@/lib/supabaseClient';
import { mapPaymentPlanToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// PUT /api/real-estate/payments/[id] - Update specific milestone status & generate tasks
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { milestoneIndex, action } = body;

    if (milestoneIndex === undefined || milestoneIndex === null || !action) {
      return NextResponse.json({ error: 'Missing required parameters (milestoneIndex, action are required).' }, { status: 400 });
    }

    if (action !== 'clear' && action !== 'alert') {
      return NextResponse.json({ error: 'Invalid action. Must be either "clear" or "alert".' }, { status: 400 });
    }

    let updatedPlan = null;

    if (supabase) {
      // 1. Fetch current payment plan
      const { data: plan, error: fetchError } = await supabase
        .from('real_estate_payment_plans')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price, type, status)')
        .eq('id', id)
        .single();

      if (fetchError || !plan) {
        return NextResponse.json({ error: 'Payment plan not found.' }, { status: 404 });
      }

      // Check organization tenant isolation
      if (decodedUser.orgId && plan.org_id !== decodedUser.orgId) {
        return NextResponse.json({ error: 'Unauthorized access to this tenant plan.' }, { status: 403 });
      }

      const milestones = [...(plan.milestones || [])];
      const idx = Number(milestoneIndex);

      if (idx < 0 || idx >= milestones.length) {
        return NextResponse.json({ error: 'Invalid milestone index.' }, { status: 400 });
      }

      const currentMilestone = { ...milestones[idx] };

      if (action === 'clear') {
        currentMilestone.status = 'Cleared';
        currentMilestone.cleared_date = new Date().toISOString();
      } else if (action === 'alert') {
        currentMilestone.status = 'Pending Alert';
        currentMilestone.due_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

        // Create high-priority follow-up Task inside CRM
        try {
          const leadName = plan.leads ? `${plan.leads.first_name} ${plan.leads.last_name || ''}`.trim() : 'Client';
          const propertyTitle = plan.real_estate_properties ? plan.real_estate_properties.title : 'Property';
          const milestoneName = currentMilestone.name;
          const formattedAmt = Number(currentMilestone.amount || 0).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });

          await supabase.from('tasks').insert({
            org_id: decodedUser.orgId,
            subject: `Payment Demand Note: ${milestoneName} - ${propertyTitle}`,
            due_date: currentMilestone.due_date,
            priority: 'High',
            status: 'Pending',
            notes: `Dispatch and follow up on Payment Demand Note for milestone "${milestoneName}" of amount ${formattedAmt}. Customer: ${leadName}. Property Unit: ${propertyTitle}.`,
            assigned_to: decodedUser.id,
            lead_id: plan.lead_id
          });
        } catch (taskErr) {
          console.error('Failed to auto-create demand note task:', taskErr);
        }
      }

      milestones[idx] = currentMilestone;

      // 2. Save updated milestones back
      const { data: savedData, error: updateError } = await supabase
        .from('real_estate_payment_plans')
        .update({
          milestones,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title, location, price, type, status)')
        .single();

      if (updateError) {
        console.error('Supabase update milestones error:', updateError);
        throw updateError;
      }

      updatedPlan = mapPaymentPlanToFrontend(savedData);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const plan = await PaymentPlan.findById(id).populate('leadId').populate('propertyId');

      if (!plan) {
        return NextResponse.json({ error: 'Payment plan not found.' }, { status: 404 });
      }

      if (decodedUser.orgId && plan.orgId.toString() !== decodedUser.orgId) {
        return NextResponse.json({ error: 'Unauthorized access to this tenant plan.' }, { status: 403 });
      }

      const milestones = [...(plan.milestones || [])];
      const idx = Number(milestoneIndex);

      if (idx < 0 || idx >= milestones.length) {
        return NextResponse.json({ error: 'Invalid milestone index.' }, { status: 400 });
      }

      const currentMilestone = { ...milestones[idx] };

      if (action === 'clear') {
        currentMilestone.status = 'Cleared';
        currentMilestone.cleared_date = new Date();
      } else if (action === 'alert') {
        currentMilestone.status = 'Pending Alert';
        currentMilestone.due_date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        try {
          const leadName = plan.leadId ? `${plan.leadId.firstName} ${plan.leadId.lastName || ''}`.trim() : 'Client';
          const propertyTitle = plan.propertyId ? plan.propertyId.title : 'Property';
          const milestoneName = currentMilestone.name;
          const formattedAmt = Number(currentMilestone.amount || 0).toLocaleString('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          });

          await Task.create({
            orgId: decodedUser.orgId,
            subject: `Payment Demand Note: ${milestoneName} - ${propertyTitle}`,
            dueDate: currentMilestone.due_date,
            priority: 'High',
            status: 'Pending',
            notes: `Dispatch and follow up on Payment Demand Note for milestone "${milestoneName}" of amount ${formattedAmt}. Customer: ${leadName}. Property Unit: ${propertyTitle}.`,
            assignedTo: decodedUser.id,
            leadId: plan.leadId._id
          });
        } catch (taskErr) {
          console.error('Failed to mongo auto-create task:', taskErr);
        }
      }

      milestones[idx] = currentMilestone;
      plan.milestones = milestones;
      plan.markModified('milestones');
      await plan.save();

      updatedPlan = {
        id: plan._id,
        _id: plan._id,
        planTitle: plan.planTitle,
        totalValuation: plan.totalValuation,
        milestones: plan.milestones,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      };
    }

    return NextResponse.json({
      success: true,
      message: action === 'clear' ? 'Milestone payment cleared successfully!' : 'Demand note generated and CRM follow-up task logged!',
      paymentPlan: updatedPlan
    });

  } catch (error) {
    console.error('PUT payment plan error:', error);
    return NextResponse.json({ error: 'Internal server error while updating payment plan.' }, { status: 500 });
  }
}
